# backend/app/routers/performance.py
# GET /performance/timeseries and /performance/surface3d
# HLD.md Section 6.

import logging
from typing import Optional
from fastapi import APIRouter, Query, Request
from app import cache, database
from app.config import TTL_WORKLOAD

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/timeseries")
async def get_performance_timeseries(
    request: Request,
    task_type: Optional[str] = Query(None, description="Filter by task_type: io, network, compute"),
    metric: str = Query("energy_efficiency", description="Metric column to aggregate"),
    bucket: str = Query("hour", description="Time bucket: hour, day, week"),
):
    """
    Hourly/daily/weekly aggregations of a metric per task_type.

    Used by the MetricTimeSeries chart. Filterable by task_type.

    Response shape:
        metric, bucket, task_type (or null),
        series: list of {timestamp, value, record_count}
    """
    SAFE_METRICS = {
        "energy_efficiency", "cpu_usage", "memory_usage", "network_traffic",
        "power_consumption", "compute_value", "throughput",
    }
    SAFE_BUCKETS = {"hour", "day", "week"}

    if metric not in SAFE_METRICS:
        return {"error": f"metric must be one of {SAFE_METRICS}"}, 400
    if bucket not in SAFE_BUCKETS:
        return {"error": f"bucket must be one of {SAFE_BUCKETS}"}, 400

    cache_key = f"perf:ts:{task_type or 'all'}:{metric}:{bucket}"
    try:
        cached = await cache.get(cache_key)
        if cached:
            return cached
    except Exception:
        pass

    try:
        where = f"AND task_type = '{task_type}'" if task_type else ""
        group_by_ts = f"DATE_TRUNC('{bucket}', CAST(timestamp AS TIMESTAMP))"
        sql = f"""
            SELECT
                {group_by_ts}                         AS bucket_ts,
                ROUND(AVG({metric}), 4)               AS value,
                COUNT(*)                              AS record_count
            FROM telemetry
            WHERE {metric} IS NOT NULL {where}
            GROUP BY bucket_ts
            ORDER BY bucket_ts
        """
        df = database.query(sql)
        series = [
            {
                "timestamp": str(row["bucket_ts"]),
                "value": float(row["value"]),
                "record_count": int(row["record_count"]),
            }
            for _, row in df.iterrows()
        ]
        result = {
            "metric": metric,
            "bucket": bucket,
            "task_type": task_type,
            "series": series,
        }
        await cache.set(cache_key, result, TTL_WORKLOAD)
        return result

    except Exception as e:
        logger.error(f"GET /performance/timeseries failed: {e}")
        return {"error": "Time-series query failed", "detail": str(e)}, 500


@router.get("/surface3d")
async def get_efficiency_surface3d(
    request: Request,
    bucket: str = Query("day", description="Time bucket for x-axis: hour or day"),
):
    """
    3D surface data: task_type (z) × time bucket (x) × energy_efficiency (y).

    Used by the EfficiencySurface3D Plotly chart.

    Response shape:
        task_types — list of task_type labels
        surfaces — list of {task_type, x (timestamps), y (efficiency values)}
    """
    SAFE_BUCKETS = {"hour", "day"}
    if bucket not in SAFE_BUCKETS:
        return {"error": "bucket must be 'hour' or 'day'"}, 400

    cache_key = f"perf:surface3d:{bucket}"
    try:
        cached = await cache.get(cache_key)
        if cached:
            return cached
    except Exception:
        pass

    try:
        group_by_ts = f"DATE_TRUNC('{bucket}', CAST(timestamp AS TIMESTAMP))"
        sql = f"""
            SELECT
                task_type,
                {group_by_ts}                         AS bucket_ts,
                ROUND(AVG(energy_efficiency), 4)      AS avg_efficiency
            FROM telemetry
            WHERE energy_efficiency IS NOT NULL
            GROUP BY task_type, bucket_ts
            ORDER BY task_type, bucket_ts
        """
        df = database.query(sql)
        task_types = sorted(df["task_type"].unique().tolist())

        surfaces = []
        for tt in task_types:
            subset = df[df["task_type"] == tt].sort_values("bucket_ts")
            surfaces.append({
                "task_type": tt,
                "x": [str(v) for v in subset["bucket_ts"].tolist()],
                "y": [float(v) for v in subset["avg_efficiency"].tolist()],
            })

        result = {"task_types": task_types, "surfaces": surfaces, "bucket": bucket}
        await cache.set(cache_key, result, TTL_WORKLOAD)
        return result

    except Exception as e:
        logger.error(f"GET /performance/surface3d failed: {e}")
        return {"error": "Surface3D query failed", "detail": str(e)}, 500
