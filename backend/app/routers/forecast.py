# backend/app/routers/forecast.py
# GET /forecast/24h and /forecast/7day
# HLD.md Section 6.

import logging
from fastapi import APIRouter, Request
from app import cache
from app.config import TTL_FORECAST

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/24h")
async def get_forecast_24h(request: Request):
    """
    Return 24-hour fleet power consumption forecast from XGBoost model.

    Caches for 60s. On model unavailability returns 503.

    Response shape (HLD.md Section 6 /forecast/24h):
        horizon_hours, series[{timestamp, predicted_kw, ci_lower, ci_upper}], mae
    """
    CACHE_KEY = "forecast:24h"
    try:
        cached = await cache.get(CACHE_KEY)
        if cached:
            return cached
    except Exception:
        pass

    try:
        # Lazy train forecast models if not yet available
        forecast_artifact = getattr(request.app.state, "forecast_models", None)
        if forecast_artifact is None:
            try:
                from app.ml.forecast import train_forecast_models
                forecast_artifact = train_forecast_models()
                request.app.state.forecast_models = forecast_artifact
                logger.info("Forecast models trained on demand")
            except Exception as e:
                logger.error(f"On-demand forecast model training failed: {e}")
                return {"error": "Forecast model unavailable", "detail": str(e)}, 503

        from app.ml.forecast import predict_24h
        result = predict_24h(forecast_artifact)
        await cache.set(CACHE_KEY, result, TTL_FORECAST)
        return result

    except Exception as e:
        logger.error(f"GET /forecast/24h failed: {e}")
        return {"error": "24h forecast failed", "detail": str(e)}, 500


@router.get("/7day")
async def get_forecast_7day(request: Request):
    """
    Return 7-day daily fleet power forecast from linear Fourier model.

    Includes peak day, peak_predicted_kw, and alert flag.

    Response shape (HLD.md Section 6 /forecast/7day):
        horizon_days, series[{date, predicted_kw, ci_lower, ci_upper}],
        peak_day, peak_predicted_kw, alert, alert_message
    """
    CACHE_KEY = "forecast:7day"
    try:
        cached = await cache.get(CACHE_KEY)
        if cached:
            return cached
    except Exception:
        pass

    try:
        forecast_artifact = getattr(request.app.state, "forecast_models", None)
        if forecast_artifact is None:
            try:
                from app.ml.forecast import train_forecast_models
                forecast_artifact = train_forecast_models()
                request.app.state.forecast_models = forecast_artifact
                logger.info("Forecast models trained on demand")
            except Exception as e:
                logger.error(f"On-demand forecast model training failed: {e}")
                return {"error": "Forecast model unavailable", "detail": str(e)}, 503

        from app.ml.forecast import predict_7day
        result = predict_7day(forecast_artifact)
        await cache.set(CACHE_KEY, result, TTL_FORECAST)
        return result

    except Exception as e:
        logger.error(f"GET /forecast/7day failed: {e}")
        return {"error": "7-day forecast failed", "detail": str(e)}, 500
