# backend/app/config.py
# All application constants for the Cloud VM Intelligence Cockpit.
# No hardcoded values anywhere else — import everything from here.
# Phase 0 data analysis decisions are baked in (see PROGRESS.md for derivation).
import os
from typing import List

# ---------------------------------------------------------------------------
# Infrastructure
# ---------------------------------------------------------------------------
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
CSV_PATH: str = os.getenv("CSV_PATH", "data/telemetry.csv")

# CORS — split comma-separated env var into a list
CORS_ORIGINS: List[str] = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

# ---------------------------------------------------------------------------
# Nullable columns requiring imputation (Phase 0: null_strategy = global_median)
# ---------------------------------------------------------------------------
NULLABLE_COLS: List[str] = [
    "cpu_usage",
    "memory_usage",
    "network_traffic",
    "power_consumption",
    "num_executed_instructions",
    "execution_time",
]

# All numeric columns (nullable + always-present efficiency)
NUMERIC_COLS: List[str] = NULLABLE_COLS + ["energy_efficiency"]

# ---------------------------------------------------------------------------
# Synthetic generation (Phase 0: synth_strategy = per_cohort_covariance)
# ---------------------------------------------------------------------------
BATCH_SIZE: int = 75  # rows per refresh (center of 50–100 range)

# Column bounds for synthetic clipping — must match schema exactly
COLUMN_BOUNDS: dict = {
    "cpu_usage":                  (0.0,    100.0),
    "memory_usage":               (0.0,    100.0),
    "network_traffic":            (0.0,   1000.0),
    "power_consumption":          (0.0,    500.0),
    "num_executed_instructions":  (0.0,  10000.0),
    "execution_time":             (0.0001, 100.0),
    "energy_efficiency":          (0.0,      1.0),
}

# Categorical value options (must match actual data)
TASK_TYPES: List[str] = ["io", "network", "compute"]
TASK_PRIORITIES: List[str] = ["low", "medium", "high"]
TASK_STATUSES: List[str] = ["waiting", "running", "completed"]

# ---------------------------------------------------------------------------
# Redis TTLs (seconds)
# ---------------------------------------------------------------------------
TTL_KPI: int = 30
TTL_WORKLOAD: int = 30
TTL_ANOMALY: int = 60
TTL_SHAP: int = 60
TTL_FORECAST: int = 60
TTL_MODEL: int = 3600  # model artifacts — live until next refresh

# ---------------------------------------------------------------------------
# Energy waste detection
# Phase 0 decision: waste_threshold = 375.14 (p75 of waiting-state power draw)
# ---------------------------------------------------------------------------
WASTE_POWER_THRESHOLD: float = float(
    os.getenv("WASTE_POWER_THRESHOLD", "375.14")
)

# ---------------------------------------------------------------------------
# Anomaly thresholds
# Phase 0 decision: anomaly_ui = fleet-level banner (waste rate 8.3% > 5%)
# ---------------------------------------------------------------------------
ANOMALY_THRESHOLD: float = 0.7           # behavioral_anomaly_score cutoff
WASTE_FLEET_PCT_ALERT: float = 0.05      # >5% fleet wasting → fleet banner
SHAP_PRECOMPUTE_N: int = 10              # top-N anomalous VMs to precompute SHAP

# ---------------------------------------------------------------------------
# Alert thresholds
# ---------------------------------------------------------------------------
CPU_ALERT_PCT: float = 90.0
MEMORY_ALERT_PCT: float = 90.0
EFFICIENCY_LOW_THRESHOLD: float = 0.2   # below this → low-efficiency alert

# ---------------------------------------------------------------------------
# ML model hyperparameters
# ---------------------------------------------------------------------------
ISOLATION_FOREST_CONTAMINATION: float = 0.05
ISOLATION_FOREST_N_ESTIMATORS: int = 100
XGBOOST_N_ESTIMATORS: int = 200
XGBOOST_LEARNING_RATE: float = 0.05
LIGHTGBM_N_ESTIMATORS: int = 150
LIGHTGBM_LEARNING_RATE: float = 0.05

# ---------------------------------------------------------------------------
# Forecast horizons
# ---------------------------------------------------------------------------
FORECAST_HOURS: int = 24
FORECAST_DAYS: int = 7

# Power alert threshold for 7-day forecast
POWER_ALERT_KW: float = float(os.getenv("POWER_ALERT_KW", "400000.0"))
