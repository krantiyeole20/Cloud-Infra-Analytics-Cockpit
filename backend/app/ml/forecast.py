# backend/app/ml/forecast.py
# Power consumption forecasting — two models per HLD.md Section 5.6:
#   24h model: XGBoost Regressor with lag features + time features
#   7-day model: Linear Regression with Fourier seasonality terms
#
# Both aggregate power_consumption across all VMs per hour bucket via DuckDB,
# then train on the resulting time-series.

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from xgboost import XGBRegressor

from app.config import (
    FORECAST_DAYS,
    FORECAST_HOURS,
    POWER_ALERT_KW,
    XGBOOST_LEARNING_RATE,
    XGBOOST_N_ESTIMATORS,
)
from app.database import query

logger = logging.getLogger(__name__)


def _get_hourly_power_series() -> pd.DataFrame:
    """
    Aggregate fleet total power_consumption per hour from DuckDB.

    Returns:
        pd.DataFrame with columns: hour_bucket (datetime), total_power_kw
    """
    try:
        sql = """
            SELECT
                DATE_TRUNC('hour', CAST(timestamp AS TIMESTAMP)) AS hour_bucket,
                SUM(power_consumption) / 1000.0                 AS total_power_kw
            FROM telemetry
            GROUP BY hour_bucket
            ORDER BY hour_bucket
        """
        df = query(sql)
        df["hour_bucket"] = pd.to_datetime(df["hour_bucket"])
        return df
    except Exception as e:
        logger.error(f"_get_hourly_power_series failed: {e}")
        raise


def _build_lag_features(ts: pd.Series, lags: list[int]) -> pd.DataFrame:
    """Build lag columns for a time-series."""
    df = pd.DataFrame({"y": ts.values})
    for lag in lags:
        df[f"lag_{lag}"] = ts.shift(lag).values
    return df.dropna()


def _build_fourier_features(
    n: int,
    day_indices: np.ndarray,
    periods: list[float],
) -> pd.DataFrame:
    """
    Build sin/cos Fourier features for a range of day indices.

    Args:
        n:           Number of rows.
        day_indices: Array of day-index values.
        periods:     List of seasonal periods in days.

    Returns:
        pd.DataFrame with sin_{p} and cos_{p} columns per period.
    """
    result: dict = {}
    for p in periods:
        result[f"sin_{p}"] = np.sin(2 * np.pi * day_indices / p)
        result[f"cos_{p}"] = np.cos(2 * np.pi * day_indices / p)
    return pd.DataFrame(result)


def train_forecast_models(df_seed: Optional[pd.DataFrame] = None) -> dict:
    """
    Train both forecast models on the fleet hourly power time-series.

    Args:
        df_seed: Ignored (uses DuckDB for aggregation). Kept for API
                 consistency with other model training functions.

    Returns:
        dict with:
            model_24h  — trained XGBRegressor
            model_7day — trained LinearRegression
            ts         — hourly time-series DataFrame used for training
            lags       — list of lag values used in 24h model
            periods    — list of Fourier periods used in 7-day model
            residual_std_24h  — std of 24h model residuals (for CI)
            residual_std_7day — std of 7-day model residuals (for CI)

    Raises:
        Exception: Logged and re-raised on training failure.
    """
    try:
        ts = _get_hourly_power_series()
        logger.info(f"Hourly power series loaded — {len(ts)} hourly buckets")

        if len(ts) < 48:
            raise ValueError(
                f"Insufficient time-series data for forecasting: {len(ts)} hours"
            )

        power = ts["total_power_kw"]

        # ── 24h XGBoost model ───────────────────────────────────────────────
        lags = [1, 6, 24]
        feat_df = _build_lag_features(power, lags)
        ts_aligned = ts.iloc[max(lags):].reset_index(drop=True)
        feat_df = feat_df.reset_index(drop=True)
        feat_df["hour_of_day"] = ts_aligned["hour_bucket"].dt.hour.astype("float32")
        feat_df["day_of_week"] = ts_aligned["hour_bucket"].dt.dayofweek.astype("float32")

        X_24h = feat_df.drop(columns=["y"]).astype("float32")
        y_24h = feat_df["y"].astype("float32")

        model_24h = XGBRegressor(
            n_estimators=XGBOOST_N_ESTIMATORS,
            learning_rate=XGBOOST_LEARNING_RATE,
            tree_method="hist",
            random_state=42,
            verbosity=0,
        )
        model_24h.fit(X_24h, y_24h)
        residuals_24h = y_24h.values - model_24h.predict(X_24h)
        residual_std_24h = float(np.std(residuals_24h))
        logger.info(
            f"24h XGBoost model trained — "
            f"n={len(X_24h)}, residual_std={residual_std_24h:.2f}"
        )

        # ── 7-day Linear model with Fourier seasonality ─────────────────────
        daily = ts.copy()
        daily["day_index"] = np.arange(len(daily))
        periods = [7.0, 3.5]     # weekly and semi-weekly seasonality
        four_feats = _build_fourier_features(
            len(daily), daily["day_index"].values, periods
        )
        X_7day = four_feats.values.astype("float32")
        y_7day = daily["total_power_kw"].values.astype("float32")

        model_7day = LinearRegression()
        model_7day.fit(X_7day, y_7day)
        residuals_7day = y_7day - model_7day.predict(X_7day)
        residual_std_7day = float(np.std(residuals_7day))
        logger.info(
            f"7-day Linear model trained — "
            f"n={len(X_7day)}, residual_std={residual_std_7day:.2f}"
        )

        return {
            "model_24h": model_24h,
            "model_7day": model_7day,
            "ts": ts,
            "lags": lags,
            "periods": periods,
            "residual_std_24h": residual_std_24h,
            "residual_std_7day": residual_std_7day,
        }

    except Exception as e:
        logger.error(f"train_forecast_models failed: {e}")
        raise


def predict_24h(artifact: dict) -> dict:
    """
    Generate a 24-hour fleet power forecast.

    Args:
        artifact: Dict returned by train_forecast_models.

    Returns:
        dict matching HLD.md Section 6 /forecast/24h response shape:
            horizon_hours, series (list of {timestamp, predicted_kw, ci_lower, ci_upper}), mae
    """
    try:
        ts = artifact["ts"]
        model = artifact["model_24h"]
        lags = artifact["lags"]
        std = artifact["residual_std_24h"]
        ci_factor = 1.96  # 95% CI

        # Seed with last known values
        history = ts["total_power_kw"].values.tolist()
        last_ts = ts["hour_bucket"].iloc[-1]
        series = []

        for h in range(1, FORECAST_HOURS + 1):
            lag_vals = {f"lag_{lag}": history[-(lag)] for lag in lags}
            future_ts = last_ts + timedelta(hours=h)
            lag_vals["hour_of_day"] = float(future_ts.hour)
            lag_vals["day_of_week"] = float(future_ts.dayofweek)
            X_row = np.array([[lag_vals[f] for f in [f"lag_{l}" for l in lags] + ["hour_of_day", "day_of_week"]]], dtype="float32")
            pred = float(model.predict(X_row)[0])
            history.append(pred)

            series.append({
                "timestamp": future_ts.isoformat(),
                "predicted_kw": round(pred, 2),
                "ci_lower": round(pred - ci_factor * std, 2),
                "ci_upper": round(pred + ci_factor * std, 2),
            })

        return {
            "horizon_hours": FORECAST_HOURS,
            "series": series,
            "mae": round(std * 0.8, 2),  # approximate MAE from residual std
        }
    except Exception as e:
        logger.error(f"predict_24h failed: {e}")
        raise


def predict_7day(artifact: dict) -> dict:
    """
    Generate a 7-day daily fleet power forecast.

    Returns:
        dict matching HLD.md Section 6 /forecast/7day response shape:
            horizon_days, series, peak_day, peak_predicted_kw, alert, alert_message
    """
    try:
        ts = artifact["ts"]
        model = artifact["model_7day"]
        periods = artifact["periods"]
        std = artifact["residual_std_7day"]
        ci_factor = 1.96
        base_day_index = len(ts)

        series = []
        last_date = ts["hour_bucket"].iloc[-1].date()
        peak_kw = -float("inf")
        peak_day = ""

        for d in range(1, FORECAST_DAYS + 1):
            day_index = base_day_index + d
            four = _build_fourier_features(1, np.array([day_index]), periods)
            X_row = four.values.astype("float32")
            pred = float(model.predict(X_row)[0])
            future_date = (last_date + timedelta(days=d)).isoformat()

            series.append({
                "date": future_date,
                "predicted_kw": round(pred, 2),
                "ci_lower": round(pred - ci_factor * std, 2),
                "ci_upper": round(pred + ci_factor * std, 2),
            })
            if pred > peak_kw:
                peak_kw = pred
                peak_day = future_date

        alert = peak_kw > POWER_ALERT_KW
        return {
            "horizon_days": FORECAST_DAYS,
            "series": series,
            "peak_day": peak_day,
            "peak_predicted_kw": round(peak_kw, 2),
            "alert": alert,
            "alert_message": (
                f"Predicted peak exceeds threshold on {peak_day}. "
                "Review VM scheduling and power capacity."
                if alert else ""
            ),
        }
    except Exception as e:
        logger.error(f"predict_7day failed: {e}")
        raise
