# backend/app/routers/anomalies.py
import logging
import math
from typing import Optional
from fastapi import APIRouter, Path, Query, Request
from fastapi.responses import JSONResponse
from app import cache, database
from app.config import TTL_ANOMALY, TTL_SHAP, WASTE_FLEET_PCT_ALERT

logger = logging.getLogger(__name__)
router = APIRouter()


def _sanitize(v):
    """Replace NaN/inf float values with None for JSON safety."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _sanitize_records(records: list[dict]) -> list[dict]:
    return [{k: _sanitize(val) for k, val in row.items()} for row in records]


@router.get("")
async def get_anomalies(
    request: Request,
    task_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    cache_key = f"anomalies:behavioral:{task_type or 'all'}:{limit}"
    try:
        cached = await cache.get(cache_key)
        if cached:
            return cached
    except Exception:
        pass

    try:
        anomaly_models = getattr(request.app.state, "anomaly_models", None)

        # ── Behavioral anomalies ────────────────────────────────────────────
        behavioral_rows = []
        if anomaly_models:
            from app.ml.anomaly import get_behavioral_anomalies
            try:
                df = get_behavioral_anomalies(anomaly_models, task_type=task_type, limit=limit)
                cols = [
                    "vm_id", "task_type", "task_priority", "task_status",
                    "behavioral_anomaly_score", "energy_efficiency",
                    "cpu_usage", "memory_usage", "power_consumption",
                ]
                # Only include cols that exist in the result
                cols = [c for c in cols if c in df.columns]
                raw = df[cols].to_dict(orient="records")
                behavioral_rows = _sanitize_records(raw)
            except Exception as e:
                logger.error(f"Behavioral anomaly scoring failed: {e}")

        # ── Fleet waste stats ────────────────────────────────────────────────
        try:
            from app.ml.anomaly import get_waste_anomalies
            waste_sql = """
                SELECT
                    SUM(CAST(is_wasting_energy AS INTEGER)) AS vms_wasting,
                    COUNT(*) AS total,
                    ROUND(100.0 * SUM(CAST(is_wasting_energy AS INTEGER)) / COUNT(*), 2) AS waste_pct
                FROM telemetry
            """
            waste_row = database.query(waste_sql).iloc[0]
            waste_pct = float(waste_row["waste_pct"] or 0)
            fleet_alert = {
                "active": waste_pct > (WASTE_FLEET_PCT_ALERT * 100),
                "waste_pct": waste_pct,
                "vms_wasting_energy": int(waste_row["vms_wasting"] or 0),
                "threshold_pct": WASTE_FLEET_PCT_ALERT * 100,
                "alert_mode": "fleet_banner",
            }
            waste_samples_df = get_waste_anomalies(task_type=task_type, limit=20)
            waste_list = _sanitize_records(waste_samples_df.to_dict(orient="records"))
        except Exception as e:
            logger.error(f"Waste anomaly query failed: {e}")
            fleet_alert = {"active": False, "error": str(e)}
            waste_list = []

        result = {
            "behavioral": behavioral_rows,
            "fleet_alert": fleet_alert,
            "waste_samples": waste_list,
        }
        await cache.set(cache_key, result, TTL_ANOMALY)
        return result

    except Exception as e:
        logger.error(f"GET /anomalies failed: {e}")
        return JSONResponse({"error": "Anomaly query failed", "detail": str(e)}, status_code=500)


@router.get("/roc")
async def get_roc_curve(request: Request):
    CACHE_KEY = "anomalies:roc"
    try:
        cached = await cache.get(CACHE_KEY)
        if cached:
            return cached
    except Exception:
        pass

    try:
        completion_artifact = getattr(request.app.state, "completion_model", None)
        if completion_artifact is None:
            return JSONResponse({"error": "Completion model not yet trained"}, status_code=503)

        from app.ml.explainability import compute_roc_data
        result = compute_roc_data(completion_artifact)
        await cache.set(CACHE_KEY, result, TTL_ANOMALY)
        return result

    except Exception as e:
        logger.error(f"GET /anomalies/roc failed: {e}")
        return JSONResponse({"error": "ROC computation failed", "detail": str(e)}, status_code=500)


@router.get("/{vm_id}/shap")
async def get_shap_for_vm(
    request: Request,
    vm_id: str = Path(..., description="VM UUID to compute SHAP for"),
):
    try:
        cached = await cache.get_shap(vm_id)
        if cached:
            return cached
    except Exception as e:
        logger.error(f"Redis SHAP GET failed for vm_id={vm_id}: {e}")

    try:
        efficiency_artifact = getattr(request.app.state, "efficiency_model", None)
        if efficiency_artifact is None:
            return JSONResponse({"error": "Efficiency model not yet trained"}, status_code=503)

        sql = "SELECT * FROM telemetry WHERE vm_id = ? LIMIT 1"
        vm_df = database.query(sql, params=[vm_id])
        if vm_df.empty:
            return JSONResponse({"error": f"vm_id '{vm_id}' not found"}, status_code=404)

        from app.ml.explainability import compute_shap_for_vm
        shap_data = compute_shap_for_vm(vm_df, efficiency_artifact)
        shap_data["vm_id"] = vm_id

        # Sanitize SHAP values (can produce NaN on edge cases)
        shap_data["features"] = [
            {**f, "shap_impact": _sanitize(f["shap_impact"]) or 0.0,
                   "value": _sanitize(f["value"]) or 0.0}
            for f in shap_data["features"]
        ]
        await cache.set_shap(vm_id, shap_data)
        return shap_data

    except Exception as e:
        logger.error(f"GET /anomalies/{vm_id}/shap failed: {e}")
        return JSONResponse({"error": "SHAP computation failed", "detail": str(e)}, status_code=500)
