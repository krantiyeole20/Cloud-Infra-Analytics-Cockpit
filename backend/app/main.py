# backend/app/main.py
# FastAPI application entry point — Cloud VM Intelligence Cockpit.
# HLD.md Section 4.1.
#
# Startup sequence:
#   1. Load CSV via pipeline.load_csv
#   2. pipeline.run_pipeline — null handling + derived metrics + dtype downcast
#   3. database.init_db       — register processed DataFrame into DuckDB
#   4. synthetic.build_synthetic_generator — fit per-cohort covariance models
#   5. ML model training stubs (efficiency, anomaly, completion)
#   6. cache.warm_cache       — verify Redis connectivity
#
# All routers are registered with graceful ImportError handling so Phase 1
# starts cleanly while Phase 3 router files are still being implemented.

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

    On startup:
        - Loads and processes the telemetry CSV through the data pipeline
        - Initialises DuckDB with the processed DataFrame
        - Builds the synthetic data generator
        - Trains initial ML model stubs
        - Warms the Redis cache

    On shutdown:
        - Logs a clean shutdown message (resources freed by GC / OS)
    """
    t0 = time.perf_counter()
    logger.info("=== Cloud VM Intelligence Cockpit — startup ===")

    # 1. Load raw CSV
    logger.info(f"Step 1/6 — Loading CSV from '{CSV_PATH}'")
    from app.pipeline import load_csv, run_pipeline
    raw_df = load_csv(CSV_PATH)

    # 2. Run data pipeline (null handling + derived metrics + dtype downcast)
    logger.info("Step 2/6 — Running data pipeline")
    clean_df = run_pipeline(raw_df)
    del raw_df  # release raw memory before DuckDB registration

    # 3. Initialise DuckDB
    logger.info("Step 3/6 — Initialising DuckDB")
    from app.database import init_db, get_row_count
    init_db(clean_df)
    app.state.rows_loaded = get_row_count()
    import sys
    app.state.memory_mb = sum(
        obj.memory_usage(deep=True).sum()
        for obj in [clean_df]
        if hasattr(obj, "memory_usage")
    ) / 1_000_000

    # 4. Build synthetic data generator
    logger.info("Step 4/6 — Building synthetic data generator")
    from app.synthetic import build_synthetic_generator
    app.state.synthetic_generator = build_synthetic_generator(
        clean_df, synth_strategy="per_cohort_covariance"
    )
    del clean_df  # generator has captured what it needs

    # 5. Train initial ML models (graceful stub if modules not yet implemented)
    logger.info("Step 5/6 — Training ML models")

    try:
        from app.database import query as db_query
        seed_df = db_query("SELECT * FROM telemetry LIMIT 100000")
    except Exception as e:
        logger.error(f"Failed to sample seed data for ML training: {e}")
        seed_df = None

    app.state.efficiency_model = None
    app.state.anomaly_models = None
    app.state.completion_model = None

    if seed_df is not None:
        try:
            from app.ml.efficiency import train_efficiency_model
            app.state.efficiency_model = train_efficiency_model(seed_df)
            logger.info("Efficiency model trained")
        except (ImportError, NotImplementedError) as e:
            logger.warning(f"Efficiency model not yet implemented: {e}")
        except Exception as e:
            logger.error(f"Efficiency model training failed: {e}")

        try:
            from app.ml.anomaly import train_anomaly_models
            app.state.anomaly_models = train_anomaly_models(seed_df)
            logger.info("Anomaly models trained")
        except (ImportError, NotImplementedError) as e:
            logger.warning(f"Anomaly models not yet implemented: {e}")
        except Exception as e:
            logger.error(f"Anomaly model training failed: {e}")

        try:
            from app.ml.completion import train_completion_model
            app.state.completion_model = train_completion_model(seed_df)
            logger.info("Completion model trained")
        except (ImportError, NotImplementedError) as e:
            logger.warning(f"Completion model not yet implemented: {e}")
        except Exception as e:
            logger.error(f"Completion model training failed: {e}")

    # 6. Warm Redis cache
    logger.info("Step 6/6 — Warming Redis cache")
    from app.cache import warm_cache
    await warm_cache()

    elapsed = time.perf_counter() - t0
    logger.info(
        f"=== Startup complete in {elapsed:.1f}s — "
        f"rows_loaded={app.state.rows_loaded}, "
        f"memory_mb={app.state.memory_mb:.1f} ==="
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
    Liveness probe for Railway.

    Returns:
        dict: status, UTC timestamp, rows loaded into DuckDB, memory footprint.
    """
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "rows_loaded": getattr(app.state, "rows_loaded", -1),
        "memory_mb": round(getattr(app.state, "memory_mb", 0.0), 1),
    }


# ---------------------------------------------------------------------------
# Router registration — each router is optional during Phase 1.
# ImportError → logged as warning, not fatal, so startup always succeeds.
# All routers will be implemented in Phase 3.
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
        logger.warning(
            f"Router '{module_path}' not yet implemented "
            f"(will be added in Phase 3): {e}"
        )
    except AttributeError as e:
        logger.warning(
            f"Router '{module_path}' exists but has no 'router' attribute: {e}"
        )
    except Exception as e:
        logger.error(f"Router '{module_path}' registration failed: {e}")
