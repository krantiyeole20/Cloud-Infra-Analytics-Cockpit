# backend/app/routers/performance.py
import logging
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from app import cache, database
from app.config import TTL_WORKLOAD

logger = logging.getLogger(__name__)
router = APIRouter()

SAFE_METRICS = {
    "energy_efficiency", "cpu_usage", "memory_usage", "network_traffic",
    "power_consumption", "compute_value", "throughput",
}
SAFE_BUCKETS_TS = {"hour", "day", "week"}
SAFE_BUCKETS_3D = {"hour", "day"}


@router.get("/timeseries")
async def get_performance_timeseries(
    request: Request,
    task_type: Optional[str] = Query(None),
    metric: str = Query("energy_efficiency"),
    bucket: str = Query("day"),
):
    if metric not in SAFE_METRICS:
        return JSONResponse({"error": f"metric must be one of {sorted(SAFE_METRICS)}"}, status_code=400)
    if bucket not in SAFE_BUCKETS_TS:
        return JSONResponse({"error": f"bucket must be one of {sorted(SAFE_BUCKETS_TS)}"}, status_code=400)

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
                "value": float(row["value"]) if row["value"] is not None else 0.0,
                "record_count": int(row["record_count"]),
            }
            for _, row in df.iterrows()
        ]
        result = {"metric": metric, "bucket": bucket, "task_type": task_type, "series": series}
        await cache.set(cache_key, result, TTL_WORKLOAD)
        return result

    except Exception as e:
        logger.error(f"GET /performance/timeseries failed: {e}")
        return JSONResponse({"error": "Time-series query failed", "detail": str(e)}, status_code=500)


@router.get("/surface3d")
async def get_efficiency_surface3d(
    request: Request,
    bucket: str = Query("day"),
):
    if bucket not in SAFE_BUCKETS_3D:
        return JSONResponse({"error": "bucket must be 'hour' or 'day'"}, status_code=400)

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
            WHERE energy_efficiency IS NOT NULL AND task_type IS NOT NULL
            GROUP BY task_type, bucket_ts
            ORDER BY task_type, bucket_ts
        """
        df = database.query(sql)
        df = df.dropna(subset=["task_type"])
        task_types = sorted([t for t in df["task_type"].unique().tolist() if t is not None])

        surfaces = []
        for tt in task_types:
            subset = df[df["task_type"] == tt].sort_values("bucket_ts")
            surfaces.append({
                "task_type": tt,
                "x": [str(v) for v in subset["bucket_ts"].tolist()],
                "y": [float(v) if v is not None else 0.0 for v in subset["avg_efficiency"].tolist()],
            })

        result = {"task_types": task_types, "surfaces": surfaces, "bucket": bucket}
        await cache.set(cache_key, result, TTL_WORKLOAD)
        return result

    except Exception as e:
        logger.error(f"GET /performance/surface3d failed: {e}")
        return JSONResponse({"error": "Surface3D query failed", "detail": str(e)}, status_code=500)
