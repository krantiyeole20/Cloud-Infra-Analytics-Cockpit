# backend/app/cache.py
# Redis cache layer for the Cloud VM Intelligence Cockpit.
# HLD.md Section 4.4.
#
# All Redis operations are wrapped in try/except — failures are logged
# and the caller receives None (cache miss), never a crash. This ensures
# the application degrades gracefully when Redis is unavailable.
#
# Cache key registry (from HLD.md Section 4.4):
#   kpis:fleet              — fleet KPI aggregations             TTL: 30s
#   workload:heatmap        — task_type × metric matrix          TTL: 30s
#   anomalies:behavioral    — top behavioral anomalies per cohort TTL: 60s
#   anomalies:waste         — energy waste flagged VMs           TTL: 60s
#   shap:vm:{vm_id}         — SHAP values for a specific VM      TTL: 60s
#   model:efficiency        — XGBoost efficiency model artifact  TTL: model
#   model:anomaly:{task_type} — IsolationForest per cohort       TTL: model
#   model:completion        — LightGBM completion model          TTL: model
#   forecast:24h            — 24-hour power forecast             TTL: 60s
#   forecast:7day           — 7-day power forecast               TTL: 60s
#
# Invalidation patterns on POST /refresh:
#   kpis:*, workload:*, anomalies:*, forecast:*

import pickle
import logging
from typing import Any, Optional

import redis.asyncio as redis

from app.config import (
    REDIS_URL,
    TTL_KPI,
    TTL_WORKLOAD,
    TTL_ANOMALY,
    TTL_SHAP,
    TTL_FORECAST,
    TTL_MODEL,
)

logger = logging.getLogger(__name__)
_client: Optional[redis.Redis] = None


def get_client() -> redis.Redis:
    """
    Return (or lazily create) the async Redis client singleton.

    Returns:
        redis.Redis async client.
    """
    global _client
    if _client is None:
        _client = redis.from_url(
            REDIS_URL, encoding="utf-8", decode_responses=False
        )
    return _client


async def get(key: str) -> Optional[Any]:
    """
    Fetch a value from Redis by key. Returns None on miss or error.

    Args:
        key: Cache key string.

    Returns:
        Deserialized Python object, or None if the key does not exist
        or Redis is unavailable.
    """
    try:
        raw = await get_client().get(key)
        if raw is None:
            return None
        return pickle.loads(raw)
    except Exception as e:
        logger.error(f"Redis GET failed key={key}: {e}")
        return None


async def set(key: str, value: Any, ttl: int) -> None:
    """
    Store a value in Redis with a TTL in seconds. Silently drops on error.

    Args:
        key:   Cache key string.
        value: Python object to serialize via pickle.
        ttl:   Expiry in seconds (use TTL_* constants from config).
    """
    try:
        await get_client().setex(key, ttl, pickle.dumps(value))
    except Exception as e:
        logger.error(f"Redis SET failed key={key}: {e}")


async def invalidate_pattern(pattern: str) -> None:
    """
    Delete all Redis keys matching a glob pattern.

    Args:
        pattern: Glob pattern, e.g. "kpis:*", "anomalies:*".
    """
    try:
        client = get_client()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} Redis keys matching '{pattern}'")
        else:
            logger.debug(f"No keys matched pattern '{pattern}'")
    except Exception as e:
        logger.error(f"Redis invalidation failed pattern={pattern}: {e}")


async def invalidate_all_data_keys() -> None:
    """
    Invalidate all hot-data keys on POST /refresh.
    Does NOT invalidate model keys (those are immediately overwritten
    with fresh artifacts and do not need deletion).
    """
    patterns = ["kpis:*", "workload:*", "anomalies:*", "forecast:*"]
    for pattern in patterns:
        await invalidate_pattern(pattern)


async def warm_cache() -> None:
    """
    Verify Redis connectivity at startup. Does not pre-populate keys —
    keys are populated lazily on first request and eagerly on refresh.

    Logs an error (but does not raise) if Redis is unreachable, so the
    application starts and serves requests from DuckDB without caching.
    """
    try:
        ok = await get_client().ping()
        if ok:
            logger.info("Redis connection verified — cache warm")
        else:
            logger.warning("Redis PING returned False — caching degraded")
    except Exception as e:
        logger.error(
            f"Redis unavailable at startup: {e} — "
            "application will run without caching (performance degraded)"
        )


# ---------------------------------------------------------------------------
# Typed cache helpers for common keys
# ---------------------------------------------------------------------------

async def get_model(model_name: str) -> Optional[Any]:
    """Fetch a model artifact. model_name e.g. 'efficiency', 'completion'."""
    return await get(f"model:{model_name}")


async def set_model(model_name: str, artifact: Any) -> None:
    """Store a model artifact without expiry (TTL_MODEL)."""
    await set(f"model:{model_name}", artifact, TTL_MODEL)


async def get_cohort_model(model_type: str, task_type: str) -> Optional[Any]:
    """Fetch a per-cohort model artifact (e.g. IsolationForest for 'io')."""
    return await get(f"model:{model_type}:{task_type}")


async def set_cohort_model(model_type: str, task_type: str, artifact: Any) -> None:
    """Store a per-cohort model artifact (TTL_MODEL)."""
    await set(f"model:{model_type}:{task_type}", artifact, TTL_MODEL)


async def get_shap(vm_id: str) -> Optional[dict]:
    """Fetch precomputed SHAP values for a specific VM."""
    return await get(f"shap:vm:{vm_id}")


async def set_shap(vm_id: str, shap_data: dict) -> None:
    """Store SHAP values for a specific VM (TTL_SHAP)."""
    await set(f"shap:vm:{vm_id}", shap_data, TTL_SHAP)
