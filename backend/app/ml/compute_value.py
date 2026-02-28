# backend/app/ml/compute_value.py
# Compute value scorer — purely DuckDB aggregation, no model training.
# HLD.md Section 5.2.
#
# IMPORTANT: vm_id is near-unique in this dataset (1.8M unique VMs across
# 2M rows). Per-vm_id aggregation returns n≈1 per group and is not useful.
# This module aggregates by (task_type, task_priority) cohort instead,
# which is the meaningful grouping dimension for this dataset.
# See PROGRESS.md "Known Issues" for the Phase 0 analysis basis.

import logging
import pandas as pd
from typing import Optional

from app.database import query

logger = logging.getLogger(__name__)


def get_top_cohorts_by_compute_value(limit: int = 20) -> pd.DataFrame:
    """
    Return the top cohorts by average compute_value, ranked descending.

    Aggregation: (task_type, task_priority) cohort.

    Args:
        limit: Maximum rows to return.

    Returns:
        pd.DataFrame with columns:
            task_type, task_priority, avg_compute_value, avg_efficiency,
            avg_throughput, avg_power, total_waste_events, record_count

    Raises:
        Exception: Logged and re-raised on DuckDB failure.
    """
    try:
        sql = f"""
            SELECT
                task_type,
                task_priority,
                ROUND(AVG(compute_value), 4)              AS avg_compute_value,
                ROUND(AVG(energy_efficiency), 4)          AS avg_efficiency,
                ROUND(AVG(throughput), 2)                 AS avg_throughput,
                ROUND(AVG(power_consumption), 2)          AS avg_power,
                SUM(CAST(is_wasting_energy AS INTEGER))   AS total_waste_events,
                COUNT(*)                                  AS record_count
            FROM telemetry
            WHERE compute_value IS NOT NULL
            GROUP BY task_type, task_priority
            ORDER BY avg_compute_value DESC
            LIMIT {int(limit)}
        """
        result = query(sql)
        logger.info(
            f"get_top_cohorts_by_compute_value — returned {len(result)} rows"
        )
        return result
    except Exception as e:
        logger.error(f"get_top_cohorts_by_compute_value failed: {e}")
        raise


def get_bottom_cohorts_by_compute_value(limit: int = 20) -> pd.DataFrame:
    """
    Return the bottom cohorts by average compute_value, ranked ascending.

    Args:
        limit: Maximum rows to return.

    Returns:
        Same schema as get_top_cohorts_by_compute_value.
    """
    try:
        sql = f"""
            SELECT
                task_type,
                task_priority,
                ROUND(AVG(compute_value), 4)              AS avg_compute_value,
                ROUND(AVG(energy_efficiency), 4)          AS avg_efficiency,
                ROUND(AVG(throughput), 2)                 AS avg_throughput,
                ROUND(AVG(power_consumption), 2)          AS avg_power,
                SUM(CAST(is_wasting_energy AS INTEGER))   AS total_waste_events,
                COUNT(*)                                  AS record_count
            FROM telemetry
            WHERE compute_value IS NOT NULL
            GROUP BY task_type, task_priority
            ORDER BY avg_compute_value ASC
            LIMIT {int(limit)}
        """
        result = query(sql)
        logger.info(
            f"get_bottom_cohorts_by_compute_value — returned {len(result)} rows"
        )
        return result
    except Exception as e:
        logger.error(f"get_bottom_cohorts_by_compute_value failed: {e}")
        raise


def get_cohort_summary(task_type: Optional[str] = None) -> pd.DataFrame:
    """
    Return a full summary of compute value and efficiency by cohort.
    Optionally filter to a single task_type.

    Args:
        task_type: Optional filter ('io', 'network', or 'compute').

    Returns:
        pd.DataFrame with cohort-level aggregations.
    """
    try:
        where = f"WHERE task_type = '{task_type}'" if task_type else ""
        sql = f"""
            SELECT
                task_type,
                task_priority,
                task_status,
                ROUND(AVG(compute_value), 4)              AS avg_compute_value,
                ROUND(AVG(energy_efficiency), 4)          AS avg_efficiency,
                ROUND(AVG(throughput), 2)                 AS avg_throughput,
                ROUND(AVG(power_consumption), 2)          AS avg_power,
                ROUND(AVG(cpu_usage), 2)                  AS avg_cpu,
                ROUND(AVG(memory_usage), 2)               AS avg_memory,
                SUM(CAST(is_wasting_energy AS INTEGER))   AS total_waste_events,
                ROUND(
                    100.0 * SUM(CAST(is_wasting_energy AS INTEGER)) / COUNT(*),
                    2
                )                                         AS waste_pct,
                COUNT(*)                                  AS record_count
            FROM telemetry
            {where}
            GROUP BY task_type, task_priority, task_status
            ORDER BY task_type, task_priority, task_status
        """
        result = query(sql)
        logger.info(
            f"get_cohort_summary(task_type={task_type!r}) — "
            f"returned {len(result)} rows"
        )
        return result
    except Exception as e:
        logger.error(
            f"get_cohort_summary failed for task_type={task_type!r}: {e}"
        )
        raise


def get_fleet_waste_stats() -> dict:
    """
    Return fleet-wide energy waste statistics.
    Used by the KPIs router and the top bar alert system.

    Returns:
        dict with vms_wasting_energy, total_records, waste_pct, fleet_power_kw
    """
    try:
        sql = """
            SELECT
                SUM(CAST(is_wasting_energy AS INTEGER))   AS vms_wasting_energy,
                COUNT(*)                                  AS total_records,
                ROUND(
                    100.0 * SUM(CAST(is_wasting_energy AS INTEGER)) / COUNT(*),
                    2
                )                                         AS waste_pct,
                ROUND(SUM(power_consumption) / 1000.0, 2) AS fleet_power_kw
            FROM telemetry
        """
        row = query(sql).iloc[0]
        return {
            "vms_wasting_energy": int(row["vms_wasting_energy"]),
            "total_records": int(row["total_records"]),
            "waste_pct": float(row["waste_pct"]),
            "fleet_power_kw": float(row["fleet_power_kw"]),
        }
    except Exception as e:
        logger.error(f"get_fleet_waste_stats failed: {e}")
        raise
