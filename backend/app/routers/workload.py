# backend/app/routers/workload.py
# GET /workload/heatmap — task_type × resource metric heatmap data.
# HLD.md Section 6.

import logging
from fastapi import APIRouter, Request
from app import cache, database
from app.config import TTL_WORKLOAD

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/heatmap")
async def get_workload_heatmap(request: Request):
    """
    Return a matrix of average resource metrics per task_type × task_priority.

    Used by the WorkloadHeatmap chart. Cached 30s.

    Response shape:
        rows     — list of task_type labels
        cols     — list of metric names
        matrix   — list of lists (rows × cols) of average values
        meta     — {task_type: {task_priority: record_count}}
    """
    CACHE_KEY = "workload:heatmap"
    try:
        cached = await cache.get(CACHE_KEY)
        if cached:
            return cached
    except Exception as e:
        logger.error(f"Redis GET failed for workload:heatmap: {e}")

    try:
        sql = """
            SELECT
                task_type,
                task_priority,
                ROUND(AVG(cpu_usage), 2)              AS avg_cpu,
                ROUND(AVG(memory_usage), 2)           AS avg_memory,
                ROUND(AVG(network_traffic), 2)        AS avg_network,
                ROUND(AVG(power_consumption), 2)      AS avg_power,
                ROUND(AVG(energy_efficiency), 4)      AS avg_efficiency,
                ROUND(AVG(compute_value), 4)          AS avg_compute_value,
                ROUND(AVG(throughput), 2)             AS avg_throughput,
                COUNT(*)                              AS record_count
            FROM telemetry
            GROUP BY task_type, task_priority
            ORDER BY task_type, task_priority
        """
        df = database.query(sql)

        METRIC_COLS = [
            "avg_cpu", "avg_memory", "avg_network", "avg_power",
            "avg_efficiency", "avg_compute_value", "avg_throughput",
        ]
        task_types = sorted(df["task_type"].unique().tolist())
        task_priorities = sorted(df["task_priority"].unique().tolist())

        # Build row-per-task_type matrix summed across priorities (simple mean),
        # plus a breakdown metadata dict
        matrix: list[list[float]] = []
        meta: dict = {}
        for tt in task_types:
            subset = df[df["task_type"] == tt]
            row_vals = subset[METRIC_COLS].mean().round(4).tolist()
            matrix.append(row_vals)
            meta[tt] = {
                row["task_priority"]: int(row["record_count"])
                for _, row in subset.iterrows()
            }

        result = {
            "rows": task_types,
            "cols": METRIC_COLS,
            "matrix": matrix,
            "meta": meta,
        }
        await cache.set(CACHE_KEY, result, TTL_WORKLOAD)
        return result

    except Exception as e:
        logger.error(f"GET /workload/heatmap failed: {e}")
        return {"error": "Workload heatmap failed", "detail": str(e)}, 500


@router.get("/distribution")
async def get_workload_distribution(request: Request):
    """
    Return task_type and task_priority distribution counts.
    Used for sidebar summary and pie/donut charts.
    """
    try:
        sql = """
            SELECT
                task_type,
                task_priority,
                task_status,
                COUNT(*) AS count,
                ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
            FROM telemetry
            GROUP BY task_type, task_priority, task_status
            ORDER BY task_type, task_priority, task_status
        """
        df = database.query(sql)
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"GET /workload/distribution failed: {e}")
        return {"error": "Workload distribution failed", "detail": str(e)}, 500
