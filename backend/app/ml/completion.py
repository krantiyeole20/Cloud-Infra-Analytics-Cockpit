# backend/app/ml/completion.py
# LightGBM task completion predictor.
# HLD.md Section 5.4.
#
# Binary classifier predicting whether a task will complete (1)
# or get stuck in waiting state (0). Trained on historical records
# where task_status is known (completed or waiting) — excludes running rows.

import logging
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import LabelEncoder

from app.config import (
    LIGHTGBM_LEARNING_RATE,
    LIGHTGBM_N_ESTIMATORS,
)

logger = logging.getLogger(__name__)

COMPLETION_FEATURES = [
    "cpu_usage",
    "memory_usage",
    "network_traffic",
    "power_consumption",
    "execution_time",
    "task_type_enc",
    "task_priority_enc",
]

_CATEGORICAL_COLS = ["task_type", "task_priority"]


def train_completion_model(df: pd.DataFrame) -> dict:
    """
    Train a LightGBM binary classifier to predict task completion.

    Training set: rows where task_status is 'completed' or 'waiting'.
    Running tasks are excluded (unknown outcome).
    Target: completed=1, waiting=0.

    Args:
        df: Processed telemetry DataFrame (post-pipeline). Should contain
            task_status, task_type, task_priority, and all feature columns.

    Returns:
        dict with keys:
            model     — trained LGBMClassifier
            encoders  — dict of LabelEncoder per categorical column
            auc       — validation ROC-AUC (float)
            features  — COMPLETION_FEATURES list
            val_df    — held-out validation DataFrame (for ROC curve computation)

    Raises:
        Exception: Logged and re-raised on training failure.
    """
    try:
        # Exclude running rows — outcome unknown
        train_df = df[df["task_status"].isin(["completed", "waiting"])].copy()

        if len(train_df) < 100:
            raise ValueError(
                f"Insufficient training rows after status filter: {len(train_df)}"
            )

        # Label-encode categoricals
        encoders: dict = {}
        for col in _CATEGORICAL_COLS:
            le = LabelEncoder()
            train_df[f"{col}_enc"] = le.fit_transform(train_df[col].astype(str))
            encoders[col] = le

        train_df["target"] = (train_df["task_status"] == "completed").astype(int)

        X = train_df[COMPLETION_FEATURES].fillna(0).astype("float32")
        y = train_df["target"]

        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.10, random_state=42, stratify=y
        )

        model = lgb.LGBMClassifier(
            n_estimators=LIGHTGBM_N_ESTIMATORS,
            learning_rate=LIGHTGBM_LEARNING_RATE,
            random_state=42,
            verbose=-1,
            n_jobs=-1,
        )
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[lgb.early_stopping(20, verbose=False), lgb.log_evaluation(-1)],
        )

        y_pred_proba = model.predict_proba(X_val)[:, 1]
        auc = float(roc_auc_score(y_val, y_pred_proba))
        logger.info(
            f"Completion model trained — "
            f"n_train={len(X_train)}, val_AUC={auc:.4f}"
        )

        # Attach val labels to X_val for ROC curve computation downstream
        val_df = X_val.copy()
        val_df["target"] = y_val.values

        return {
            "model": model,
            "encoders": encoders,
            "auc": auc,
            "features": COMPLETION_FEATURES,
            "val_df": val_df,
        }

    except Exception as e:
        logger.error(f"train_completion_model failed: {e}")
        raise


def predict_completion(
    df: pd.DataFrame, artifact: dict
) -> pd.DataFrame:
    """
    Apply the completion model to new rows.

    Args:
        df:       DataFrame to score.
        artifact: Dict returned by train_completion_model.

    Returns:
        df with 'completion_probability' column (float 0–1) appended.
    """
    try:
        df = df.copy()
        encoders: dict = artifact["encoders"]
        for col, le in encoders.items():
            # Handle unseen labels safely with fallback to 0
            df[f"{col}_enc"] = df[col].astype(str).apply(
                lambda x: le.transform([x])[0] if x in le.classes_ else 0
            )
        X = df[artifact["features"]].fillna(0).astype("float32")
        df["completion_probability"] = artifact["model"].predict_proba(X)[:, 1].astype("float32")
        return df
    except Exception as e:
        logger.error(f"predict_completion failed: {e}")
        raise
