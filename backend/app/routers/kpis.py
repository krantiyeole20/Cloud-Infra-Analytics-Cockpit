# backend/app/routers/kpis.py
# GET /kpis — fleet-wide KPI aggregations.
# HLD.md Section 6.

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from app import cache, database
from app.config import TTL_KPI

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_kpis(request: Request):
    """
    Fleet-wide KPI summary for the top bar and sidebar KPI cards.

    Returns cached result from Redis (TTL 30s). On miss, aggregates from DuckDB.

    Response shape (HLD.md Section 6 /kpis):
        avg_energy_efficiency, avg_compute_value, vms_wasting_energy,
        vms_wasting_energy_pct, behavioral_anomalies, fleet_power_kw,
        total_vm_records, last_updated
    """
    CACHE_KEY = "kpis:fleet"
    try:
        cached = await cache.get(CACHE_KEY)
        if cached:
            logger.debug("KPIs served from cache")
            return cached
    except Exception as e:
        logger.error(f"Redis GET failed for kpis:fleet: {e}")

    try:
        sql = """
            SELECT
                ROUND(AVG(energy_efficiency), 4)                          AS avg_energy_efficiency,
                ROUND(AVG(compute_value), 4)                              AS avg_compute_value,
                SUM(CAST(is_wasting_energy AS INTEGER))                   AS vms_wasting_energy,
                ROUND(
                    100.0 * SUM(CAST(is_wasting_energy AS INTEGER)) / COUNT(*),
                    2
                )                                                         AS vms_wasting_energy_pct,
                ROUND(SUM(power_consumption) / 1000.0, 2)                 AS fleet_power_kw,
                COUNT(*)                                                  AS total_vm_records
            FROM telemetry
        """
        row = database.query(sql).iloc[0]

        # Behavioral anomalies: check if model ran and anomaly scores exist
        behavioral_anomalies = 0
        try:
            anom_sql = """
                SELECT COUNT(*) AS n
                FROM telemetry
                WHERE behavioral_anomaly_score > 0.7
            """
            behavioral_anomalies = int(database.query(anom_sql).iloc[0]["n"])
        except Exception:
            # behavioral_anomaly_score column only exists after scoring — graceful default
            pass

        result = {
            "avg_energy_efficiency": float(row["avg_energy_efficiency"]),
            "avg_compute_value": float(row["avg_compute_value"]) if row["avg_compute_value"] else 0.0,
            "vms_wasting_energy": int(row["vms_wasting_energy"]),
            "vms_wasting_energy_pct": float(row["vms_wasting_energy_pct"]),
            "behavioral_anomalies": behavioral_anomalies,
            "fleet_power_kw": float(row["fleet_power_kw"]),
            "total_vm_records": int(row["total_vm_records"]),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

        await cache.set(CACHE_KEY, result, TTL_KPI)
        return result

    except Exception as e:
        logger.error(f"GET /kpis failed: {e}")
        return {"error": "KPI aggregation failed", "detail": str(e)}, 500
