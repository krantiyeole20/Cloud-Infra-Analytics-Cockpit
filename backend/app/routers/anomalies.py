# backend/app/routers/anomalies.py
# GET /anomalies — behavioral + waste anomalies.
# GET /anomalies/{vm_id}/shap — SHAP waterfall for a specific VM.
# GET /anomalies/roc — ROC curve for completion predictor.
# HLD.md Section 6.
#
# Phase 0 anomaly_ui decision: fleet-alert mode (waste rate 8.3% > 5%).
# Waste anomalies → fleet-level alert banner (returned as fleet_alert field).
# Behavioral anomalies → per-row scatter panel.

import logging
from typing import Optional
from fastapi import APIRouter, Path, Query, Request
from app import cache, database
from app.config import TTL_ANOMALY, TTL_SHAP, WASTE_FLEET_PCT_ALERT

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_anomalies(
    request: Request,
    task_type: Optional[str] = Query(None, description="Filter by task_type"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Return behavioral anomalies + energy waste summary.

    Behavioral anomalies come from IsolationForest per-cohort scoring.
    Waste anomalies are aggregated fleet stats (fleet-alert mode).

    Response shape (HLD.md Section 6 /anomalies):
        behavioral     — list of anomalous rows with scores
        fleet_alert    — {active, waste_pct, vms_wasting_energy, threshold_pct}
        waste_samples  — list of top energy-waste rows
    """
    cache_key = f"anomalies:behavioral:{task_type or 'all'}:{limit}"
    try:
        cached = await cache.get(cache_key)
        if cached:
            return cached
    except Exception:
        pass

    try:
        anomaly_models = getattr(request.app.state, "anomaly_models", None)

        # ── Behavioral anomalies ─────────────────────────────────────────────
        behavioral_rows = []
        if anomaly_models:
            from app.ml.anomaly import get_behavioral_anomalies
            try:
                df = get_behavioral_anomalies(
                    anomaly_models, task_type=task_type, limit=limit
                )
                behavioral_rows = df[[
                    "vm_id", "task_type", "task_priority", "task_status",
                    "behavioral_anomaly_score", "energy_efficiency",
                    "cpu_usage", "memory_usage", "power_consumption",
                ]].to_dict(orient="records")
            except Exception as e:
                logger.error(f"Behavioral anomaly scoring failed: {e}")

        # ── Fleet waste stats (fleet-alert mode) ────────────────────────────
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
            waste_pct = float(waste_row["waste_pct"])
            fleet_alert = {
                "active": waste_pct > (WASTE_FLEET_PCT_ALERT * 100),
                "waste_pct": waste_pct,
                "vms_wasting_energy": int(waste_row["vms_wasting"]),
                "threshold_pct": WASTE_FLEET_PCT_ALERT * 100,
                "alert_mode": "fleet_banner",  # Phase 0 decision
            }
            waste_samples = get_waste_anomalies(task_type=task_type, limit=20)
            waste_list = waste_samples.to_dict(orient="records")
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
        return {"error": "Anomaly query failed", "detail": str(e)}, 500


@router.get("/roc")
async def get_roc_curve(request: Request):
    """
    Return ROC curve data for the task completion predictor.

    Uses the held-out validation set from train_completion_model.
    Cached 60s.
    """
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
            return {"error": "Completion model not yet trained"}, 503

        from app.ml.explainability import compute_roc_data
        result = compute_roc_data(completion_artifact)
        await cache.set(CACHE_KEY, result, TTL_ANOMALY)
        return result

    except Exception as e:
        logger.error(f"GET /anomalies/roc failed: {e}")
        return {"error": "ROC computation failed", "detail": str(e)}, 500


@router.get("/{vm_id}/shap")
async def get_shap_for_vm(
    request: Request,
    vm_id: str = Path(..., description="VM UUID to compute SHAP for"),
):
    """
    Return SHAP feature attributions for a specific VM record.

    Checks Redis first (precomputed for top anomalies at refresh time).
    Falls back to on-demand computation from the efficiency model.
    Cached 60s.

    Response shape (HLD.md Section 6 /anomalies/{vm_id}/shap):
        vm_id, base_value, final_value, features[{name, value, shap_impact}]
    """
    try:
        # 1. Precomputed SHAP from Redis
        cached = await cache.get_shap(vm_id)
        if cached:
            logger.debug(f"SHAP cache hit for vm_id={vm_id}")
            return cached
    except Exception as e:
        logger.error(f"Redis SHAP GET failed for vm_id={vm_id}: {e}")

    # 2. On-demand computation
    try:
        efficiency_artifact = getattr(request.app.state, "efficiency_model", None)
        if efficiency_artifact is None:
            return {"error": "Efficiency model not yet trained"}, 503

        # Fetch VM record from DuckDB
        sql = """
            SELECT *
            FROM telemetry
            WHERE vm_id = ?
            LIMIT 1
        """
        import pandas as pd
        vm_df = database.query(sql, params=[vm_id])
        if vm_df.empty:
            return {"error": f"vm_id '{vm_id}' not found"}, 404

        from app.ml.explainability import compute_shap_for_vm
        shap_data = compute_shap_for_vm(vm_df, efficiency_artifact)
        shap_data["vm_id"] = vm_id

        # Store for future requests
        await cache.set_shap(vm_id, shap_data)
        return shap_data

    except Exception as e:
        logger.error(f"GET /anomalies/{vm_id}/shap failed: {e}")
        return {"error": "SHAP computation failed", "detail": str(e)}, 500
