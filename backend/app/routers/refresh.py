# backend/app/routers/refresh.py
# POST /refresh — synthetic generation, model retraining, cache invalidation.
# HLD.md Section 6.

import logging
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Request

from app import cache, database
from app.config import BATCH_SIZE

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def trigger_refresh(request: Request):
    """
    Trigger the full refresh pipeline:
    1. Generate synthetic rows via per-cohort generator
    2. Append to DuckDB
    3. Retrain all ML models
    4. Precompute SHAP for top anomalies
    5. Store new model artifacts in Redis
    6. Invalidate all data cache keys

    Response shape (HLD.md Section 6 POST /refresh):
        rows_added, models_retrained, cache_invalidated, timestamp
    """
    t_total = time.perf_counter()
    models_retrained: list[str] = []

    try:
        # ── 1. Generate and append synthetic rows ────────────────────────────
        t0 = time.perf_counter()
        generator = getattr(request.app.state, "synthetic_generator", None)
        if generator is None:
            logger.error("Synthetic generator not initialized")
            return {"error": "Synthetic generator unavailable"}, 503

        synthetic_df = generator(BATCH_SIZE)
        database.append_rows(synthetic_df)
        logger.info(
            f"[refresh] Synthetic rows appended: {len(synthetic_df)} "
            f"({time.perf_counter() - t0:.2f}s)"
        )

        # ── 2. Sample seed data for retraining ──────────────────────────────
        seed_df = database.query("SELECT * FROM telemetry USING SAMPLE 100000")

        # ── 3. Retrain efficiency model ──────────────────────────────────────
        try:
            t0 = time.perf_counter()
            from app.ml.efficiency import train_efficiency_model
            artifact = train_efficiency_model(seed_df)
            request.app.state.efficiency_model = artifact
            await cache.set_model("efficiency", artifact)
            models_retrained.append("efficiency")
            logger.info(f"[refresh] Efficiency model retrained ({time.perf_counter() - t0:.2f}s)")
        except Exception as e:
            logger.error(f"[refresh] Efficiency model retraining failed: {e}")

        # ── 4. Retrain anomaly models ────────────────────────────────────────
        try:
            t0 = time.perf_counter()
            from app.ml.anomaly import train_anomaly_models, get_behavioral_anomalies
            anomaly_models = train_anomaly_models(seed_df)
            request.app.state.anomaly_models = anomaly_models
            for task_type, artifact in anomaly_models.items():
                await cache.set_cohort_model("anomaly", task_type, artifact)
                models_retrained.append(f"anomaly_{task_type}")
            logger.info(f"[refresh] Anomaly models retrained ({time.perf_counter() - t0:.2f}s)")
        except Exception as e:
            logger.error(f"[refresh] Anomaly model retraining failed: {e}")
            anomaly_models = None

        # ── 5. Retrain completion model ──────────────────────────────────────
        try:
            t0 = time.perf_counter()
            from app.ml.completion import train_completion_model
            completion_artifact = train_completion_model(seed_df)
            request.app.state.completion_model = completion_artifact
            await cache.set_model("completion", completion_artifact)
            models_retrained.append("completion")
            logger.info(f"[refresh] Completion model retrained ({time.perf_counter() - t0:.2f}s)")
        except Exception as e:
            logger.error(f"[refresh] Completion model retraining failed: {e}")

        # ── 6. Precompute SHAP for top anomalies ────────────────────────────
        try:
            t0 = time.perf_counter()
            if anomaly_models and request.app.state.efficiency_model:
                from app.ml.explainability import precompute_shap_for_top_anomalies
                top_anomalies = get_behavioral_anomalies(anomaly_models, limit=20)
                await precompute_shap_for_top_anomalies(
                    top_anomalies,
                    request.app.state.efficiency_model,
                    cache.set_shap,
                )
                logger.info(f"[refresh] SHAP precomputed ({time.perf_counter() - t0:.2f}s)")
        except Exception as e:
            logger.error(f"[refresh] SHAP precomputation failed: {e}")

        # ── 7. Invalidate data cache keys ────────────────────────────────────
        await cache.invalidate_all_data_keys()

        elapsed = round(time.perf_counter() - t_total, 2)
        logger.info(
            f"[refresh] Complete — rows_added={len(synthetic_df)}, "
            f"models_retrained={models_retrained}, elapsed={elapsed}s"
        )

        return {
            "rows_added": len(synthetic_df),
            "models_retrained": models_retrained,
            "cache_invalidated": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "elapsed_seconds": elapsed,
        }

    except Exception as e:
        logger.error(f"POST /refresh failed: {e}")
        return {"error": "Refresh failed", "detail": str(e)}, 500
