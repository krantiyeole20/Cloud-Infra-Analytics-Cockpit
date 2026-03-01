# backend/app/pipeline.py
# Data pipeline for the Cloud VM Intelligence Cockpit.
#
# Two startup paths:
#
#   1. SQL-native (default, free-tier compatible)
#      init_db_from_csv() → apply_pipeline_sql()
#      DuckDB reads CSV directly; full pandas DataFrame never created.
#      Peak memory: ~200–350 MB → fits Render/Railway free tier (512 MB).
#
#   2. Pandas (legacy fallback, requires 2 GB RAM)
#      load_csv() → run_pipeline() → init_db()
#      Kept for local development or if the SQL path encounters an issue.
#
# Phase 0 decisions:
#   null_strategy = global_median  (null rate ~10%, uniform across cohorts)
#   waste_threshold = 375.14       (p75 of waiting-state power_consumption)

import pandas as pd
import numpy as np
import logging
from datetime import timezone

from app.config import NULLABLE_COLS, WASTE_POWER_THRESHOLD

logger = logging.getLogger(__name__)


def apply_pipeline_sql() -> None:
    """
    Apply null imputation and derived metrics entirely in DuckDB SQL.

    Memory-efficient path — the full 2M-row DataFrame never exists in pandas.
    Operates directly on the 'telemetry' table created by init_db_from_csv().

    Steps:
        1. Log null rates per nullable column.
        2. Compute global medians via SQL MEDIAN() aggregate.
        3. Rebuild 'telemetry' with COALESCE (null fill) + derived columns
           (throughput, compute_value, is_wasting_energy) in a single pass.
           Uses a CREATE/DROP/RENAME cycle so both copies never coexist long.

    Raises:
        Exception: Logged and re-raised on failure.
    """
    from app.database import get_connection

    conn = get_connection()
    try:
        # ── 1. Log null rates ────────────────────────────────────────────────
        null_sql = "SELECT " + ", ".join(
            f"ROUND(COUNT(*) FILTER (WHERE {col} IS NULL)::DOUBLE "
            f"/ COUNT(*) * 100, 4) AS {col}_pct"
            for col in NULLABLE_COLS
        ) + " FROM telemetry"
        null_df = conn.execute(null_sql).fetchdf()
        logger.info(f"Null rates per column (%):\n{null_df.T.to_string()}")

        # ── 2. Compute global medians ────────────────────────────────────────
        median_sql = "SELECT " + ", ".join(
            f"MEDIAN({col}) AS {col}" for col in NULLABLE_COLS
        ) + " FROM telemetry"
        meds = conn.execute(median_sql).fetchone()
        med = dict(zip(NULLABLE_COLS, meds))
        logger.info(
            f"Global medians (null_strategy=global_median): "
            + ", ".join(f"{k}={v:.4f}" for k, v in med.items())
        )

        # ── 3. Rebuild table with COALESCE + derived metrics ─────────────────
        # execution_time: also replace 0 → median to avoid divide-by-zero
        et = med["execution_time"]
        nei = med["num_executed_instructions"]
        pwr = med["power_consumption"]

        rebuild_sql = f"""
            CREATE TABLE telemetry_clean AS
            SELECT
                vm_id,
                timestamp,
                COALESCE(cpu_usage,                  {med['cpu_usage']})::FLOAT  AS cpu_usage,
                COALESCE(memory_usage,               {med['memory_usage']})::FLOAT AS memory_usage,
                COALESCE(network_traffic,            {med['network_traffic']})::FLOAT AS network_traffic,
                COALESCE(power_consumption,          {pwr})::FLOAT AS power_consumption,
                COALESCE(num_executed_instructions,  {nei})::FLOAT AS num_executed_instructions,
                COALESCE(NULLIF(execution_time, 0),  {et})::FLOAT  AS execution_time,
                energy_efficiency::FLOAT                                           AS energy_efficiency,
                task_type,
                task_priority,
                task_status,
                (COALESCE(num_executed_instructions, {nei})
                    / COALESCE(NULLIF(execution_time, 0), {et})
                )::FLOAT AS throughput,
                (COALESCE(num_executed_instructions, {nei})
                    / COALESCE(NULLIF(execution_time, 0), {et})
                    * COALESCE(energy_efficiency, 0)
                )::FLOAT AS compute_value,
                CASE
                    WHEN task_status = 'waiting'
                     AND COALESCE(power_consumption, {pwr}) > {WASTE_POWER_THRESHOLD}
                    THEN 1 ELSE 0
                END::INTEGER AS is_wasting_energy
            FROM telemetry
        """
        conn.execute(rebuild_sql)
        conn.execute("DROP TABLE telemetry")
        conn.execute("ALTER TABLE telemetry_clean RENAME TO telemetry")

        waste_rate = conn.execute(
            "SELECT AVG(is_wasting_energy) FROM telemetry"
        ).fetchone()[0]
        row_count = conn.execute("SELECT COUNT(*) FROM telemetry").fetchone()[0]
        logger.info(
            f"Pipeline (SQL) complete — {row_count} rows, "
            f"waste_threshold={WASTE_POWER_THRESHOLD:.2f}, "
            f"fleet_waste_rate={waste_rate:.4%}"
        )
    except Exception as e:
        logger.error(f"apply_pipeline_sql failed: {e}")
        raise


def run_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full preprocessing pipeline applied to the raw seed DataFrame.

    Steps:
        1. _handle_nulls    — global median imputation for all nullable cols
        2. _add_derived_metrics — throughput, compute_value, is_wasting_energy
        3. _downcast_dtypes — float64 → float32 to reduce memory footprint

    Returns:
        pd.DataFrame: Processed DataFrame ready for DuckDB registration.

    Raises:
        Exception: Logged and re-raised on any pipeline failure.
    """
    try:
        rows_before = len(df)
        logger.info(f"Pipeline starting — {rows_before} rows")
        df = _handle_nulls(df)
        df = _add_derived_metrics(df)
        df = _downcast_dtypes(df)
        mem_mb = df.memory_usage(deep=True).sum() / 1_000_000
        logger.info(
            f"Pipeline complete — {len(df)} rows, {mem_mb:.1f} MB in-memory"
        )
        return df
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise


def _handle_nulls(df: pd.DataFrame) -> pd.DataFrame:
    """
    Global median imputation for all nullable numeric columns.

    Phase 0 decision: null_strategy = global_median.
    Rationale: null rates ~10% across all columns; variation across
    task_type cohorts is negligible (≤0.1pp). Per-cohort imputation
    adds no statistical benefit and doubles the cost.

    Args:
        df: Raw DataFrame from pd.read_csv.

    Returns:
        pd.DataFrame with nulls filled in NULLABLE_COLS.
    """
    try:
        null_rates = df[NULLABLE_COLS].isnull().sum() / len(df) * 100
        logger.info(f"Null rates per column (%):\n{null_rates.round(4).to_string()}")

        medians = df[NULLABLE_COLS].median()
        logger.info(f"Global medians used for imputation:\n{medians.round(4).to_string()}")

        df[NULLABLE_COLS] = df[NULLABLE_COLS].fillna(medians)
        null_remaining = df[NULLABLE_COLS].isnull().sum().sum()
        logger.info(
            f"Null handling complete — strategy: global_median — "
            f"remaining nulls: {null_remaining}"
        )
        return df
    except Exception as e:
        logger.error(f"_handle_nulls failed: {e}")
        raise


def _add_derived_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute and append derived columns:
        - throughput         = num_executed_instructions / execution_time
        - compute_value      = throughput × energy_efficiency
        - is_wasting_energy  = 1 where task_status == 'waiting' AND
                               power_consumption > WASTE_POWER_THRESHOLD

    Thresholds come from config — no hardcoding.

    Args:
        df: DataFrame after null handling.

    Returns:
        pd.DataFrame with three new columns appended.
    """
    try:
        # throughput: null-safe divide — zero execution_time → NaN (not inf)
        safe_exec_time = df["execution_time"].replace(0.0, float("nan"))
        df["throughput"] = df["num_executed_instructions"] / safe_exec_time

        # compute_value: null where throughput is null
        df["compute_value"] = df["throughput"] * df["energy_efficiency"]

        # is_wasting_energy: integer flag (0/1) for SQL SUM compatibility
        df["is_wasting_energy"] = (
            (df["task_status"] == "waiting")
            & (df["power_consumption"] > WASTE_POWER_THRESHOLD)
        ).astype("int8")

        waste_rate = df["is_wasting_energy"].mean()
        logger.info(
            f"Derived metrics computed — "
            f"waste_threshold={WASTE_POWER_THRESHOLD:.2f}, "
            f"fleet_waste_rate={waste_rate:.4%}"
        )
        return df
    except Exception as e:
        logger.error(f"_add_derived_metrics failed: {e}")
        raise


def _downcast_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Downcast float64 → float32 to reduce in-memory footprint.

    Phase 0 analysis: raw 2M rows ≈ 500–800MB after pandas loading.
    float32 halves the per-column cost. Railway Starter (2GB) is required.

    Args:
        df: DataFrame after derived metric computation.

    Returns:
        pd.DataFrame with all float64 columns converted to float32.
    """
    try:
        float_cols = df.select_dtypes(include="float64").columns
        for col in float_cols:
            df[col] = df[col].astype("float32")
        mem_mb = df.memory_usage(deep=True).sum() / 1_000_000
        logger.info(
            f"Dtype downcast complete — {len(float_cols)} cols converted "
            f"float64→float32 — estimated footprint: {mem_mb:.1f} MB "
            f"(Railway Starter 2GB required)"
        )
        return df
    except Exception as e:
        logger.error(f"_downcast_dtypes failed: {e}")
        raise


def load_csv(csv_path: str) -> pd.DataFrame:
    """
    Load the raw telemetry CSV from disk.

    Separated from init_db so the pipeline can run on the DataFrame
    before DuckDB sees it.

    Args:
        csv_path: Path to telemetry.csv (relative to backend/ or absolute).

    Returns:
        pd.DataFrame: Raw DataFrame with all original dtypes.

    Raises:
        Exception: Logged and re-raised on IO error.
    """
    try:
        df = pd.read_csv(csv_path, parse_dates=["timestamp"])
        logger.info(f"CSV loaded — {len(df)} rows from '{csv_path}'")
        return df
    except Exception as e:
        logger.error(f"load_csv failed for path='{csv_path}': {e}")
        raise
