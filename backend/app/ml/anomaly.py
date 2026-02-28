# backend/app/ml/anomaly.py
# Anomaly detection — two types per HLD.md Section 5.3:
#   Type A: Behavioral anomaly — IsolationForest per task_type cohort
#   Type B: Energy waste anomaly — rule-based (is_wasting_energy flag)
#
# Phase 0 decision: anomaly_ui = both_types (fleet-alert mode)
#   Fleet waste rate = 8.3% > 5% → waste shown as fleet-level alert banner.
#   Behavioral anomalies shown in per-row scatter panel.

import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Optional

from app.config import (
    ANOMALY_THRESHOLD,
    ISOLATION_FOREST_CONTAMINATION,
    ISOLATION_FOREST_N_ESTIMATORS,
)
from app.database import query

logger = logging.getLogger(__name__)

ANOMALY_FEATURES = [
    "cpu_usage",
    "memory_usage",
    "network_traffic",
    "power_consumption",
    "num_executed_instructions",
    "execution_time",
    "energy_efficiency",
    "compute_value",
]

# Log which anomaly_ui mode is active (Phase 0 decision)
logger.info(
    "anomaly_ui=both_types (fleet-alert mode) — "
    "waste rate 8.3% > 5% threshold — "
    "waste shown as fleet banner, behavioral shown as per-row scatter"
)


def train_anomaly_models(df: pd.DataFrame) -> dict:
    """
    Train a separate IsolationForest for each task_type cohort.

    Each cohort (io, network, compute) gets its own model fitted on
    ANOMALY_FEATURES. Anomaly detection is relative to peers — a compute
    VM at 95% CPU is normal; an io VM at 95% CPU is anomalous.

    Args:
        df: Processed telemetry DataFrame (post-pipeline).

    Returns:
        dict mapping task_type → {"model": IsolationForest, "scaler": StandardScaler}

    Raises:
        Exception: Logged and re-raised on training failure.
    """
    try:
        models: dict = {}
        for task_type in df["task_type"].unique():
            cohort = df[df["task_type"] == task_type][ANOMALY_FEATURES].fillna(0)

            if len(cohort) < 10:
                logger.warning(
                    f"Cohort '{task_type}' has only {len(cohort)} rows — skipping anomaly model"
                )
                continue

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(cohort.values)

            model = IsolationForest(
                n_estimators=ISOLATION_FOREST_N_ESTIMATORS,
                contamination=ISOLATION_FOREST_CONTAMINATION,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(X_scaled)
            models[task_type] = {"model": model, "scaler": scaler}
            logger.info(
                f"IsolationForest trained — task_type={task_type}, n={len(cohort)}"
            )

        return models
    except Exception as e:
        logger.error(f"train_anomaly_models failed: {e}")
        raise


def score_rows(df: pd.DataFrame, models: dict) -> pd.DataFrame:
    """
    Score DataFrame rows with cohort-specific IsolationForest models.

    Appends two columns:
        behavioral_anomaly_score — normalized 0–1 (higher = more anomalous)
        is_behavioral_anomaly   — bool (True if score > ANOMALY_THRESHOLD)

    Args:
        df:     DataFrame to score. Must contain ANOMALY_FEATURES + task_type.
        models: Dict returned by train_anomaly_models.

    Returns:
        df with behavioral_anomaly_score and is_behavioral_anomaly appended.
    """
    try:
        results: list[pd.DataFrame] = []

        for task_type, artifact in models.items():
            cohort = df[df["task_type"] == task_type].copy()
            if cohort.empty:
                continue

            X = cohort[ANOMALY_FEATURES].fillna(0).values
            X_scaled = artifact["scaler"].transform(X)
            raw_scores = artifact["model"].score_samples(X_scaled)

            # Normalize to [0, 1]: IsolationForest score_samples returns
            # negative values — more negative = more anomalous.
            # Invert so that 1 = maximally anomalous.
            score_range = raw_scores.max() - raw_scores.min()
            if score_range > 0:
                normalized = 1.0 - (raw_scores - raw_scores.min()) / score_range
            else:
                normalized = np.zeros(len(raw_scores))

            cohort["behavioral_anomaly_score"] = normalized.astype("float32")
            cohort["is_behavioral_anomaly"] = (
                cohort["behavioral_anomaly_score"] > ANOMALY_THRESHOLD
            )
            results.append(cohort)

        if not results:
            logger.warning("score_rows: no cohort results produced")
            df["behavioral_anomaly_score"] = 0.0
            df["is_behavioral_anomaly"] = False
            return df

        return pd.concat(results, ignore_index=True)
    except Exception as e:
        logger.error(f"score_rows failed: {e}")
        raise


def get_behavioral_anomalies(
    models: dict,
    task_type: Optional[str] = None,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Query DuckDB for the top behavioral anomaly candidates and score them.

    Samples from each cohort, scores with the IsolationForest model, and
    returns the top anomalous rows sorted by behavioral_anomaly_score.

    Args:
        models:    Dict from train_anomaly_models.
        task_type: Optional cohort filter.
        limit:     Number of anomalous rows to return.

    Returns:
        pd.DataFrame of anomalous rows with scores appended.
    """
    try:
        where = f"WHERE task_type = '{task_type}'" if task_type else ""
        sql = f"""
            SELECT
                vm_id, timestamp, task_type, task_priority, task_status,
                {', '.join(ANOMALY_FEATURES)},
                compute_value
            FROM telemetry
            {where}
            USING SAMPLE 200000
        """
        sample_df = query(sql)
        scored_df = score_rows(sample_df, models)

        result = (
            scored_df[scored_df["is_behavioral_anomaly"] == True]
            .sort_values("behavioral_anomaly_score", ascending=False)
            .head(limit)
        )
        logger.info(
            f"get_behavioral_anomalies — {len(result)} anomalies found "
            f"(task_type={task_type!r})"
        )
        return result
    except Exception as e:
        logger.error(
            f"get_behavioral_anomalies failed (task_type={task_type!r}): {e}"
        )
        raise


def get_waste_anomalies(
    task_type: Optional[str] = None,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Return top energy-wasting rows from DuckDB.

    Energy waste is already computed as a column (is_wasting_energy=1)
    by the pipeline. This function just queries and aggregates.

    Phase 0: anomaly_ui=fleet-alert mode → this data feeds the fleet banner.

    Args:
        task_type: Optional cohort filter.
        limit:     Rows to return.

    Returns:
        pd.DataFrame with vm_id, task_type, task_priority, waste_stats.
    """
    try:
        where = f"AND task_type = '{task_type}'" if task_type else ""
        sql = f"""
            SELECT
                vm_id,
                task_type,
                task_priority,
                power_consumption,
                energy_efficiency,
                compute_value,
                timestamp
            FROM telemetry
            WHERE is_wasting_energy = 1
            {where}
            ORDER BY power_consumption DESC
            LIMIT {int(limit)}
        """
        result = query(sql)
        logger.info(
            f"get_waste_anomalies — {len(result)} waste rows "
            f"(task_type={task_type!r})"
        )
        return result
    except Exception as e:
        logger.error(f"get_waste_anomalies failed: {e}")
        raise
