# backend/app/main.py
# FastAPI application entry point — Cloud VM Intelligence Cockpit.
# HLD.md Section 4.1.
#
# Startup sequence (free-tier memory path — no pandas intermediary):
#   1. database.init_db_from_csv  — DuckDB reads CSV natively (~200 MB peak)
#   2. pipeline.apply_pipeline_sql — nulls + derived metrics in SQL
#   3. Sample 150K rows → synthetic generator (fits in ~80 MB pandas)
#   4. Sample 200K rows → train all ML models
#   5. cache.warm_cache           — verify Redis connectivity
#
# Peak memory: ~350 MB total → fits Render/Railway free tier (512 MB).
# The old pandas path (load_csv → run_pipeline → init_db) required ~1.6 GB.

import logging
import logging.config
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, CSV_PATH

# ---------------------------------------------------------------------------
# Logging configuration — consistent format across all modules
# ---------------------------------------------------------------------------
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "stream": "ext://sys.stdout",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "uvicorn": {"propagate": True},
        "uvicorn.error": {"propagate": True},
        "uvicorn.access": {"propagate": True},
        "fastapi": {"propagate": True},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler — manages startup and shutdown.

    Free-tier memory path: DuckDB reads the CSV natively so a full 2M-row
    pandas DataFrame is never created. ML models train on a 200K-row sample
    (statistically robust for all four model types).
    """
    t0 = time.perf_counter()
    logger.info("=== Cloud VM Intelligence Cockpit — startup (free-tier memory path) ===")

    # 0. Ensure the dataset CSV is present — download from Kaggle if missing.
    #    kagglehub caches the download; subsequent cold starts skip this step.
    #    Requires KAGGLE_USERNAME + KAGGLE_KEY env vars on Render.
    import os, pathlib
    _csv = pathlib.Path(CSV_PATH)
    if not _csv.exists():
        logger.info(
            f"Step 0 — CSV not found at '{CSV_PATH}'; "
            "downloading from Kaggle (abdurraziq01/cloud-computing-performance-metrics)…"
        )
        try:
            import kagglehub
            _dl_path = kagglehub.dataset_download(
                "abdurraziq01/cloud-computing-performance-metrics"
            )
            # kagglehub puts files in a versioned cache dir — find the CSV
            _found = list(pathlib.Path(_dl_path).rglob("*.csv"))
            if not _found:
                raise FileNotFoundError(f"No CSV found under kagglehub path: {_dl_path}")
            _src = _found[0]
            _csv.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy2(_src, _csv)
            logger.info(f"Step 0 — Dataset downloaded and copied to '{CSV_PATH}' ({_csv.stat().st_size // 1_000_000} MB)")
        except Exception as e:
            logger.error(f"Step 0 — Kaggle download failed: {e}")
            raise RuntimeError(
                "telemetry.csv is required but could not be downloaded. "
                "Set KAGGLE_USERNAME and KAGGLE_KEY env vars on Render."
            ) from e

    # 1. Load CSV directly into DuckDB — no pandas intermediary.
    #    DuckDB columnar: ~150–250 MB vs ~800 MB for pandas float64.
    logger.info(f"Step 1/5 — Loading CSV natively into DuckDB from '{CSV_PATH}'")
    from app.database import init_db_from_csv, get_row_count, query as db_query
    init_db_from_csv(CSV_PATH)

    # 2. Apply pipeline in SQL (null imputation + derived metrics).
    #    Rebuilds 'telemetry' entirely in DuckDB; full data never hits pandas.
    logger.info("Step 2/5 — Applying pipeline (SQL: COALESCE nulls + derived cols)")
    from app.pipeline import apply_pipeline_sql
    apply_pipeline_sql()

    app.state.rows_loaded = get_row_count()
    # DuckDB in-memory estimate: ~15 bytes/row average (columnar, compressed)
    app.state.memory_mb = round(app.state.rows_loaded * 15 / 1_000_000, 1)

    # 3. Sample 150K rows for the synthetic data generator.
    #    50K/cohort is statistically sufficient for per-cohort covariance fitting.
    logger.info("Step 3/5 — Sampling 150K rows for synthetic generator")
    from app.synthetic import build_synthetic_generator
    app.state.synthetic_generator = None
    try:
        synth_sample = db_query("SELECT * FROM telemetry USING SAMPLE 150000")
        app.state.synthetic_generator = build_synthetic_generator(
            synth_sample, synth_strategy="per_cohort_covariance"
        )
        del synth_sample
        logger.info("Synthetic generator ready")
    except Exception as e:
        logger.error(f"Synthetic generator failed: {e}")

    # 4. Train ML models on 200K sample.
    logger.info("Step 4/5 — Training ML models (200K-row sample)")
    app.state.efficiency_model = None
    app.state.anomaly_models = None
    app.state.completion_model = None

    try:
        seed_df = db_query("SELECT * FROM telemetry USING SAMPLE 200000")
    except Exception as e:
        logger.error(f"Failed to sample seed data for ML training: {e}")
        seed_df = None

    if seed_df is not None:
        try:
            from app.ml.efficiency import train_efficiency_model
            app.state.efficiency_model = train_efficiency_model(seed_df)
            logger.info("Efficiency model trained")
        except Exception as e:
            logger.error(f"Efficiency model training failed: {e}")

        try:
            from app.ml.anomaly import train_anomaly_models
            app.state.anomaly_models = train_anomaly_models(seed_df)
            logger.info("Anomaly models trained")
        except Exception as e:
            logger.error(f"Anomaly model training failed: {e}")

        try:
            from app.ml.completion import train_completion_model
            app.state.completion_model = train_completion_model(seed_df)
            logger.info("Completion model trained")
        except Exception as e:
            logger.error(f"Completion model training failed: {e}")

        del seed_df

    # 5. Warm Redis cache
    logger.info("Step 5/5 — Warming Redis cache")
    from app.cache import warm_cache
    await warm_cache()

    elapsed = time.perf_counter() - t0
    logger.info(
        f"=== Startup complete in {elapsed:.1f}s — "
        f"rows_loaded={app.state.rows_loaded}, "
        f"memory_mb~{app.state.memory_mb} (DuckDB columnar estimate) ==="
    )

    yield  # Application is running

    logger.info("=== Cloud VM Intelligence Cockpit — shutdown ===")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Cloud VM Intelligence Cockpit",
    description=(
        "Production-grade cloud VM monitoring dashboard centered on energy "
        "efficiency and compute value intelligence."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — explicit origin whitelist (no wildcard in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["ops"])
async def health():
    """
    Liveness probe for Render / Railway.

    Returns:
        dict: status, UTC timestamp, rows loaded into DuckDB, memory estimate.
    """
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "rows_loaded": getattr(app.state, "rows_loaded", -1),
        "memory_mb": getattr(app.state, "memory_mb", 0.0),
    }


# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------

_ROUTERS = [
    ("app.routers.kpis",        "/kpis",            ["kpis"]),
    ("app.routers.workload",     "/workload",        ["workload"]),
    ("app.routers.performance",  "/performance",     ["performance"]),
    ("app.routers.vms",          "/vms",             ["vms"]),
    ("app.routers.anomalies",    "/anomalies",       ["anomalies"]),
    ("app.routers.forecast",     "/forecast",        ["forecast"]),
    ("app.routers.topology",     "/topology",        ["topology"]),
    ("app.routers.explorer",     "/explorer",        ["explorer"]),
    ("app.routers.refresh",      "/refresh",         ["refresh"]),
]

for module_path, prefix, tags in _ROUTERS:
    try:
        import importlib
        module = importlib.import_module(module_path)
        app.include_router(module.router, prefix=prefix, tags=tags)
        logger.info(f"Router registered: {prefix}")
    except ImportError as e:
        logger.warning(f"Router '{module_path}' not yet available: {e}")
    except AttributeError as e:
        logger.warning(f"Router '{module_path}' has no 'router' attribute: {e}")
    except Exception as e:
        logger.error(f"Router '{module_path}' registration failed: {e}")
