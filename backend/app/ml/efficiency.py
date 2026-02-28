# backend/app/ml/efficiency.py
# XGBoost energy efficiency predictor.
# HLD.md Section 5.1.
#
# Predicts energy_efficiency (0–1) per VM record from resource utilization
# and task metadata features. SHAP on this model explains which factors
# drive high vs low efficiency per VM.

import logging
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor

from app.config import (
    XGBOOST_LEARNING_RATE,
    XGBOOST_N_ESTIMATORS,
)

logger = logging.getLogger(__name__)

EFFICIENCY_FEATURES = [
    "cpu_usage",
    "memory_usage",
    "network_traffic",
    "power_consumption",
    "num_executed_instructions",
    "execution_time",
    "task_type_enc",
    "task_priority_enc",
    "task_status_enc",
]

_CATEGORICAL_COLS = ["task_type", "task_priority", "task_status"]


def _encode_categoricals(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Label-encode all categorical feature columns.

    Returns:
        (df_with_enc_cols, encoders_dict)
    """
    df = df.copy()
    encoders: dict = {}
    for col in _CATEGORICAL_COLS:
        le = LabelEncoder()
        df[f"{col}_enc"] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    return df, encoders


def train_efficiency_model(df: pd.DataFrame) -> dict:
    """
    Train an XGBoost Regressor to predict energy_efficiency.

    Uses tree_method='hist' for fast training on large DataFrames.
    Evaluates on a held-out 10% validation split.

    Args:
        df: Processed telemetry DataFrame (post-pipeline).

    Returns:
        dict with keys:
            model     — trained XGBRegressor
            encoders  — dict of LabelEncoder per categorical column
            mae       — validation MAE (float)
            features  — EFFICIENCY_FEATURES list (for SHAP compatibility)

    Raises:
        Exception: Logged and re-raised on training failure.
    """
    try:
        df, encoders = _encode_categoricals(df)

        X = df[EFFICIENCY_FEATURES].fillna(0).astype("float32")
        y = df["energy_efficiency"].fillna(df["energy_efficiency"].median()).astype("float32")

        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.10, random_state=42
        )

        model = XGBRegressor(
            n_estimators=XGBOOST_N_ESTIMATORS,
            learning_rate=XGBOOST_LEARNING_RATE,
            tree_method="hist",     # fast on large datasets
            device="cpu",
            random_state=42,
            verbosity=0,
        )
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        preds = model.predict(X_val)
        mae = float(np.mean(np.abs(preds - y_val.values)))
        logger.info(
            f"Efficiency model trained — "
            f"n_train={len(X_train)}, val_MAE={mae:.4f}"
        )

        return {
            "model": model,
            "encoders": encoders,
            "mae": mae,
            "features": EFFICIENCY_FEATURES,
        }

    except Exception as e:
        logger.error(f"train_efficiency_model failed: {e}")
        raise


def predict_efficiency(
    df: pd.DataFrame, artifact: dict
) -> pd.DataFrame:
    """
    Apply the trained efficiency model to new rows.

    Args:
        df:       DataFrame of rows to score (must contain raw feature columns).
        artifact: Dict returned by train_efficiency_model.

    Returns:
        df with 'predicted_efficiency' column appended.
    """
    try:
        df = df.copy()
        encoders: dict = artifact["encoders"]
        for col, le in encoders.items():
            df[f"{col}_enc"] = le.transform(df[col].astype(str))

        X = df[artifact["features"]].fillna(0).astype("float32")
        df["predicted_efficiency"] = artifact["model"].predict(X).astype("float32")
        return df
    except Exception as e:
        logger.error(f"predict_efficiency failed: {e}")
        raise
