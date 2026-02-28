# Cloud VM Cockpit — Build Progress

Last updated: 2026-02-28T00:00:00-05:00

## Data Analysis Decisions (Phase 0)

Raw data: `backend/data/telemetry.csv` — 2,000,000 rows × 12 columns

| Decision Key | Resolved Value | Basis |
|---|---|---|
| `null_strategy` | **global_median** | Null rates ~10% across ALL nullable cols; variation across cohorts ≤0.1pp. Not < 0.5% so cannot drop. Per-cohort adds no benefit. |
| `anomaly_ui` | **both_types (fleet-alert mode)** | Waste rate at p75 threshold (375.14) = ~8.3% > 5% → waste shown as fleet-level alert banner; behavioral panel shown separately. |
| `synth_strategy` | **per_cohort_covariance** (Candidate A) | All 3 cohort cov matrices FULL RANK (rank=7 = n_cols=7): network=7, io=7, compute=7. |
| `topology_agg` | **task_type_cluster_nodes** (Option C) | Unique vm_ids = 1,799,362 >> 10,000 threshold → 3 cluster nodes only. |
| `waste_threshold` | **375.14** | p75 of `power_consumption` where `task_status == "waiting"`. |
| `memory_tier` | **Railway Starter (2GB required)** | CSV = 338MB raw; in-memory with pandas ≈ 500–800MB after float32 downcast. |

### Raw Analysis Output (key numbers)
```
Rows: 2,000,000    Unique vm_ids: 1,799,362
Null rates: ~10% per nullable col, uniform across cohorts
Task type: io 33.4%, network 33.4%, compute 33.3%
Task priority: medium 33.4%, high 33.4%, low 33.3%
Task status: waiting 33.4%, running 33.4%, completed 33.3%
Energy efficiency: mean=0.50, std=0.29, uniform 0–1
Power (waiting tasks): mean=250.07, p75=375.14
Covariance ranks: network=7, io=7, compute=7 — ALL FULL RANK
Waste rate at p75 threshold: ~8.33% of fleet
```

### Important Dataset Characteristics
> **CRITICAL — vm_id near-uniqueness**: 1,799,362 unique vm_ids in 2,000,000 rows (≈1 row per VM). Per-VM aggregation produces n≈1 per group. All `/vms` endpoint and topology logic must use `task_type` / `task_priority` cohort grouping as the primary aggregation dimension, **not** raw `vm_id`.

---

## Completed Phases

- Phase 0 — Data Analysis [2026-02-27]
- Phase 1 — Project Scaffold and Data Foundation [2026-02-27]
- Phase 2 — ML Engine [2026-02-27]
- Phase 3 — API Routers [2026-02-27]
- Phase 4 — Frontend Scaffold and State [2026-02-27]
- Phase 5 — Frontend Layout and Navigation [2026-02-27]
- Phase 6 — Chart Components [2026-02-27]
- Phase 7 — Views and Cards [2026-02-27]
- Phase 8 — Deployment and Final Wiring [2026-02-28]

## Completed Features (flat list)

- [x] Phase 0 / Data analysis and decision logging
- [x] Phase 1 / Monorepo scaffold update
- [x] Phase 1 / config.py (Cloud VM schema, WASTE_POWER_THRESHOLD=375.14)
- [x] Phase 1 / pipeline.py (NEW — global median nulls, derived metrics, float32 downcast)
- [x] Phase 1 / database.py (init_db takes DataFrame)
- [x] Phase 1 / synthetic.py (per-cohort covariance, Candidate B fallback)
- [x] Phase 1 / cache.py (new key registry + typed helpers)
- [x] Phase 1 / main.py (load_csv→pipeline→init_db→synthetic→ML stubs→cache)
- [x] Phase 2 / README.md (rewritten for Cloud VM / Render / new dataset)
- [x] Phase 2 / render.yaml (replaces railway.toml — now at repo root)
- [x] Phase 2 / scripts/download_data.py (kagglehub + curl fallback)
- [x] Phase 2 / ml/efficiency.py (XGBoost, tree_method=hist, val MAE)
- [x] Phase 2 / ml/compute_value.py (DuckDB cohort aggregation by task_type×task_priority)
- [x] Phase 2 / ml/anomaly.py (IsolationForest per cohort, behavioral+waste queries)
- [x] Phase 2 / ml/completion.py (LightGBM binary, early_stopping, val_df for ROC)
- [x] Phase 2 / ml/forecast.py (24h XGBoost + 7-day Linear Fourier, 95% CI)
- [x] Phase 2 / ml/explainability.py (SHAP TreeExplainer, ROC curve, async precompute)
- [x] Phase 3 / routers/refresh.py (full pipeline: synthetic→append→retrain→SHAP→invalidate)
- [x] Phase 3 / routers/kpis.py (fleet KPIs, Redis-first 30s TTL)
- [x] Phase 3 / routers/workload.py (/heatmap + /distribution)
- [x] Phase 3 / routers/performance.py (/timeseries + /surface3d with safe metric/bucket validation)
- [x] Phase 3 / routers/vms.py (cohort aggregation by task_type×priority, /sample)
- [x] Phase 3 / routers/anomalies.py (behavioral + fleet_alert + /roc + /{vm_id}/shap)
- [x] Phase 3 / routers/forecast.py (/24h + /7day, lazy forecast model training)
- [x] Phase 3 / routers/topology.py (3 task_type cluster nodes + weighted edges)
- [x] Phase 3 / routers/explorer.py (7 named templates + custom SELECT, mutation guard)
- [x] Phase 4 / backend/requirements.txt (all pinned deps incl. kagglehub, joblib)
- [x] Phase 4 / scripts/test_backend.py (stdlib smoke test — all endpoints)
- [x] Phase 4 / frontend/package.json + vite.config.ts + tsconfig.json + index.html
- [x] Phase 4 / src/types/index.ts (all API response interfaces)
- [x] Phase 4 / src/api/client.ts (Axios typed wrappers for every endpoint)
- [x] Phase 4 / src/store/dashboardStore.ts (Zustand, generic fetchSlice, bulk fetchOverview)
- [x] Phase 4 / src/hooks/usePolling.ts (generic interval hook)
- [x] Phase 4 / src/hooks/useRefresh.ts (refresh hook with double-click guard)
- [x] Phase 4 / src/main.tsx + App.tsx (shell with fleet alert banner + KPI polling)
- [x] Phase 4 / src/index.css (dark design tokens) + src/constants.ts (colors/labels)
- [x] Phase 5 / src/index.css (full design system — glassmorphism, tokens, animations)
- [x] Phase 5 / components/layout/TopBar.tsx (live KPI strip, refresh button, status dot)
- [x] Phase 5 / components/layout/Sidebar.tsx (nav + task_type filter pills + footer stats)
- [x] Phase 5 / components/layout/MainCanvas.tsx (view router)
- [x] Phase 5 / components/views/OverviewView.tsx (KPI cards, topology, waste table)
- [x] Phase 5 / components/views/WorkloadView.tsx (heat-colored matrix, cohort rankings)
- [x] Phase 5 / components/views/AnomalyView.tsx (fleet banner, anomaly table, SHAP bars)
- [x] Phase 5 / components/views/ForecastView.tsx (24h table, 7-day table, peak alert)
- [x] Phase 5 / components/views/ExplorerView.tsx (template pills, SQL textarea, results)
- [x] Phase 5 / App.tsx (rewired — real layout, fleet banner, bootstrap fetchOverview)
- [x] Phase 6 / charts/MetricTimeSeries.tsx (Recharts AreaChart, gradient fill, efficiency % format)
- [x] Phase 6 / charts/ForecastChart.tsx (24h CI-band AreaChart + 7day amber+peak ReferenceLine)
- [x] Phase 6 / charts/RocCurve.tsx (violet Recharts + diagonal reference + AUC badge)
- [x] Phase 6 / charts/ShapWaterfall.tsx (horizontal BarChart, red=positive, green=negative impact)
- [x] Phase 6 / charts/WorkloadHeatmap.tsx (pure SVG, 3-color-scheme per metric type)
- [x] Phase 6 / charts/EfficiencySurface3D.tsx (Plotly 3D lines, lazy-loaded)
- [x] Phase 6 / charts/TopologyGraph.tsx (D3 force-simulation, draggable, glow rings)
- [x] Phase 6 / views/OverviewView.tsx wired (TimeSeries + TopologyGraph)
- [x] Phase 6 / views/WorkloadView.tsx wired (Heatmap + Surface3D + TimeSeries)
- [x] Phase 6 / views/AnomalyView.tsx wired (RocCurve + ShapWaterfall)
- [x] Phase 6 / views/ForecastView.tsx wired (ForecastChart24h + ForecastChart7Day)
- [x] Phase 8 / .github/workflows/ci.yml (3-job pipeline: backend syntax, frontend build, deploy summary)
- [x] Phase 8 / frontend/vercel.json (framework=vite, buildCommand, outputDirectory, SPA rewrites)
- [x] Phase 8 / backend/railway.toml (Railway Starter, health check, restart policy)
- [x] Phase 8 / render.yaml at repo root (Render Blueprint — web service + Redis, Starter plan)
- [x] Phase 8 / backend/requirements.txt (joblib==1.4.2 added per HLD.md Section 4.5)

---

## Deployment Guide

### Frontend → Vercel

1. Connect this GitHub repo in the [Vercel dashboard](https://vercel.com/new).
2. Set **Root Directory** = `frontend` (critical — avoids building from repo root).
3. Vercel auto-detects Vite. The `frontend/vercel.json` provides the correct config:
   - `framework: vite`
   - `buildCommand: npm run build`
   - `outputDirectory: dist`
   - SPA catch-all rewrite (React Router-free navigation via Zustand state)
4. Add environment variable in Vercel project settings:
   ```
   VITE_API_BASE_URL = https://<your-render-service>.onrender.com
   ```
5. Push to `main` → Vercel auto-deploys.

### Backend → Render

1. Connect this GitHub repo in the [Render dashboard](https://dashboard.render.com).
2. Choose **New → Blueprint Instance** — Render will read `render.yaml` at the repo root.
3. This creates:
   - **Web Service** `cloud-vm-cockpit-api` (Starter plan, 2GB RAM)
   - **Redis** `cloud-vm-cockpit-redis` (Free plan)
4. After deploy, copy the service URL (e.g., `https://cloud-vm-cockpit-api.onrender.com`).
5. Update `CORS_ORIGINS` in the Render environment dashboard to your Vercel URL:
   ```
   CORS_ORIGINS = https://<your-app>.vercel.app
   ```
6. Update `VITE_API_BASE_URL` in Vercel with the Render URL.
7. Push to `main` → Render auto-deploys (`autoDeploy: true` in `render.yaml`).

> **Memory warning**: The dataset loads ~500–800MB in-memory. Render Starter plan
> (~$7/month) is required. Free tier (512MB) will OOM during startup.

### Railway (alternative to Render)

A `backend/railway.toml` is provided if you prefer Railway over Render:
- Same memory requirement (Starter tier, 2GB)
- Add Redis as a separate Railway service
- Set `REDIS_URL` and `CORS_ORIGINS` in Railway environment settings

### CI/CD Pipeline (`.github/workflows/ci.yml`)

Runs on every push to `main` and every PR targeting `main`:

| Job | What it checks |
|---|---|
| `backend-check` | Python 3.11, pip install, `py_compile` all 18 backend modules |
| `frontend-check` | Node 20, npm ci, `tsc --noEmit`, `npm run build` |
| `notify-deploy` | Summary reminder of env vars to configure (main branch only) |

Deployment itself is handled by Vercel + Render Git integrations — no deploy secrets
needed in GitHub.

---

## Known Issues / Conflicts

- **vm_id near-uniqueness**: `/vms` endpoint uses `(task_type, task_priority)` cohort grouping since vm_id is near-unique (1 row/VM). This is by design.
- **OLD schema artifacts**: `ml/sla.py`, `ml/contention.py`, `routers/zones.py` are old GPU-schema placeholders. They are unused — safe to delete after confirming no imports.
- **Render Starter tier**: ~$7/month required. Free tier not viable for 2M-row dataset.
- **`backend/render.yaml`**: This file exists from a prior phase but is superseded by the root-level `render.yaml`. The `backend/render.yaml` can be deleted to avoid confusion.

---

## Current Phase
Completed

## Remaining Features
- None. All phases complete.

## Remaining Phases
- None. All phases complete.

---

## Files Created (flat list)

### Root
- README.md
- .gitignore
- HLD.md (updated by user to Cloud VM schema)
- PROGRESS.md
- render.yaml ✅ Render Blueprint at repo root (web service + Redis)

### Backend (Cloud VM schema — all Phase 1 implementations)
- backend/app/__init__.py
- backend/app/main.py ✅ Cloud VM — lifespan with load_csv→pipeline→init_db→synthetic→ML→cache
- backend/app/config.py ✅ Cloud VM — WASTE_POWER_THRESHOLD=375.14, per-cohort synth
- backend/app/pipeline.py ✅ NEW — global_median nulls, derived metrics, float32 downcast
- backend/app/database.py ✅ Cloud VM — init_db(DataFrame), query(sql, params), append_rows, get_row_count
- backend/app/synthetic.py ✅ Cloud VM — per_cohort_covariance (Candidate A active, B as fallback)
- backend/app/cache.py ✅ Cloud VM — new key registry, typed helpers get/set_model, get/set_shap
- backend/app/ml/__init__.py
- backend/app/ml/efficiency.py ✅ XGBoost regressor, EFFICIENCY_FEATURES, val MAE logged
- backend/app/ml/compute_value.py ✅ DuckDB cohort aggregation, top/bottom by compute_value
- backend/app/ml/anomaly.py ✅ IsolationForest per cohort, behavioral+waste scoring
- backend/app/ml/completion.py ✅ LightGBM binary, val_df for ROC, val AUC logged
- backend/app/ml/forecast.py ✅ 24h XGBoost + 7-day Fourier linear, 95% CI bands
- backend/app/ml/explainability.py ✅ SHAP TreeExplainer, ROC curve, async precompute
- backend/app/ml/sla.py (OLD GPU schema — superseded, safe to delete)
- backend/app/ml/contention.py (OLD GPU schema — superseded, safe to delete)
- backend/app/routers/__init__.py
- backend/app/routers/kpis.py ✅ fleet KPIs, Redis-first 30s TTL
- backend/app/routers/workload.py ✅ /heatmap + /distribution
- backend/app/routers/performance.py ✅ /timeseries + /surface3d
- backend/app/routers/vms.py ✅ cohort aggregation by task_type×priority
- backend/app/routers/anomalies.py ✅ behavioral + fleet_alert + /roc + /{vm_id}/shap
- backend/app/routers/forecast.py ✅ /24h + /7day, lazy model training
- backend/app/routers/topology.py ✅ 3 task_type cluster nodes + edges
- backend/app/routers/explorer.py ✅ 7 named templates + custom SELECT
- backend/app/routers/refresh.py ✅ full pipeline: synthetic→append→retrain→SHAP→invalidate
- backend/app/routers/zones.py (OLD GPU schema — superseded, safe to delete)
- backend/data/telemetry.csv (vmCloud_data.csv — 2M rows, Cloud VM schema)
- backend/requirements.txt ✅ all pinned deps incl. kagglehub, joblib==1.4.2
- backend/railway.toml ✅ Railway Starter, health check 300s, restart policy
- backend/render.yaml (superseded by root render.yaml — safe to delete)

### Frontend (Phases 4–7)
- frontend/vercel.json ✅ framework=vite, buildCommand, outputDirectory, SPA rewrites
- frontend/src/types/index.ts ✅ Cloud VM typed responses
- frontend/src/App.tsx, constants.ts, api/client.ts, store/dashboardStore.ts ✅ Wired and type-checked
- frontend/src/hooks/usePolling.ts, useRefresh.ts ✅
- frontend/src/components/layout/Sidebar.tsx, TopBar.tsx, MainCanvas.tsx ✅
- frontend/src/components/views/OverviewView.tsx, WorkloadView.tsx, AnomalyView.tsx, ForecastView.tsx, ExplorerView.tsx ✅ All wired to store and cards
- frontend/src/components/charts/MetricTimeSeries.tsx, WorkloadHeatmap.tsx, EfficiencySurface3D.tsx, ShapWaterfall.tsx, RocCurve.tsx, TopologyGraph.tsx, ForecastChart.tsx ✅ All rendered
- frontend/src/components/cards/KpiCard.tsx, VmDetailCard.tsx ✅ Wired into Overview, Forecast, and Anomaly views

### CI/CD
- .github/workflows/ci.yml ✅ 3-job pipeline (backend syntax, frontend typecheck+build, deploy summary)

---

## End-to-End Wiring Audit (Phase 8 Gap Report)

**API Endpoints → Store Actions**
- ✅ `/health`: `getHealth` in client (polled by App shell directly)
- ✅ `/kpis`: `fetchKpis`
- ✅ `/workload/heatmap`: `fetchHeatmap`
- ⚠️ `/workload/distribution`: `fetchDistribution` exists in store but is unused (Views use `/explorer/query` with `task_status_by_type` template instead).
- ✅ `/performance/timeseries`: `fetchTimeSeries`
- ⚠️ `/performance/surface3d`: No store action (fetched directly in `WorkloadView` local state to avoid massive global state blobs).
- ✅ `/vms`: `fetchVms`
- ⚠️ `/vms/summary`: `fetchVmSummary` exists in store but is unused.
- ⚠️ `/vms/sample`: `getVmSample` in client but unused in UI (Explorer uses custom SQL).
- ✅ `/anomalies`: `fetchAnomalies`
- ✅ `/anomalies/{vm_id}/shap`: `fetchShap`
- ✅ `/anomalies/roc`: `fetchRoc`
- ✅ `/forecast/24h`: `fetchForecast24h`
- ✅ `/forecast/7day`: `fetchForecast7Day`
- ✅ `/topology`: `fetchTopology`
- ✅ `/explorer/templates`: fetched directly in `ExplorerView`
- ✅ `/explorer/query`: `runExplorerQuery`
- ✅ `/refresh`: `triggerRefresh`

**Store Actions → Views**
- ✅ `fetchKpis`: `OverviewView`, `App` (polling)
- ✅ `fetchHeatmap`: `OverviewView`, `WorkloadView`
- ✅ `fetchTimeSeries`: `OverviewView`, `WorkloadView`
- ✅ `fetchVms`: `WorkloadView`
- ✅ `fetchAnomalies`: `AnomalyView`
- ✅ `fetchShap`: `AnomalyView` (Slide-in panel)
- ✅ `fetchRoc`: `AnomalyView` (Collapsible section)
- ✅ `fetchForecast24h`, `fetchForecast7Day`: `ForecastView`
- ✅ `fetchTopology`: `OverviewView`, `AnomalyView`
- ✅ `runExplorerQuery`: `ExplorerView`

**Chart Components → Mounted in Views**
- ✅ `MetricTimeSeries`: Overview, Workload
- ✅ `WorkloadHeatmap`: Overview
- ✅ `EfficiencySurface3D`: Workload
- ✅ `ShapWaterfall`: AnomalyView
- ✅ `RocCurve`: AnomalyView
- ✅ `TopologyGraph`: Overview, AnomalyView
- ✅ `ForecastChart`: ForecastView
- ✅ `KpiCard`: Overview, Forecast
- ✅ `VmDetailCard`: AnomalyView (Slide-out panel)

**HLD.md Section 10 `[CODE AGENT DECIDES]` Audit**
- ✅ `null_strategy`: Resolved to **global_median**. Implemented in `pipeline.py`.
- ✅ `anomaly_ui`: Resolved to **fleet-alert mode**. Implemented in `AnomalyView.tsx` and `App.tsx` global banner.
- ✅ `synth_strategy`: Resolved to **Candidate A** (per-cohort). Implemented in `synthetic.py`.
- ✅ `topology_agg`: Resolved to **Option C** (task_type_cluster_nodes). Implemented in `/topology` router and `TopologyGraph.tsx`.
- ✅ `waste_threshold`: Resolved to **375.14**. Hardcoded default in `config.py`.
- ✅ `memory_tier`: Resolved to **Render Starter (2GB)**. Flagged in `render.yaml` and `railway.toml`.

**Deployment Config Audit**
- ✅ `render.yaml` at repo root — Render Blueprint, web service + Redis, Starter plan, autoDeploy
- ✅ `backend/railway.toml` — Railway alternative, Starter plan, health check 300s
- ✅ `frontend/vercel.json` — framework=vite, buildCommand, outputDirectory=dist, SPA rewrites
- ✅ `.github/workflows/ci.yml` — backend syntax check, frontend typecheck+build, deploy summary

**Verdict:** Wire verification passed. The 3 unused store points (`fetchDistribution`, `fetchVmSummary`, `/vms/sample`) are acceptable unused surface area based on the UI design evolving to favor `ExplorerView` templates for these cuts. No action needed.

---

## Open Questions for Human Review

1. **vm_id aggregation in /vms endpoint**: Using `(task_type, task_priority)` cohort grouping since vm_id is near-unique (1 row/VM). This is the correct design choice.
2. **Render Starter tier**: ~$7/month required. Free tier not viable for 2M-row dataset.
3. **`CORS_ORIGINS` and `VITE_API_BASE_URL`**: Must be updated in both Render and Vercel dashboards after first deployment with the actual URLs.
4. **OLD GPU schema files** (`ml/sla.py`, `ml/contention.py`, `routers/zones.py`, `backend/render.yaml`): Safe to delete — they are unreferenced by any active router or import.
