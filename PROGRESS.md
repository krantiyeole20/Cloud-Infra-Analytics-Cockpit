# Cloud VM Cockpit — Build Progress

Last updated: 2026-02-27T21:45:40-05:00

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
- [x] Phase 2 / render.yaml (replaces railway.toml)
- [x] Phase 2 / scripts/download_data.py (kagglehub + curl fallback)
- [x] Phase 2 / ml/efficiency.py (XGBoost, tree_method=hist, val MAE)
- [x] Phase 2 / ml/compute_value.py (DuckDB cohort aggregation by task_type×task_priority)
- [x] Phase 2 / ml/anomaly.py (IsolationForest per cohort, behavioral+waste queries)
- [x] Phase 2 / ml/completion.py (LightGBM binary, early_stopping, val_df for ROC)
- [x] Phase 2 / ml/forecast.py (24h XGBoost + 7-day Linear Fourier, 95% CI)
- [x] Phase 2 / ml/explainability.py (SHAP TreeExplainer, ROC curve, async precompute)

## Known Issues / Conflicts
- **vm_id near-uniqueness**: `/vms` endpoint must aggregate by `(task_type, task_priority)` cohort, not raw `vm_id`. Logged as design decision — awaiting Phase 3 implementation.
- **OLD schema artifacts**: `ml/sla.py`, `ml/contention.py`, `routers/zones.py` are old GPU-schema placeholders. Phase 2 and Phase 3 will create new files (`ml/efficiency.py`, `ml/completion.py`, `routers/workload.py`, `routers/vms.py`) alongside them.
- **Railway Starter required**: Free tier (512MB) is not viable for this dataset. Confirmed in `config.py` note and will be flagged in `railway.toml` in Phase 8.

## Current Phase
Phase 3 — API Routers

## Remaining Features
- [ ] Phase 3 / Refresh router
- [ ] Phase 3 / KPIs router
- [ ] Phase 3 / Workload router
- [ ] Phase 3 / Performance router
- [ ] Phase 3 / VMs router
- [ ] Phase 3 / Anomalies router
- [ ] Phase 3 / Forecast router
- [ ] Phase 3 / Topology router
- [ ] Phase 3 / Explorer router
- [ ] Phase 4 / React project init
- [ ] Phase 4 / Type definitions
- [ ] Phase 4 / API client layer
- [ ] Phase 4 / Zustand store
- [ ] Phase 4 / Polling hooks
- [ ] Phase 5 / Top bar
- [ ] Phase 5 / Sidebar
- [ ] Phase 5 / Main canvas and app shell
- [ ] Phase 6 / MetricTimeSeries chart
- [ ] Phase 6 / WorkloadHeatmap chart
- [ ] Phase 6 / EfficiencySurface3D chart
- [ ] Phase 6 / ShapWaterfall chart
- [ ] Phase 6 / RocCurve chart
- [ ] Phase 6 / TopologyGraph chart
- [ ] Phase 6 / ForecastChart chart
- [ ] Phase 7 / KpiCard and VmDetailCard
- [ ] Phase 7 / Overview view
- [ ] Phase 7 / Workload view
- [ ] Phase 7 / Anomaly view
- [ ] Phase 7 / Forecast view
- [ ] Phase 7 / Explorer view
- [ ] Phase 8 / Backend requirements and Railway config
- [ ] Phase 8 / Router registration audit
- [ ] Phase 8 / Frontend build verification
- [ ] Phase 8 / End-to-end wiring verification

## Remaining Phases
- Phase 2 — ML Engine
- Phase 3 — API Routers
- Phase 4 — Frontend Scaffold and State
- Phase 5 — Frontend Layout and Navigation
- Phase 6 — Chart Components
- Phase 7 — Views and Cards
- Phase 8 — Deployment and Final Wiring

## Files Created (flat list)
### Root
- README.md
- .gitignore
- HLD.md (updated by user to Cloud VM schema)
- PROGRESS.md

### Backend (Cloud VM schema — all Phase 1 implementations)
- backend/app/__init__.py
- backend/app/main.py ✅ Cloud VM — lifespan with load_csv→pipeline→init_db→synthetic→ML→cache
- backend/app/config.py ✅ Cloud VM — WASTE_POWER_THRESHOLD=375.14, per-cohort synth
- backend/app/pipeline.py ✅ NEW — global_median nulls, derived metrics, float32 downcast
- backend/app/database.py ✅ Cloud VM — init_db(DataFrame), query(sql, params), append_rows, get_row_count
- backend/app/synthetic.py ✅ Cloud VM — per_cohort_covariance (Candidate A active, B as fallback)
- backend/app/cache.py ✅ Cloud VM — new key registry, typed helpers get/set_model, get/set_shap
- backend/app/ml/__init__.py
- backend/app/ml/efficiency.py (placeholder — Phase 2)
- backend/app/ml/compute_value.py (placeholder — Phase 2)
- backend/app/ml/anomaly.py (placeholder — Phase 2)
- backend/app/ml/completion.py (placeholder — Phase 2)
- backend/app/ml/forecast.py (placeholder — Phase 2)
- backend/app/ml/explainability.py (placeholder — Phase 2)
- backend/app/ml/sla.py (OLD GPU schema — superseded)
- backend/app/ml/contention.py (OLD GPU schema — superseded)
- backend/app/routers/__init__.py
- backend/app/routers/kpis.py (placeholder — Phase 3)
- backend/app/routers/workload.py (placeholder — Phase 3)
- backend/app/routers/performance.py (placeholder — Phase 3)
- backend/app/routers/vms.py (placeholder — Phase 3)
- backend/app/routers/anomalies.py (placeholder — Phase 3)
- backend/app/routers/forecast.py (placeholder — Phase 3)
- backend/app/routers/topology.py (placeholder — Phase 3)
- backend/app/routers/explorer.py (placeholder — Phase 3)
- backend/app/routers/refresh.py (placeholder — Phase 3)
- backend/app/routers/zones.py (OLD GPU schema — superseded)
- backend/data/telemetry.csv (vmCloud_data.csv — 2M rows, Cloud VM schema)
- backend/requirements.txt (placeholder — Phase 8)
- backend/railway.toml (placeholder — Phase 8)

### Frontend (placeholders — Phases 4–7)
- frontend/src/types/index.ts (placeholder — Phase 4)
- frontend/src/App.tsx, constants.ts, api/client.ts, store/dashboardStore.ts
- frontend/src/hooks/usePolling.ts, useRefresh.ts
- frontend/src/components/layout/Sidebar.tsx, TopBar.tsx, MainCanvas.tsx
- frontend/src/components/views/OverviewView.tsx, WorkloadView.tsx, AnomalyView.tsx, ForecastView.tsx, ExplorerView.tsx
- frontend/src/components/charts/ (all chart placeholders)
- frontend/src/components/cards/KpiCard.tsx, VmDetailCard.tsx

## Open Questions for Human Review
1. **vm_id aggregation in /vms endpoint**: Using `(task_type, task_priority)` cohort grouping since vm_id is near-unique (1 row/VM).
2. **Railway Starter tier**: ~$5/month required. Free tier not viable for 2M-row dataset.