# Cloud VM Intelligence Cockpit

A production-grade, real-time cloud VM monitoring and intelligence dashboard centered on **energy efficiency** as the primary operational metric. The system ingests a 2M-row VM telemetry dataset, enriches it with statistically faithful synthetic data on each user-triggered refresh, runs four ML models per VM cohort, and surfaces results through a cockpit-style React frontend backed by a FastAPI service layer.

> **Central narrative**: How much useful computational work is each VM delivering per unit of energy consumed — and which VMs are wasting power while doing nothing?

---

## Dataset

**Cloud Computing Performance Metrics** (Kaggle)  
Author: abdurraziq01  
URL: https://www.kaggle.com/datasets/abdurraziq01/cloud-computing-performance-metrics  

| Attribute | Value |
|---|---|
| Rows | 2,000,000 |
| Columns | 12 |
| Time span | 2022-12-31 to 2023-07-20 (~7 months) |
| Unique VMs | ~1,799,362 |

| Column | Type | Description |
|---|---|---|
| `vm_id` | UUID | VM identifier |
| `timestamp` | datetime | Observation time |
| `cpu_usage` | float 0–100 | CPU load % |
| `memory_usage` | float 0–100 | RAM usage % |
| `network_traffic` | float 0–1000 | Network throughput |
| `power_consumption` | float 0–500 | Energy draw |
| `num_executed_instructions` | int 0–10000 | Computational output |
| `execution_time` | float 0–100 | Task duration |
| `energy_efficiency` | float 0–1 | Pre-computed efficiency ratio |
| `task_type` | enum | `io` / `network` / `compute` |
| `task_priority` | enum | `low` / `medium` / `high` |
| `task_status` | enum | `waiting` / `running` / `completed` |

**Derived columns (computed at pipeline time):**
- `throughput` = `num_executed_instructions / execution_time`
- `compute_value` = `throughput × energy_efficiency` — primary VM ranking metric
- `is_wasting_energy` = 1 where `task_status == "waiting"` AND `power_consumption > 375.14`

### Downloading the Dataset

**Option A — kagglehub (recommended for CI/local dev):**
```python
# scripts/download_data.py
import kagglehub
path = kagglehub.dataset_download("abdurraziq01/cloud-computing-performance-metrics")
```

**Option B — curl:**
```bash
curl -L -o backend/data/telemetry.zip \
  https://www.kaggle.com/api/v1/datasets/download/abdurraziq01/cloud-computing-performance-metrics
unzip backend/data/telemetry.zip -d backend/data/ && mv backend/data/*.csv backend/data/telemetry.csv
```

> The CSV is **not committed** to the repo (338MB). Place it at `backend/data/telemetry.csv` before starting the server. Run `python scripts/download_data.py` to automate this.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                          │
│  React + TypeScript                                               │
│  ├── Recharts     (time-series, bar, area, sparklines)           │
│  ├── Plotly.js    (3D efficiency surface, SHAP waterfall, ROC)   │
│  └── D3.js        (VM topology cluster graph)                    │
└─────────────────────────────┬────────────────────────────────────┘
                              │  REST (JSON)  GET / POST /refresh
┌─────────────────────────────▼────────────────────────────────────┐
│                        BACKEND (Render)                           │
│  FastAPI + Python                                                 │
│  ├── Routers      (kpis, workload, performance, vms, anomalies,  │
│  │                 forecast, topology, explorer, refresh)        │
│  ├── ML Engine    (XGBoost efficiency, compute value scorer,     │
│  │                 IsolationForest per cohort, LightGBM          │
│  │                 completion predictor, SHAP)                   │
│  ├── Data Layer   (DuckDB in-memory, data pipeline,             │
│  │                 null handling, derived metrics)               │
│  └── Cache Layer  (Redis — hot queries + model artifacts)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
cloud-vm-cockpit/
├── frontend/                      # React + TypeScript (Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/            # TopBar, Sidebar, MainCanvas
│       │   ├── views/             # Overview, Workload, Anomaly, Forecast, Explorer
│       │   ├── charts/            # MetricTimeSeries, WorkloadHeatmap, EfficiencySurface3D,
│       │   │                      #   ShapWaterfall, RocCurve, TopologyGraph, ForecastChart
│       │   └── cards/             # KpiCard, VmDetailCard
│       ├── hooks/                 # usePolling, useRefresh
│       ├── api/                   # client.ts — typed fetch wrappers
│       ├── store/                 # dashboardStore.ts — Zustand
│       └── types/                 # index.ts — all API response interfaces
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI init + lifespan handler
│   │   ├── config.py              # all constants, TTLs, thresholds
│   │   ├── pipeline.py            # null handling + derived metrics + dtype downcast
│   │   ├── database.py            # DuckDB singleton
│   │   ├── cache.py               # Redis client
│   │   ├── synthetic.py           # per-cohort multivariate generator
│   │   ├── ml/
│   │   │   ├── efficiency.py      # XGBoost energy efficiency predictor
│   │   │   ├── compute_value.py   # throughput + compute value scorer
│   │   │   ├── anomaly.py         # IsolationForest per task_type cohort
│   │   │   ├── completion.py      # LightGBM task completion predictor
│   │   │   ├── forecast.py        # 24h XGBoost + 7-day linear forecast
│   │   │   └── explainability.py  # SHAP + ROC curve
│   │   └── routers/               # one file per API endpoint group
│   ├── data/                      # telemetry.csv (download via scripts/download_data.py)
│   ├── requirements.txt
│   └── render.yaml                # Render deployment config
├── scripts/
│   └── download_data.py           # kagglehub dataset downloader
├── HLD.md                         # high-level design document (source of truth)
├── PROGRESS.md                    # build progress tracker
└── README.md
```

---

## ML Models

| Model | Algorithm | Target | Output |
|---|---|---|---|
| Energy Efficiency Predictor | XGBoost Regressor | `energy_efficiency` (0–1) | Predicted efficiency + SHAP feature attributions |
| Compute Value Scorer | DuckDB aggregation | n/a (deterministic) | `avg_compute_value`, `avg_throughput` per cohort |
| Anomaly Detector | IsolationForest × 3 cohorts | Behavioral anomaly | `behavioral_anomaly_score` (0–1), `is_behavioral_anomaly` |
| Task Completion Predictor | LightGBM Classifier | Will task complete? | `completion_probability` (0–1), ROC curve |
| Power Forecasting | XGBoost (24h) + Linear (7-day) | Fleet power draw | Predicted kW + 95% confidence intervals |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns `rows_loaded`, `memory_mb` |
| `POST` | `/refresh` | Generate synthetic rows, retrain models, invalidate cache |
| `GET` | `/kpis` | Fleet-wide KPI aggregations |
| `GET` | `/workload/heatmap` | task_type × metric aggregation matrix |
| `GET` | `/performance/timeseries` | Multi-metric time-series (filterable by task_type) |
| `GET` | `/performance/surface3d` | task_type × time × energy_efficiency for 3D surface |
| `GET` | `/vms` | Top / bottom VMs by compute value (cohort-aggregated) |
| `GET` | `/anomalies` | Behavioral and energy waste anomalies |
| `GET` | `/anomalies/{vm_id}/shap` | SHAP waterfall for a specific VM |
| `GET` | `/anomalies/roc` | ROC curve for task completion predictor |
| `GET` | `/forecast/24h` | 24-hour fleet power forecast with CI |
| `GET` | `/forecast/7day` | 7-day fleet power forecast with CI and peak alert |
| `GET` | `/topology` | VM network graph for D3 (3 task_type cluster nodes) |
| `GET` | `/explorer/query` | Templated DuckDB query execution |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Redis (local or Render add-on)
- Kaggle API credentials (for dataset download)

### Backend Setup

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Download dataset
cd ..
python scripts/download_data.py

# 3. Set environment variables
export REDIS_URL=redis://localhost:6379
export CORS_ORIGINS=http://localhost:5173

# 4. Start the server (from backend/)
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## Deployment

### Backend — [Render](https://render.com)

The backend deploys to Render as a **Web Service** (Python 3.11 runtime).

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Plan**: Render Starter or Standard (**minimum 2GB RAM** required — dataset occupies ~500–800MB in-memory after float32 downcast)
- **Redis**: Add a Render Redis instance and set `REDIS_URL` in the service environment

> ⚠️ The dataset (`backend/data/telemetry.csv`) is not committed to the repo. On Render, use the startup script to download it via `kagglehub` by setting `KAGGLE_USERNAME` and `KAGGLE_KEY` environment variables, or use a persistent disk mount.

### Frontend — [Vercel](https://vercel.com)

```bash
# vercel.json already configured (see frontend/vercel.json)
vercel deploy --prod
```

Set `VITE_API_BASE_URL` in Vercel project settings to your Render service URL.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | Yes (prod) | `redis://localhost:6379` | Redis connection URL |
| `CSV_PATH` | No | `data/telemetry.csv` | Path to telemetry CSV (relative to `backend/`) |
| `CORS_ORIGINS` | Yes (prod) | `http://localhost:5173` | Comma-separated allowed origins |
| `WASTE_POWER_THRESHOLD` | No | `375.14` | Energy waste detection threshold (p75 from Phase 0 analysis) |
| `POWER_ALERT_KW` | No | `400000.0` | 7-day forecast peak alert threshold |
| `KAGGLE_USERNAME` | Prod only | — | For automated dataset download on Render |
| `KAGGLE_KEY` | Prod only | — | Kaggle API key |
| `VITE_API_BASE_URL` | Frontend | — | Backend service URL (set in Vercel) |

---

## Data Analysis Decisions (Phase 0)

| Key | Decision | Basis |
|---|---|---|
| `null_strategy` | Global median imputation | ~10% nulls, uniform across all cohorts |
| `anomaly_ui` | Fleet-level waste banner + behavioral panel | Fleet waste rate = 8.3% (> 5% threshold) |
| `synth_strategy` | Per-cohort covariance (Candidate A) | All 3 cohort cov matrices full rank (rank=7) |
| `topology_agg` | 3 task_type cluster nodes | 1.8M unique VMs >> 10,000 threshold |
| `waste_threshold` | 375.14 | p75 of `power_consumption` for `waiting` tasks |
| `memory_tier` | Render Starter+ (2GB min) | In-memory footprint ~500–800MB after downcast |

---

## Tech Stack

**Backend:** Python 3.11 · FastAPI · DuckDB · Redis · pandas · XGBoost · LightGBM · scikit-learn · SHAP  
**Frontend:** React 18 · TypeScript · Vite · Recharts · Plotly.js · D3.js · Zustand · Axios  
**Deployment:** Render (backend) · Vercel (frontend)
