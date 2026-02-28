# Cloud VM Intelligence Cockpit — High-Level Design Document

## 0. Document Purpose

This document is the single source of truth for the Cloud VM Intelligence Cockpit project. It is structured for AI agent consumption and human engineering review. Every architectural decision recorded here was finalized through explicit design debate. Sections marked **[CODE AGENT DECIDES]** require the agent to run documented analysis against the actual CSV before implementing — the candidate approaches and the analysis method are specified, but the final choice is data-driven.

---

## 1. Project Summary

A production-grade, real-time cloud VM monitoring and intelligence dashboard centered on energy efficiency as the primary operational metric. The system ingests a 1.8M-row VM telemetry dataset, enriches it continuously with statistically faithful synthetic data on each user-triggered refresh, runs four ML models per VM cohort, and surfaces results through a cockpit-style React frontend backed by a FastAPI service layer.

The central narrative: **how much useful computational work is each VM delivering per unit of energy consumed, and which VMs are wasting power while doing nothing.**

---

## 2. Dataset

### 2.1 Source

**Name:** Cloud Computing Performance Metrics  
**Author:** abdurraziq01  
**URL:** https://www.kaggle.com/datasets/abdurraziq01/cloud-computing-performance-metrics  
**Format:** Single CSV file  
**Size:** 1,799,361 rows × 12 columns  
**Time span:** 2022-12-31 to 2023-07-20 (~7 months)  
**Purpose:** Simulated cloud workload data exploring the impact of ML optimization on energy efficiency and resource management

### 2.2 Confirmed Schema

The following columns are confirmed from direct inspection of the raw CSV. No assumed or inferred columns are used anywhere in this document.

| Column | Type | Range | Notes |
|---|---|---|---|
| `vm_id` | UUID string | ~unique VMs | Entity identifier — primary grouping key |
| `timestamp` | datetime | 2022-12-31 to 2023-07-20 | Time-series axis |
| `cpu_usage` | float | 0–100 | CPU load percentage — **has nulls** |
| `memory_usage` | float | 0–100 | RAM consumption percentage — **has nulls** |
| `network_traffic` | float | 0–1000 | Network throughput — **has nulls** |
| `power_consumption` | float | 0–500 | Energy draw — **has nulls** |
| `num_executed_instructions` | int | 0–10000 | Computational output — **has nulls** |
| `execution_time` | float | 0–100 | Task execution duration — **has nulls** |
| `energy_efficiency` | float | 0–1 | Pre-computed efficiency ratio — appears clean |
| `task_type` | categorical | io / network / compute | Workload class — primary cohort dimension |
| `task_priority` | categorical | high / medium / low | Task urgency label |
| `task_status` | categorical | waiting / completed / running | Operational state — key anomaly signal |

**Approximate task_type distribution:** io ~30%, network ~30%, compute ~40%  
**Approximate task_priority distribution:** to be confirmed by code agent  
**Approximate task_status distribution:** to be confirmed by code agent

### 2.3 Null Pattern

Nulls are not random. Observed pattern: `cpu_usage`, `network_traffic`, `power_consumption`, `num_executed_instructions` can be null simultaneously on a row while `memory_usage`, `execution_time`, and `energy_efficiency` remain populated. This suggests sensor-level reporting failures on specific VMs, not row-level corruption. Null handling strategy is deferred — see Section 2.5.

### 2.4 Derived Metrics

Two metrics are computed at pipeline time and appended as columns before any ML model sees the data:

**Throughput:**
```python
df["throughput"] = df["num_executed_instructions"] / df["execution_time"].replace(0, float("nan"))
```
Units: instructions per time unit. Null where either input is null or execution_time is zero.

**Compute Value Score:**
```python
df["compute_value"] = df["throughput"] * df["energy_efficiency"]
```
Interpretation: how much useful computation this VM delivers per unit of energy. Higher is better. This is the primary VM ranking metric across the entire dashboard.

**Energy Waste Flag:**
```python
df["is_wasting_energy"] = (
    (df["task_status"] == "waiting") &
    (df["power_consumption"] > WASTE_POWER_THRESHOLD)
)
```
Threshold `WASTE_POWER_THRESHOLD` defined in `config.py`. A VM drawing significant power while its task is in waiting state is producing zero computational output — pure waste.

### 2.5 Null Handling [CODE AGENT DECIDES]

Before any model training or aggregation, the code agent must run the following analysis:

```python
# Run this first, output to logs
null_report = df.isnull().sum() / len(df) * 100
null_by_task_type = df.groupby("task_type").apply(lambda g: g.isnull().sum() / len(g) * 100)
print(null_report)
print(null_by_task_type)
```

Based on the output, choose one of:

**Option A — Per task_type median imputation (recommended if null rate < 5% and varies by cohort):**
```python
for col in NULLABLE_COLS:
    df[col] = df.groupby("task_type")[col].transform(lambda x: x.fillna(x.median()))
```

**Option B — Global median imputation (if null rate < 1% and cohort variation is negligible):**
```python
for col in NULLABLE_COLS:
    df[col] = df[col].fillna(df[col].median())
```

**Option C — Drop null rows (if null rate < 0.5% — acceptable given 1.8M row volume):**
```python
df = df.dropna(subset=NULLABLE_COLS)
```

Log the chosen strategy and null counts to the application log at startup.

### 2.6 Load Strategy

The CSV is never hosted as a raw file or served directly to the frontend. On FastAPI process startup the CSV is read into memory and registered as a DuckDB in-memory table named `telemetry`. Derived metrics (`throughput`, `compute_value`, `is_wasting_energy`) are computed and appended before registration. Null handling runs before derived metric computation. All subsequent reads go through DuckDB SQL. The CSV lives at `backend/data/telemetry.csv` and is committed to the monorepo.

**Scale note:** 1.8M rows at ~12 columns will occupy approximately 800MB–1.2GB in-memory depending on dtype widths. The code agent must verify Railway's available memory tier before deployment and apply dtype downcasting if needed:

```python
df["cpu_usage"] = df["cpu_usage"].astype("float32")
df["memory_usage"] = df["memory_usage"].astype("float32")
# apply to all float columns
```

### 2.7 Synthetic Data Generation on Refresh [CODE AGENT DECIDES]

On each manual refresh, the backend generates new rows and appends them to the live DuckDB `telemetry` table. The generation must preserve the `task_type` distribution and per-column correlations.

**Candidate A — Per task_type cohort covariance (most accurate, recommended):**

```python
def build_synthetic_generator(seed_df: pd.DataFrame):
    cohort_generators = {}
    task_types = seed_df["task_type"].unique()
    
    for task in task_types:
        cohort = seed_df[seed_df["task_type"] == task][NUMERIC_COLS].dropna()
        mean_vec = cohort.mean().values
        cov_matrix = cohort.cov().values
        cohort_generators[task] = (mean_vec, cov_matrix)
    
    task_dist = seed_df["task_type"].value_counts(normalize=True).to_dict()
    priority_dist = seed_df["task_priority"].value_counts(normalize=True).to_dict()
    status_dist = seed_df["task_status"].value_counts(normalize=True).to_dict()
    
    def generate(n: int = BATCH_SIZE) -> pd.DataFrame:
        rows = []
        for task, proportion in task_dist.items():
            count = max(1, int(n * proportion))
            mean_vec, cov_matrix = cohort_generators[task]
            samples = np.random.multivariate_normal(mean_vec, cov_matrix, size=count)
            cohort_df = pd.DataFrame(samples, columns=NUMERIC_COLS)
            for col, (lo, hi) in COLUMN_BOUNDS.items():
                if col in cohort_df.columns:
                    cohort_df[col] = cohort_df[col].clip(lo, hi)
            cohort_df["task_type"] = task
            cohort_df["task_priority"] = np.random.choice(
                list(priority_dist.keys()), size=count, p=list(priority_dist.values())
            )
            cohort_df["task_status"] = np.random.choice(
                list(status_dist.keys()), size=count, p=list(status_dist.values())
            )
            cohort_df["vm_id"] = [str(uuid.uuid4()) for _ in range(count)]
            cohort_df["timestamp"] = pd.Timestamp.utcnow()
            rows.append(cohort_df)
        return pd.concat(rows, ignore_index=True)
    
    return generate
```

**Candidate B — Global covariance with proportional task_type sampling (simpler):**  
Same as Candidate A but fit one covariance matrix on the full dataset, then assign `task_type` via weighted sampling. Use only if cohort covariance matrices are near-singular (check `np.linalg.matrix_rank(cov_matrix)` for each cohort).

Code agent selects based on rank check. Log the chosen strategy.

```python
COLUMN_BOUNDS = {
    "cpu_usage":                (0.0,   100.0),
    "memory_usage":             (0.0,   100.0),
    "network_traffic":          (0.0,   1000.0),
    "power_consumption":        (0.0,   500.0),
    "num_executed_instructions":(0.0,   10000.0),
    "execution_time":           (0.0001, 100.0),
    "energy_efficiency":        (0.0,   1.0),
}

BATCH_SIZE = 75  # center of 50–100 range, defined in config.py
```

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                          │
│  React + TypeScript                                               │
│  ├── Recharts     (time-series, bar, area, sparklines)           │
│  ├── Plotly.js    (3D surface, SHAP waterfall, ROC curve)        │
│  └── D3.js        (VM topology network graph)                    │
└─────────────────────────────┬────────────────────────────────────┘
                              │  REST (JSON)
                              │  Manual refresh → POST /refresh
                              │  GET /kpis, /vms, /anomalies, etc.
┌─────────────────────────────▼────────────────────────────────────┐
│                        BACKEND (Railway)                          │
│  FastAPI + Python                                                 │
│  ├── Routers      (kpis, vms, anomalies, forecast,               │
│  │                 topology, explorer, refresh)                  │
│  ├── ML Engine    (XGBoost efficiency predictor,                 │
│  │                 compute value scorer, IsolationForest,        │
│  │                 LightGBM task completion predictor, SHAP)     │
│  ├── Data Layer   (DuckDB in-memory, synthetic generator,        │
│  │                 null handler, derived metrics)                │
│  └── Cache Layer  (Redis — hot queries + model artifacts)        │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Repository Structure (Monorepo)

```
cloud-vm-cockpit/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx            # persistent fleet health sidebar
│   │   │   │   ├── TopBar.tsx             # global alert queue + refresh button
│   │   │   │   └── MainCanvas.tsx         # view router
│   │   │   ├── views/
│   │   │   │   ├── OverviewView.tsx
│   │   │   │   ├── WorkloadView.tsx
│   │   │   │   ├── AnomalyView.tsx
│   │   │   │   ├── ForecastView.tsx
│   │   │   │   └── ExplorerView.tsx
│   │   │   ├── charts/
│   │   │   │   ├── MetricTimeSeries.tsx     # Recharts
│   │   │   │   ├── WorkloadHeatmap.tsx      # Recharts
│   │   │   │   ├── EfficiencySurface3D.tsx  # Plotly — task_type × time × efficiency
│   │   │   │   ├── ShapWaterfall.tsx        # Plotly
│   │   │   │   ├── RocCurve.tsx             # Plotly
│   │   │   │   └── TopologyGraph.tsx        # D3 — VM network graph
│   │   │   └── cards/
│   │   │       ├── KpiCard.tsx
│   │   │       └── VmDetailCard.tsx         # four independent ML scores
│   │   ├── hooks/
│   │   │   ├── usePolling.ts               # interval-based GET polling
│   │   │   └── useRefresh.ts               # POST /refresh + invalidate
│   │   ├── api/
│   │   │   └── client.ts                   # typed fetch wrappers per endpoint
│   │   ├── store/
│   │   │   └── dashboardStore.ts           # Zustand global state
│   │   ├── constants.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vercel.json
├── backend/
│   ├── app/
│   │   ├── main.py                         # FastAPI app init, lifespan handler
│   │   ├── config.py                       # all constants, TTLs, thresholds
│   │   ├── database.py                     # DuckDB singleton + query helpers
│   │   ├── cache.py                        # Redis client + get/set/invalidate
│   │   ├── pipeline.py                     # null handling + derived metrics
│   │   ├── synthetic.py                    # per-cohort multivariate generator
│   │   ├── ml/
│   │   │   ├── efficiency.py               # XGBoost energy efficiency predictor
│   │   │   ├── compute_value.py            # throughput + compute value scorer
│   │   │   ├── anomaly.py                  # IsolationForest per task_type cohort
│   │   │   ├── completion.py               # LightGBM task completion predictor
│   │   │   └── explainability.py           # SHAP values + ROC curve data
│   │   └── routers/
│   │       ├── kpis.py
│   │       ├── vms.py
│   │       ├── anomalies.py
│   │       ├── forecast.py
│   │       ├── topology.py
│   │       ├── explorer.py
│   │       └── refresh.py
│   ├── data/
│   │   └── telemetry.csv                   # seed dataset, committed to repo
│   ├── requirements.txt
│   └── railway.toml
├── .github/
│   └── workflows/
│       └── ci.yml
├── HLD.md
├── AGENT_PROMPT.md
└── README.md
```

---

## 4. Backend Design

### 4.1 FastAPI Application Lifecycle

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import init_db
from app.pipeline import run_pipeline
from app.synthetic import build_synthetic_generator
from app.ml.efficiency import train_efficiency_model
from app.ml.anomaly import train_anomaly_models
from app.ml.completion import train_completion_model
from app.cache import warm_cache
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup — loading CSV into DuckDB")
    raw_df = load_csv("data/telemetry.csv")
    clean_df = run_pipeline(raw_df)        # null handling + derived metrics
    init_db(clean_df)
    app.state.synthetic_generator = build_synthetic_generator(clean_df)
    logger.info("Training ML models")
    app.state.efficiency_model  = train_efficiency_model(clean_df)
    app.state.anomaly_models    = train_anomaly_models(clean_df)
    app.state.completion_model  = train_completion_model(clean_df)
    logger.info("Warming Redis cache")
    await warm_cache()
    yield
    logger.info("Shutdown")

app = FastAPI(lifespan=lifespan)
```

### 4.2 Data Pipeline

```python
# backend/app/pipeline.py
import pandas as pd
import numpy as np
import logging
from app.config import NULLABLE_COLS, WASTE_POWER_THRESHOLD

logger = logging.getLogger(__name__)

def run_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    try:
        df = _handle_nulls(df)
        df = _add_derived_metrics(df)
        df = _downcast_dtypes(df)
        logger.info(f"Pipeline complete — {len(df)} rows, {df.memory_usage(deep=True).sum() / 1e6:.1f} MB")
        return df
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise

def _handle_nulls(df: pd.DataFrame) -> pd.DataFrame:
    # [CODE AGENT DECIDES] — run null analysis first, then implement chosen strategy
    # Log null rates per column and per task_type cohort before any imputation
    null_rates = df[NULLABLE_COLS].isnull().sum() / len(df) * 100
    logger.info(f"Null rates per column:\n{null_rates.to_string()}")
    null_by_cohort = df.groupby("task_type")[NULLABLE_COLS].apply(
        lambda g: g.isnull().sum() / len(g) * 100
    )
    logger.info(f"Null rates by task_type:\n{null_by_cohort.to_string()}")
    # Implement chosen strategy here based on logged output
    raise NotImplementedError("Code agent must implement null handling after analysis")

def _add_derived_metrics(df: pd.DataFrame) -> pd.DataFrame:
    df["throughput"] = df["num_executed_instructions"] / df["execution_time"].replace(0, float("nan"))
    df["compute_value"] = df["throughput"] * df["energy_efficiency"]
    df["is_wasting_energy"] = (
        (df["task_status"] == "waiting") &
        (df["power_consumption"] > WASTE_POWER_THRESHOLD)
    ).astype(int)
    return df

def _downcast_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    float_cols = df.select_dtypes(include="float64").columns
    for col in float_cols:
        df[col] = df[col].astype("float32")
    return df
```

### 4.3 DuckDB Layer

```python
# backend/app/database.py
import duckdb
import pandas as pd
import logging

logger = logging.getLogger(__name__)
_conn: duckdb.DuckDBPyConnection = None

def init_db(df: pd.DataFrame) -> None:
    global _conn
    try:
        _conn = duckdb.connect(database=":memory:")
        _conn.register("telemetry_view", df)
        _conn.execute("CREATE TABLE telemetry AS SELECT * FROM telemetry_view")
        logger.info(f"DuckDB initialized — {len(df)} rows registered")
    except Exception as e:
        logger.error(f"DuckDB init failed: {e}")
        raise

def query(sql: str) -> pd.DataFrame:
    try:
        return _conn.execute(sql).df()
    except Exception as e:
        logger.error(f"DuckDB query failed: {sql[:120]} — {e}")
        raise

def append_rows(df: pd.DataFrame) -> None:
    try:
        _conn.register("new_rows", df)
        _conn.execute("INSERT INTO telemetry SELECT * FROM new_rows")
        logger.info(f"Appended {len(df)} synthetic rows")
    except Exception as e:
        logger.error(f"DuckDB append failed: {e}")
        raise
```

### 4.4 Redis Cache Layer

```python
# backend/app/cache.py
import redis.asyncio as redis
import pickle
import logging
from app.config import REDIS_URL, TTL_KPI, TTL_ANOMALY, TTL_SHAP, TTL_FORECAST

logger = logging.getLogger(__name__)
_client: redis.Redis = None

def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(REDIS_URL, decode_responses=False)
    return _client

async def get(key: str):
    try:
        raw = await get_client().get(key)
        return pickle.loads(raw) if raw else None
    except Exception as e:
        logger.error(f"Redis GET failed key={key}: {e}")
        return None

async def set(key: str, value, ttl: int) -> None:
    try:
        await get_client().setex(key, ttl, pickle.dumps(value))
    except Exception as e:
        logger.error(f"Redis SET failed key={key}: {e}")

async def invalidate_pattern(pattern: str) -> None:
    try:
        client = get_client()
        keys = [k async for k in client.scan_iter(pattern)]
        if keys:
            await client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} Redis keys matching {pattern}")
    except Exception as e:
        logger.error(f"Redis invalidation failed pattern={pattern}: {e}")
```

**Cache key registry:**

| Key | Content | TTL | Invalidated on |
|---|---|---|---|
| `kpis:fleet` | Fleet-wide KPI aggregations | 30s | Refresh |
| `workload:heatmap` | task_type × metric matrix | 30s | Refresh |
| `anomalies:behavioral` | Top behavioral anomalies per cohort | 60s | Refresh |
| `anomalies:waste` | Energy waste flagged VMs | 60s | Refresh |
| `shap:vm:{id}` | SHAP values for a specific VM | 60s | Refresh |
| `model:efficiency` | Serialized XGBoost efficiency model | Until refresh | Refresh |
| `model:anomaly:{task_type}` | Serialized IsolationForest per cohort | Until refresh | Refresh |
| `model:completion` | Serialized LightGBM completion model | Until refresh | Refresh |
| `forecast:24h` | 24-hour power forecast | 60s | Refresh |
| `forecast:7day` | 7-day power forecast + CI | 60s | Refresh |

### 4.5 Config

```python
# backend/app/config.py

REDIS_URL               = "redis://localhost:6379"
CSV_PATH                = "data/telemetry.csv"

# Synthetic generation
BATCH_SIZE              = 75

# Nullable columns requiring imputation
NULLABLE_COLS = [
    "cpu_usage", "memory_usage", "network_traffic",
    "power_consumption", "num_executed_instructions", "execution_time"
]

NUMERIC_COLS = NULLABLE_COLS + ["energy_efficiency"]

# Redis TTLs (seconds)
TTL_KPI                 = 30
TTL_WORKLOAD            = 30
TTL_ANOMALY             = 60
TTL_SHAP                = 60
TTL_FORECAST            = 60

# Anomaly thresholds
ANOMALY_THRESHOLD             = 0.7
WASTE_POWER_THRESHOLD         = 250.0   # kW — code agent may adjust after EDA
SHAP_PRECOMPUTE_N             = 10

# Alert thresholds
CPU_ALERT_PCT                 = 90.0
MEMORY_ALERT_PCT              = 90.0
EFFICIENCY_LOW_THRESHOLD      = 0.2    # below this = low efficiency alert
WASTE_FLEET_PCT_ALERT         = 0.15   # >15% of VMs wasting energy = fleet alert

# ML model params
ISOLATION_FOREST_CONTAMINATION = 0.05
ISOLATION_FOREST_N_ESTIMATORS  = 100
XGBOOST_N_ESTIMATORS           = 200
XGBOOST_LEARNING_RATE          = 0.05
LIGHTGBM_N_ESTIMATORS          = 150
LIGHTGBM_LEARNING_RATE         = 0.05

# Forecast
FORECAST_HOURS          = 24
FORECAST_DAYS           = 7

# CORS
CORS_ORIGINS            = ["https://your-vercel-app.vercel.app"]
```

---

## 5. ML Engine

### 5.1 Model 1 — Energy Efficiency Predictor

**Goal:** Predict `energy_efficiency` per VM record from resource utilization features. SHAP explains which features drive high or low efficiency per VM.

**Algorithm:** XGBoost Regressor

**Features:**
- `cpu_usage`, `memory_usage`, `network_traffic`, `power_consumption`
- `num_executed_instructions`, `execution_time`
- `task_type` (label-encoded), `task_priority` (label-encoded)
- `task_status` (label-encoded) — a waiting task with high power draw is a strong negative efficiency predictor

**Target:** `energy_efficiency` (float 0–1)

**Output:** Predicted efficiency score per VM + SHAP feature attributions

```python
# backend/app/ml/efficiency.py
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

EFFICIENCY_FEATURES = [
    "cpu_usage", "memory_usage", "network_traffic", "power_consumption",
    "num_executed_instructions", "execution_time",
    "task_type_enc", "task_priority_enc", "task_status_enc"
]

def train_efficiency_model(df: pd.DataFrame) -> dict:
    try:
        df = df.copy()
        encoders = {}
        for col in ["task_type", "task_priority", "task_status"]:
            le = LabelEncoder()
            df[f"{col}_enc"] = le.fit_transform(df[col].astype(str))
            encoders[col] = le

        X = df[EFFICIENCY_FEATURES].fillna(0)
        y = df["energy_efficiency"].fillna(df["energy_efficiency"].median())

        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1, random_state=42)

        model = XGBRegressor(
            n_estimators=XGBOOST_N_ESTIMATORS,
            learning_rate=XGBOOST_LEARNING_RATE,
            tree_method="hist",
            random_state=42
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        mae = np.mean(np.abs(model.predict(X_val) - y_val.values))
        logger.info(f"Efficiency model trained — val MAE: {mae:.4f}")
        return {"model": model, "encoders": encoders, "mae": float(mae)}
    except Exception as e:
        logger.error(f"Efficiency model training failed: {e}")
        raise
```

### 5.2 Model 2 — Compute Value Scorer

**Goal:** Rank every VM by the ratio of useful computational output to energy consumed. Surfaces underperforming VMs that consume high resources but produce low throughput.

**Method:** Fully deterministic derived metric — no training required. Computed in the pipeline (`Section 4.2`) and stored in DuckDB. The scorer provides aggregation and ranking queries only.

```python
# backend/app/ml/compute_value.py
import pandas as pd
import logging
from app.database import query

logger = logging.getLogger(__name__)

def get_top_vms_by_compute_value(limit: int = 50) -> pd.DataFrame:
    try:
        sql = f"""
            SELECT
                vm_id,
                task_type,
                task_priority,
                ROUND(AVG(compute_value), 4)      AS avg_compute_value,
                ROUND(AVG(energy_efficiency), 4)  AS avg_efficiency,
                ROUND(AVG(throughput), 2)         AS avg_throughput,
                ROUND(AVG(power_consumption), 2)  AS avg_power,
                SUM(is_wasting_energy)             AS waste_events,
                COUNT(*)                           AS record_count
            FROM telemetry
            WHERE compute_value IS NOT NULL
            GROUP BY vm_id, task_type, task_priority
            ORDER BY avg_compute_value DESC
            LIMIT {limit}
        """
        return query(sql)
    except Exception as e:
        logger.error(f"Compute value query failed: {e}")
        raise

def get_bottom_vms_by_compute_value(limit: int = 50) -> pd.DataFrame:
    try:
        sql = f"""
            SELECT
                vm_id,
                task_type,
                task_priority,
                ROUND(AVG(compute_value), 4)      AS avg_compute_value,
                ROUND(AVG(energy_efficiency), 4)  AS avg_efficiency,
                SUM(is_wasting_energy)             AS waste_events,
                ROUND(AVG(power_consumption), 2)  AS avg_power
            FROM telemetry
            WHERE compute_value IS NOT NULL
            GROUP BY vm_id, task_type, task_priority
            ORDER BY avg_compute_value ASC
            LIMIT {limit}
        """
        return query(sql)
    except Exception as e:
        logger.error(f"Bottom VM query failed: {e}")
        raise
```

### 5.3 Model 3 — Anomaly Detection

**Two anomaly types, surfaced separately in the UI:**

**Type A — Behavioral Anomaly (IsolationForest per task_type cohort)**

Train a separate IsolationForest on each `task_type` cohort (io, network, compute). Anomalous means anomalous relative to peers doing the same class of work. A compute VM at 95% CPU is normal; an io VM at 95% CPU is anomalous.

**Type B — Energy Waste Anomaly (rule-based)**

`is_wasting_energy = 1` where `task_status == "waiting"` and `power_consumption > WASTE_POWER_THRESHOLD`. This is already computed at pipeline time. The anomaly router aggregates waste events per VM and flags VMs exceeding a waste frequency threshold.

**[CODE AGENT DECIDES]** — whether to surface both types simultaneously or sequentially in the UI is determined after inspecting the actual waste event rate in the data:

```python
# Run this analysis first
waste_rate = df["is_wasting_energy"].mean()
logger.info(f"Fleet waste rate: {waste_rate:.2%}")
# If waste_rate < 0.01 (less than 1%), waste anomalies are too rare to surface prominently
# If waste_rate > 0.05 (more than 5%), it becomes a fleet-level alert, not a per-VM one
```

```python
# backend/app/ml/anomaly.py
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import logging
from app.config import ISOLATION_FOREST_CONTAMINATION, ISOLATION_FOREST_N_ESTIMATORS, ANOMALY_THRESHOLD

logger = logging.getLogger(__name__)

ANOMALY_FEATURES = [
    "cpu_usage", "memory_usage", "network_traffic",
    "power_consumption", "num_executed_instructions",
    "execution_time", "energy_efficiency", "compute_value"
]

def train_anomaly_models(df: pd.DataFrame) -> dict:
    try:
        models = {}
        for task_type in df["task_type"].unique():
            cohort = df[df["task_type"] == task_type][ANOMALY_FEATURES].fillna(0)
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(cohort)
            model = IsolationForest(
                n_estimators=ISOLATION_FOREST_N_ESTIMATORS,
                contamination=ISOLATION_FOREST_CONTAMINATION,
                random_state=42
            )
            model.fit(X_scaled)
            models[task_type] = {"model": model, "scaler": scaler}
            logger.info(f"IsolationForest trained for task_type={task_type}, n={len(cohort)}")
        return models
    except Exception as e:
        logger.error(f"Anomaly model training failed: {e}")
        raise

def score_vms(df: pd.DataFrame, models: dict) -> pd.DataFrame:
    try:
        results = []
        for task_type, artifact in models.items():
            cohort = df[df["task_type"] == task_type].copy()
            X = cohort[ANOMALY_FEATURES].fillna(0)
            X_scaled = artifact["scaler"].transform(X)
            raw = artifact["model"].score_samples(X_scaled)
            cohort["behavioral_anomaly_score"] = 1 - (
                (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
            )
            cohort["is_behavioral_anomaly"] = cohort["behavioral_anomaly_score"] > ANOMALY_THRESHOLD
            results.append(cohort)
        return pd.concat(results, ignore_index=True)
    except Exception as e:
        logger.error(f"VM scoring failed: {e}")
        raise
```

### 5.4 Model 4 — Task Completion Predictor

**Goal:** Predict whether a currently `running` task will complete or transition to `waiting` (stuck), based on current resource utilization and task metadata.

**Algorithm:** LightGBM Classifier (binary: `completed` vs `waiting` as outcome classes, trained on historical records where status is known)

**Features:** `cpu_usage`, `memory_usage`, `network_traffic`, `power_consumption`, `execution_time`, `task_type` (encoded), `task_priority` (encoded)

**Target:** Binary — will this task complete (1) or get stuck in waiting (0)

**Output per VM:** `completion_probability` (float 0–1), displayed in VM detail card

```python
# backend/app/ml/completion.py
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
import pandas as pd
import numpy as np
import logging
from app.config import LIGHTGBM_N_ESTIMATORS, LIGHTGBM_LEARNING_RATE

logger = logging.getLogger(__name__)

COMPLETION_FEATURES = [
    "cpu_usage", "memory_usage", "network_traffic",
    "power_consumption", "execution_time",
    "task_type_enc", "task_priority_enc"
]

def train_completion_model(df: pd.DataFrame) -> dict:
    try:
        df = df.copy()
        encoders = {}
        for col in ["task_type", "task_priority"]:
            le = LabelEncoder()
            df[f"{col}_enc"] = le.fit_transform(df[col].astype(str))
            encoders[col] = le

        # Train on completed vs waiting — exclude running (unknown outcome)
        train_df = df[df["task_status"].isin(["completed", "waiting"])].copy()
        train_df["target"] = (train_df["task_status"] == "completed").astype(int)

        X = train_df[COMPLETION_FEATURES].fillna(0)
        y = train_df["target"]

        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1, random_state=42)

        model = lgb.LGBMClassifier(
            n_estimators=LIGHTGBM_N_ESTIMATORS,
            learning_rate=LIGHTGBM_LEARNING_RATE,
            random_state=42,
            verbose=-1
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)])
        auc = roc_auc_score(y_val, model.predict_proba(X_val)[:, 1])
        logger.info(f"Completion model trained — val AUC: {auc:.4f}")
        return {"model": model, "encoders": encoders, "auc": float(auc)}
    except Exception as e:
        logger.error(f"Completion model training failed: {e}")
        raise
```

### 5.5 SHAP Explainability

SHAP TreeExplainer is run on both the XGBoost efficiency model and the LightGBM completion model — both are tree-based and natively supported. Precomputed at refresh time for the top `SHAP_PRECOMPUTE_N` anomalous VMs. Stored in Redis under `shap:vm:{vm_id}`.

```python
# backend/app/ml/explainability.py
import shap
import pandas as pd
import numpy as np
import logging
from app.config import SHAP_PRECOMPUTE_N

logger = logging.getLogger(__name__)

def compute_shap_for_vm(vm_record: pd.DataFrame, efficiency_artifact: dict) -> dict:
    try:
        model = efficiency_artifact["model"]
        encoders = efficiency_artifact["encoders"]
        df = vm_record.copy()
        for col, le in encoders.items():
            df[f"{col}_enc"] = le.transform(df[col].astype(str))

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(df[EFFICIENCY_FEATURES].fillna(0))
        base_value = float(explainer.expected_value)
        features = []
        for i, fname in enumerate(EFFICIENCY_FEATURES):
            features.append({
                "name": fname,
                "value": float(df[fname].iloc[0]) if fname in df.columns else 0.0,
                "shap_impact": float(shap_values[0][i])
            })
        features.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)
        return {
            "base_value": base_value,
            "final_value": base_value + sum(f["shap_impact"] for f in features),
            "features": features
        }
    except Exception as e:
        logger.error(f"SHAP computation failed for VM: {e}")
        raise

def compute_roc_data(completion_artifact: dict, val_df: pd.DataFrame) -> dict:
    try:
        from sklearn.metrics import roc_curve
        model = completion_artifact["model"]
        y_score = model.predict_proba(val_df[COMPLETION_FEATURES].fillna(0))[:, 1]
        fpr, tpr, _ = roc_curve(val_df["target"], y_score)
        from sklearn.metrics import roc_auc_score
        auc = roc_auc_score(val_df["target"], y_score)
        return {
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
            "auc": float(auc)
        }
    except Exception as e:
        logger.error(f"ROC computation failed: {e}")
        raise
```

### 5.6 Power Consumption Forecasting

Aggregate `power_consumption` across all VMs per hour bucket in DuckDB, then run two forecast models on the resulting time-series.

**24h model:** XGBoost Regressor with lag features (1h, 6h, 24h), `hour_of_day`, `day_of_week`, `task_type` distribution ratio per hour.

**7-day model:** Linear Regression with Fourier seasonality terms (sin/cos of day index) to capture weekly power cycles.

Both models return predictions with 95% confidence intervals derived from training residual standard deviation.

---

## 6. REST API Contract

Base URL: `https://api.your-railway-app.up.railway.app`  
All responses: `Content-Type: application/json`  
All error responses: `{ "detail": "<message>", "code": "<error_code>" }`

---

### POST /refresh

Generates synthetic rows, retrains all models, recomputes SHAP, invalidates Redis.

**Response `200`:**
```json
{
  "rows_added": 75,
  "models_retrained": ["efficiency", "anomaly_io", "anomaly_network", "anomaly_compute", "completion"],
  "cache_invalidated": true,
  "timestamp": "2023-07-20T14:32:00Z"
}
```

---

### GET /kpis

Fleet-wide KPI summary for top bar and sidebar cards.

**Response `200`:**
```json
{
  "avg_energy_efficiency": 0.54,
  "avg_compute_value": 42.3,
  "vms_wasting_energy": 187,
  "vms_wasting_energy_pct": 12.4,
  "behavioral_anomalies": 89,
  "fleet_power_kw": 28471.3,
  "total_vm_records": 1799361,
  "last_updated": "2023-07-20T14:32:00Z"
}
```

---

### GET /workload/heatmap

task_type × metric aggregation matrix.

**Response `200`:**
```json
{
  "task_types": ["io", "network", "compute"],
  "metrics": ["cpu_usage", "memory_usage", "network_traffic", "power_consumption", "energy_efficiency", "compute_value"],
  "matrix": {
    "io":      { "cpu_usage": 54.2, "memory_usage": 61.3, "network_traffic": 480.1, "power_consumption": 241.3, "energy_efficiency": 0.48, "compute_value": 38.2 },
    "network": { "cpu_usage": 48.7, "memory_usage": 55.8, "network_traffic": 720.4, "power_consumption": 198.7, "energy_efficiency": 0.51, "compute_value": 41.6 },
    "compute": { "cpu_usage": 78.1, "memory_usage": 72.4, "network_traffic": 210.3, "power_consumption": 312.8, "energy_efficiency": 0.61, "compute_value": 58.9 }
  }
}
```

---

### GET /performance/timeseries

Multi-metric time-series aggregated across all VMs.

**Query params:**
- `metric` (required): one of `cpu_usage`, `memory_usage`, `network_traffic`, `power_consumption`, `energy_efficiency`, `compute_value`
- `task_type` (optional): filter to cohort
- `granularity` (optional): `hour` (default) or `day`
- `limit` (optional): integer, default 720

**Response `200`:**
```json
{
  "metric": "energy_efficiency",
  "granularity": "hour",
  "series": [
    { "timestamp": "2023-01-01T00:00:00Z", "value": 0.52 },
    { "timestamp": "2023-01-01T01:00:00Z", "value": 0.55 }
  ]
}
```

---

### GET /performance/surface3d

task_type × time × energy_efficiency for the Plotly 3D surface.

**Response `200`:**
```json
{
  "x_axis": "timestamp",
  "y_axis": "task_type",
  "z_axis": "energy_efficiency",
  "x": ["2023-01-01T00:00:00Z", "2023-01-01T01:00:00Z"],
  "y": ["io", "network", "compute"],
  "z": [
    [0.48, 0.51, 0.47],
    [0.52, 0.55, 0.53]
  ]
}
```

---

### GET /vms

Top and bottom VMs by compute value score.

**Query params:**
- `rank` (required): `top` or `bottom`
- `limit` (optional): default 50
- `task_type` (optional): filter by cohort

**Response `200`:**
```json
{
  "rank": "top",
  "vms": [
    {
      "vm_id": "c5215826-6237-4a33-9312-72c1df909881",
      "task_type": "compute",
      "task_priority": "high",
      "avg_compute_value": 87.4,
      "avg_efficiency": 0.82,
      "avg_throughput": 106.7,
      "avg_power": 312.4,
      "waste_events": 0,
      "record_count": 1847
    }
  ]
}
```

---

### GET /anomalies

Returns behavioral and energy waste anomalies.

**Query params:**
- `type` (required): `behavioral`, `waste`, or `all`
- `task_type` (optional): filter by cohort
- `limit` (optional): default 50

**Response `200`:**
```json
{
  "behavioral": [
    {
      "vm_id": "2e55abc3-5bad-46cb-b445-a577f5e9bf2a",
      "task_type": "io",
      "task_priority": "medium",
      "behavioral_anomaly_score": 0.84,
      "is_behavioral_anomaly": true,
      "avg_cpu_usage": 92.7,
      "avg_power_consumption": 420.1,
      "avg_energy_efficiency": 0.19
    }
  ],
  "waste": [
    {
      "vm_id": "e672e32f-c134-4fbc-992b-34eb63bef6bf",
      "task_type": "compute",
      "task_priority": "high",
      "waste_events": 312,
      "total_wasted_power": 87340.2,
      "pct_time_waiting": 0.68
    }
  ]
}
```

---

### GET /anomalies/{vm_id}/shap

SHAP waterfall values for a specific VM's energy efficiency prediction.

**Response `200`:**
```json
{
  "vm_id": "2e55abc3-5bad-46cb-b445-a577f5e9bf2a",
  "base_value": 0.54,
  "final_value": 0.19,
  "features": [
    { "name": "task_status_enc",            "value": 2.0,   "shap_impact": -0.21 },
    { "name": "power_consumption",           "value": 420.1, "shap_impact": -0.18 },
    { "name": "num_executed_instructions",  "value": 1240.0,"shap_impact": -0.09 },
    { "name": "cpu_usage",                   "value": 92.7,  "shap_impact": 0.04  },
    { "name": "execution_time",              "value": 88.3,  "shap_impact": -0.03 }
  ]
}
```

---

### GET /anomalies/roc

ROC curve data for the task completion predictor.

**Response `200`:**
```json
{
  "fpr": [0.0, 0.03, 0.09, 0.22, 1.0],
  "tpr": [0.0, 0.44, 0.81, 0.93, 1.0],
  "auc": 0.91,
  "model": "completion_predictor"
}
```

---

### GET /forecast/24h

24-hour fleet power consumption forecast.

**Response `200`:**
```json
{
  "horizon_hours": 24,
  "series": [
    {
      "timestamp": "2023-07-20T15:00:00Z",
      "predicted_kw": 29104.2,
      "ci_lower": 27800.1,
      "ci_upper": 30408.3
    }
  ],
  "mae": 412.3
}
```

---

### GET /forecast/7day

7-day daily fleet power forecast.

**Response `200`:**
```json
{
  "horizon_days": 7,
  "series": [
    {
      "date": "2023-07-21",
      "predicted_kw": 682000.0,
      "ci_lower": 651000.0,
      "ci_upper": 713000.0
    }
  ],
  "peak_day": "2023-07-24",
  "peak_predicted_kw": 712000.0,
  "alert": true,
  "alert_message": "Predicted peak exceeds threshold on 2023-07-24. Review VM scheduling."
}
```

---

### GET /topology

VM network graph data for D3 force-directed layout.

**Aggregation strategy:** [CODE AGENT DECIDES]

The code agent must run the following analysis before implementing this endpoint:

```python
vm_count = df["vm_id"].nunique()
compute_value_spread = df.groupby("vm_id")["compute_value"].mean().describe()
logger.info(f"Unique VMs: {vm_count}")
logger.info(f"Compute value spread:\n{compute_value_spread}")
```

Based on output, choose one:
- **Option A:** If `vm_count` <= 500 — render individual VMs as nodes, sized by `avg_compute_value`, colored by anomaly state, clustered by `task_type`
- **Option B:** If `vm_count` > 500 — render top 100 VMs by `avg_compute_value` as nodes with same encoding
- **Option C:** If `vm_count` is extremely high (> 10,000) — render `task_type` cluster nodes only (3 nodes), edges represent inter-cohort resource contention co-occurrence

**Response `200`:**
```json
{
  "aggregation": "top_100_by_compute_value",
  "nodes": [
    {
      "id": "c5215826-6237-4a33-9312-72c1df909881",
      "type": "vm",
      "task_type": "compute",
      "task_priority": "high",
      "avg_compute_value": 87.4,
      "avg_efficiency": 0.82,
      "behavioral_anomaly_score": 0.12,
      "is_wasting_energy": false,
      "alert_level": "none"
    }
  ],
  "edges": [
    {
      "source": "c5215826-6237-4a33-9312-72c1df909881",
      "target": "2e55abc3-5bad-46cb-b445-a577f5e9bf2a",
      "weight": 0.74
    }
  ]
}
```

---

### GET /explorer/query

Templated DuckDB query execution.

**Query params:**
- `template`: one of `least_efficient_vms`, `highest_power_vms`, `most_wasteful_vms`, `top_compute_value_vms`
- `limit` (optional): default 20

**Response `200`:**
```json
{
  "template": "most_wasteful_vms",
  "sql": "SELECT vm_id, task_type, SUM(is_wasting_energy) as waste_events, ROUND(AVG(power_consumption),2) as avg_power FROM telemetry WHERE is_wasting_energy = 1 GROUP BY vm_id, task_type ORDER BY waste_events DESC LIMIT 20",
  "columns": ["vm_id", "task_type", "waste_events", "avg_power"],
  "rows": [
    { "vm_id": "e672e32f-...", "task_type": "compute", "waste_events": 312, "avg_power": 418.2 }
  ],
  "row_count": 20
}
```

**DuckDB query templates:**

```python
QUERY_TEMPLATES = {
    "least_efficient_vms":   "SELECT vm_id, task_type, ROUND(AVG(energy_efficiency),4) as avg_efficiency, ROUND(AVG(power_consumption),2) as avg_power FROM telemetry GROUP BY vm_id, task_type ORDER BY avg_efficiency ASC LIMIT {limit}",
    "highest_power_vms":     "SELECT vm_id, task_type, ROUND(AVG(power_consumption),2) as avg_power, ROUND(AVG(cpu_usage),2) as avg_cpu FROM telemetry GROUP BY vm_id, task_type ORDER BY avg_power DESC LIMIT {limit}",
    "most_wasteful_vms":     "SELECT vm_id, task_type, SUM(is_wasting_energy) as waste_events, ROUND(AVG(power_consumption),2) as avg_power FROM telemetry WHERE is_wasting_energy = 1 GROUP BY vm_id, task_type ORDER BY waste_events DESC LIMIT {limit}",
    "top_compute_value_vms": "SELECT vm_id, task_type, ROUND(AVG(compute_value),4) as avg_compute_value, ROUND(AVG(energy_efficiency),4) as avg_efficiency FROM telemetry WHERE compute_value IS NOT NULL GROUP BY vm_id, task_type ORDER BY avg_compute_value DESC LIMIT {limit}",
}
```

---

## 7. Frontend Design

### 7.1 Layout Architecture

Fixed cockpit layout — no navigation tabs that hide global context.

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOP BAR — Alert queue (waste alerts / anomalies / efficiency low)   │  48px fixed
│            Last refreshed timestamp │ [Refresh Telemetry]            │
├───────────┬──────────────────────────────────────────────────────────┤
│           │                                                          │
│  SIDEBAR  │              MAIN CANVAS                                 │
│  240px    │              (view changes here)                         │
│  fixed    │                                                          │
│           │                                                          │
│  Fleet    │                                                          │
│  Health   │                                                          │
│  ───────  │                                                          │
│  KPI      │                                                          │
│  cards    │                                                          │
│  ───────  │                                                          │
│  Task     │                                                          │
│  type     │                                                          │
│  rings    │                                                          │
│  ───────  │                                                          │
│  Nav      │                                                          │
│  links    │                                                          │
└───────────┴──────────────────────────────────────────────────────────┘
```

**Sidebar content (always visible):**
- Fleet energy efficiency score (large, color-coded green/yellow/red)
- VMs wasting energy count + percentage of fleet
- Behavioral anomaly count
- KPI sparklines: avg efficiency, fleet power draw, compute value trend
- Task type rings (io / network / compute) showing avg efficiency per cohort
- Navigation links to each main canvas view

**Top bar content (always visible):**
- Scrolling alert queue: energy waste alerts, behavioral anomaly alerts, low efficiency alerts
- Last refreshed timestamp
- Refresh button — triggers `POST /refresh` then re-polls all active endpoints

### 7.2 Main Canvas Views

| View | Primary Charts | Libraries |
|---|---|---|
| Overview | KPI cards, fleet efficiency trend, workload heatmap | Recharts |
| Workload | Multi-metric time-series, 3D efficiency surface, task status breakdown | Recharts + Plotly |
| Anomaly | Behavioral anomaly scatter, energy waste timeline, SHAP waterfall, ROC curve, topology graph | Plotly + D3 |
| Forecast | 24h power forecast, 7-day forecast with CI, peak alert | Recharts + Plotly |
| Explorer | Filterable VM table, SQL template results | Plain React table |

### 7.3 VM Detail Card

Clicking any VM in the topology graph or anomaly list opens a detail card with four independent scores — never collapsed:

```
VM: c5215826-6237-4a33-9312-72c1df909881     task_type: compute   [HIGH PRIORITY]
──────────────────────────────────────────────────────────────────────────────────
Compute Value Score      87.4          ████████▉  EXCELLENT
Energy Efficiency        0.82 / 1.00   ████████▎  GOOD
Behavioral Anomaly       0.12 / 1.00   █▏         NORMAL
Task Completion Prob.    0.91          █████████▏ LIKELY TO COMPLETE
──────────────────────────────────────────────────────────────────────────────────
cpu_usage: 78.1%   memory: 72.4%   power: 312.4   network_traffic: 210.3
num_executed_instructions: 9008   execution_time: 60.2s
──────────────────────────────────────────────────────────────────────────────────
[View SHAP Breakdown]
```

### 7.4 Polling Strategy

```typescript
// frontend/src/hooks/usePolling.ts
import { useEffect, useRef } from "react";

export function usePolling(
  fetchFn: () => Promise<void>,
  intervalMs: number,
  enabled: boolean = true
) {
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetchFn();
    ref.current = setInterval(fetchFn, intervalMs);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [enabled, intervalMs]);
}
```

Default polling intervals: KPIs every 30s, anomalies every 60s, topology every 60s.

---

## 8. Deployment

### 8.1 Frontend — Vercel

```json
// frontend/vercel.json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_BASE_URL": "https://your-app.up.railway.app"
  }
}
```

### 8.2 Backend — Railway

```toml
# backend/railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
restartPolicyType = "on_failure"
```

**Memory warning:** 1.8M rows loaded into DuckDB will require a Railway instance with at least 2GB RAM. The code agent must verify dtype downcasting reduces the in-memory footprint sufficiently before confirming the free tier is viable. If not, document the required paid tier in `PROGRESS.md`.

### 8.3 Environment Variables

**Backend (Railway):**
```
REDIS_URL=redis://...
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

**Frontend (Vercel):**
```
VITE_API_BASE_URL=https://your-app.up.railway.app
```

---

## 9. Non-Functional Requirements

| Concern | Target | Implementation |
|---|---|---|
| API response time | < 100ms for cached endpoints | Redis TTL caching on all hot paths |
| Model retraining on refresh | < 1s total | XGBoost hist method, IsolationForest 100 estimators, LightGBM fast mode |
| Synthetic generation | < 100ms per batch | Vectorized numpy, no row iteration |
| DuckDB query time | < 50ms | In-memory, filter pushdown on task_type and timestamp |
| Memory footprint | < 2GB | float32 downcasting across all float columns |
| Frontend initial load | < 2s | Code splitting per view, lazy load Plotly and D3 |
| CORS | Frontend origin only | FastAPI CORSMiddleware with explicit origin whitelist |
| Null safety | No crash on null input | fillna(0) before every model inference call |

---

## 10. Code Agent Decision Log

All items below are explicitly deferred to the code agent. For each, the agent must log the analysis result and chosen option to `PROGRESS.md` before implementing.

| Decision | Analysis to Run | Candidate Options |
|---|---|---|
| Null handling strategy | `df[NULLABLE_COLS].isnull().sum() / len(df)` per column and per task_type cohort | A: per task_type median, B: global median, C: drop rows |
| Anomaly UI presentation | `df["is_wasting_energy"].mean()` — check fleet waste rate | Surface both types / behavioral only / waste only depending on rate |
| Synthetic generator approach | `np.linalg.matrix_rank(cov_matrix)` per cohort | A: per-cohort covariance, B: global covariance |
| D3 topology aggregation | `df["vm_id"].nunique()` and compute_value spread | A: all VMs, B: top 100 by compute_value, C: task_type cluster nodes only |
| WASTE_POWER_THRESHOLD value | `df[df["task_status"]=="waiting"]["power_consumption"].describe()` | Set threshold at 75th percentile of waiting-state power draw |
| Railway memory tier | Load CSV, measure `df.memory_usage(deep=True).sum()` after downcasting | Free tier (512MB) vs Starter (2GB) vs Pro |

---