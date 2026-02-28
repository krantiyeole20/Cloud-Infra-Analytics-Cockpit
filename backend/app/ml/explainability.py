# backend/app/ml/explainability.py
# SHAP explainability and ROC curve data.
# HLD.md Section 5.5.
#
# SHAP TreeExplainer is run on:
#   1. XGBoost efficiency model (native tree support)
#   2. LightGBM completion model (native tree support)
# Both are natively supported — no proxy model needed.

import logging
from typing import Optional

import numpy as np
import pandas as pd
import shap
from sklearn.metrics import roc_auc_score, roc_curve

from app.config import SHAP_PRECOMPUTE_N
from app.ml.efficiency import EFFICIENCY_FEATURES
from app.ml.completion import COMPLETION_FEATURES

logger = logging.getLogger(__name__)


def compute_shap_for_vm(
    vm_record: pd.DataFrame,
    efficiency_artifact: dict,
) -> dict:
    """
    Compute SHAP feature attributions for a single VM record using the
    XGBoost energy efficiency model.

    Args:
        vm_record:          Single-row DataFrame (or small batch). Must
                            contain the raw feature columns (before encoding).
        efficiency_artifact: Dict returned by ml.efficiency.train_efficiency_model.

    Returns:
        dict matching HLD.md Section 6 /anomalies/{vm_id}/shap response:
            base_value  — model's expected output on training data
            final_value — base_value + sum of SHAP impacts
            features    — list of {name, value, shap_impact} sorted by |impact| desc

    Raises:
        Exception: Logged and re-raised on SHAP computation failure.
    """
    try:
        model = efficiency_artifact["model"]
        encoders: dict = efficiency_artifact["encoders"]

        df = vm_record.copy()
        for col, le in encoders.items():
            df[f"{col}_enc"] = le.transform(df[col].astype(str))

        X = df[EFFICIENCY_FEATURES].fillna(0).astype("float32")

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        base_value = float(explainer.expected_value)

        # Use first row if batch
        row_shap = shap_values[0] if shap_values.ndim > 1 else shap_values
        row_X = X.iloc[0]

        features = []
        for i, fname in enumerate(EFFICIENCY_FEATURES):
            features.append({
                "name": fname,
                "value": float(row_X[fname]) if fname in row_X.index else 0.0,
                "shap_impact": float(row_shap[i]),
            })
        # Sort by absolute SHAP impact descending
        features.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)

        final_value = base_value + sum(f["shap_impact"] for f in features)

        logger.info(
            f"SHAP computed — base={base_value:.4f}, final={final_value:.4f}"
        )
        return {
            "base_value": round(base_value, 4),
            "final_value": round(final_value, 4),
            "features": features,
        }

    except Exception as e:
        logger.error(f"compute_shap_for_vm failed: {e}")
        raise


def compute_roc_data(completion_artifact: dict) -> dict:
    """
    Compute ROC curve data from the LightGBM completion model's
    held-out validation set.

    Args:
        completion_artifact: Dict returned by ml.completion.train_completion_model.
                             Must include 'val_df' with feature columns and 'target'.

    Returns:
        dict matching HLD.md Section 6 /anomalies/roc response:
            fpr   — list of false positive rates
            tpr   — list of true positive rates
            auc   — area under the ROC curve
            model — model name string
    """
    try:
        val_df: pd.DataFrame = completion_artifact["val_df"]
        model = completion_artifact["model"]
        features = completion_artifact["features"]

        X_val = val_df[features].fillna(0).astype("float32")
        y_val = val_df["target"].values

        y_score = model.predict_proba(X_val)[:, 1]
        fpr, tpr, _ = roc_curve(y_val, y_score)
        auc = float(roc_auc_score(y_val, y_score))

        logger.info(f"ROC curve computed — AUC={auc:.4f}")
        return {
            "fpr": [round(float(v), 4) for v in fpr],
            "tpr": [round(float(v), 4) for v in tpr],
            "auc": round(auc, 4),
            "model": "completion_predictor",
        }

    except Exception as e:
        logger.error(f"compute_roc_data failed: {e}")
        raise


async def precompute_shap_for_top_anomalies(
    anomaly_df: pd.DataFrame,
    efficiency_artifact: dict,
    cache_set_fn,
) -> None:
    """
    Precompute SHAP values for the top SHAP_PRECOMPUTE_N most anomalous VMs
    and store them in Redis under shap:vm:{vm_id}.

    Called at refresh time after models are retrained.

    Args:
        anomaly_df:          DataFrame of anomalous rows with vm_id column.
        efficiency_artifact: Efficiency model artifact.
        cache_set_fn:        Async callable (vm_id, shap_data) → None.
                             Typically cache.set_shap.
    """
    if efficiency_artifact is None:
        logger.warning("precompute_shap_for_top_anomalies: no efficiency model available")
        return

    top_rows = anomaly_df.head(SHAP_PRECOMPUTE_N)
    succeeded = 0

    for _, row in top_rows.iterrows():
        vm_id = row.get("vm_id", "unknown")
        try:
            shap_data = compute_shap_for_vm(
                pd.DataFrame([row]), efficiency_artifact
            )
            shap_data["vm_id"] = str(vm_id)
            await cache_set_fn(str(vm_id), shap_data)
            succeeded += 1
        except Exception as e:
            logger.error(f"SHAP precompute failed for vm_id={vm_id}: {e}")

    logger.info(
        f"SHAP precomputed for {succeeded}/{len(top_rows)} anomalous VMs"
    )
