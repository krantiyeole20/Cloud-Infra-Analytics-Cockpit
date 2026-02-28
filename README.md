# GPU Infrastructure Cockpit

A production-grade, real-time GPU data center monitoring dashboard that demonstrates infrastructure intelligence.

## Overview

The system ingests a static telemetry dataset from 500 unique servers across 6 datacenter zones (A–F), continuously enriches it with statistically faithful synthetic data on each user-triggered refresh, runs three independent ML insight models per server, and surfaces results through a cockpit-style React frontend backed by a FastAPI service layer.

## Architecture

- **Frontend**: React + TypeScript (Vite) → deployed on Vercel
- **Backend**: FastAPI + Python → deployed on Railway
- **Data Layer**: DuckDB (in-memory) + synthetic data generator
- **Cache**: Redis (hot queries + model artifacts)
- **ML Engine**: IsolationForest (anomaly), SLA scorer, contention classifier, XGBoost + linear forecast, SHAP explainability

## Repository Structure

```
gpu-cockpit/
├── frontend/       # React + TypeScript (Vite, Recharts, Plotly, D3, Zustand)
├── backend/        # FastAPI + Python (DuckDB, Redis, scikit-learn, XGBoost)
├── .github/        # CI/CD workflows
└── README.md
```

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (Railway)
```
REDIS_URL=redis://...
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-app.up.railway.app
```

## ML Models

1. **Thermal Cascade Anomaly Detection** — IsolationForest with zone-level thermal features
2. **SLA Health Scorer** — Weighted composite of latency, error rate, GPU utilization
3. **Resource Contention Fingerprint** — Rule-based classifier (GPU_BOUND / MEMORY_BOUND / IO_BOUND / BALANCED)
4. **Power Forecasting** — XGBoost 24h + Linear regression 7-day with Fourier seasonality

## API Reference

Base URL: `https://api.your-railway-app.up.railway.app`

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/refresh` | POST | Generate synthetic data + retrain models |
| `/kpis` | GET | Fleet-wide KPI aggregations |
| `/zones/heatmap` | GET | Zone × metric aggregation matrix |
| `/performance/timeseries` | GET | Multi-metric time-series |
| `/performance/surface3d` | GET | 3D GPU surface data |
| `/anomalies` | GET | Top anomalous servers |
| `/anomalies/{server_id}/shap` | GET | SHAP values for a server |
| `/anomalies/roc` | GET | ROC curve data |
| `/forecast/24h` | GET | 24-hour power forecast |
| `/forecast/7day` | GET | 7-day power forecast |
| `/topology` | GET | Zone-server graph data |
| `/explorer/query` | GET | Templated SQL query execution |
