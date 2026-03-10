// src/constants/descriptions.ts
// All descriptive strings for the dashboard.
// Never hardcode descriptions in component JSX — import from here.

export const DEMO_STATUS_TEXT =
  'Metrics loaded from precomputed analysis. Refresh simulates new telemetry.'

export const VIEW_DESCRIPTIONS: Record<string, string> = {
  overview:
    'Fleet-wide health snapshot across 2M VM telemetry records. Key efficiency metrics, power consumption trends, and workload distribution across all VM cohorts.',
  workload:
    'Resource utilization heatmap and efficiency trendlines by task type (io / network / compute). Cohort rankings reveal which workload classes deliver the most compute value per watt.',
  anomaly:
    'IsolationForest behavioral outliers, SHAP feature attributions for any flagged VM, and energy-waste alerts — VMs drawing power while idle above the p75 threshold (375.14 W).',
  forecast:
    'XGBoost 24-hour fleet power forecast and 7-day Fourier linear model — both with 95% confidence intervals. Peak alerts flag days projected to exceed the power threshold.',
  explorer:
    'Live SQL interface against the 2M-row DuckDB in-memory telemetry table. Use named templates or write custom queries. Results appear in real time.',
}

export const KPI_DESCRIPTIONS: Record<string, string> = {
  avg_energy_efficiency:
    'Mean ratio of compute work done to power consumed (throughput ÷ power_consumption), averaged across all VM cohorts. Range 0–1 — higher is better. Values above 0.6 are considered healthy.',
  avg_compute_value:
    'Mean instructions executed per watt of power consumed. Varies significantly by task_type: io tasks achieve ~22K, network ~1.5K, compute ~430. Used to rank cohort productivity.',
  fleet_power_kw:
    'Aggregated instantaneous power draw across all monitored VMs in kilowatts. Derived by summing per-VM power_consumption values from the latest telemetry window.',
  vms_wasting_energy_pct:
    'Percentage of VMs in "waiting" (idle) status whose power_consumption exceeds the p75 idle threshold of 375.14 W. A fleet alert fires when this crosses 5% of the fleet.',
  behavioral_anomalies:
    'Count of VMs flagged as behavioral outliers by IsolationForest (contamination=0.05, 100 estimators), trained per task_type cohort. Scores close to +1.0 indicate the most anomalous resource usage patterns.',
  total_vm_records:
    'Total rows currently loaded in the DuckDB in-memory table. The base dataset is 2M records. Clicking Refresh adds ~75 synthetic rows sampled via per-cohort covariance to simulate ongoing telemetry.',
}

export const CHART_DESCRIPTIONS: Record<string, string> = {
  energy_efficiency_timeseries:
    'Daily fleet-average energy efficiency ratio over the telemetry window. Each point is the mean efficiency across all VM records for that calendar day.',
  topology_graph:
    'Force-directed graph — one node per task_type. Node size encodes record count; edge weight reflects resource-usage correlation between workload classes. Drag nodes to explore.',
  workload_heatmap:
    'task_type × resource metric matrix. Cell color encodes the normalized value within each column. Green scale = efficiency (high is good); red scale = power draw (lower is better); amber = utilization.',
  efficiency_surface:
    'Parallel efficiency trendlines for io, network, and compute task types over the same time window. Divergence between lines reveals workload class imbalance.',
  cpu_timeseries:
    'Daily mean CPU utilization across all VMs. Consistent values near 50% are expected from the synthetic generation distribution.',
  forecast_24h:
    'XGBoost regressor trained on lag-1, lag-6, and lag-24 hour features. Shaded band is a ±1 σ bootstrap confidence interval (≈ 68% CI). Horizon: 24 hours.',
  forecast_7day:
    '7-day linear regression with Fourier seasonality terms (period 7d and 3.5d). The dashed reference line marks the projected peak demand day.',
  roc_curve:
    'Receiver Operating Characteristic for the LightGBM task-completion predictor (task_status = "completed" vs other). AUC > 0.7 indicates meaningful discrimination above the random baseline.',
  shap_waterfall:
    'SHAP (SHapley Additive exPlanations) feature attributions for the selected VM. Shows which resource metrics most pushed or dampened the anomaly score relative to the cohort baseline.',
  vm_cohort_rankings:
    'Aggregate statistics per (task_type × task_priority) cohort, sorted by avg_compute_value descending. Each row summarises all records sharing the same workload class.',
  waste_anomaly_table:
    'VMs in "waiting" status with power_consumption above the p75 idle threshold (375.14 W). Highest-priority candidates for scheduling review and VM rightsizing.',
  behavioral_table:
    'VMs ranked by IsolationForest anomaly score (closest to +1.0 first). Click any row to load per-feature SHAP attributions in the investigation panel.',
}

export const PROJECT_ABOUT = {
  problem:
    'Cloud providers lose significant capacity to VMs that remain powered while idle. This cockpit applies four ML models to 2 million cloud VM telemetry records to quantify, predict, and explain energy waste at fleet scale — surfacing actionable anomalies for infrastructure teams.',

  dataset: {
    name: 'Cloud Computing Performance Metrics',
    source: 'Kaggle — abdurraziq01',
    kaggle_url: 'https://www.kaggle.com/datasets/abdurraziq01/cloud-computing-performance-metrics',
    rows: '2,000,000',
    cols: '12',
    unique_vms: '1,799,362 unique vm_ids',
    null_rate: '~10% (imputed with global median)',
    waste_threshold: '375.14 W (p75 of waiting-state power draw)',
    key_columns:
      'vm_id · task_type · task_priority · task_status · cpu_usage · memory_usage · network_traffic · power_consumption · energy_efficiency · compute_value · throughput · num_executed_instructions',
  },

  models: [
    {
      name: 'IsolationForest',
      purpose: 'Behavioral anomaly detection',
      detail:
        'Trained per cohort (task_type × task_priority). contamination=0.05, 100 estimators. Flags VMs with unusual multi-dimensional resource signatures vs their cohort baseline.',
    },
    {
      name: 'LightGBM Classifier',
      purpose: 'Task completion prediction',
      detail:
        'Binary classifier predicting task_status = "completed" vs other states. Outputs completion probabilities; performance evaluated via ROC AUC.',
    },
    {
      name: 'XGBoost Regressor',
      purpose: '24-hour power forecast',
      detail:
        'Trained on lag-1, lag-6, and lag-24 hour features of the fleet power time series. Mean Absolute Error shown inline on the forecast chart.',
    },
    {
      name: 'Fourier Linear Regression',
      purpose: '7-day power forecast',
      detail:
        'Linear regression with sin/cos Fourier seasonality terms for 7-day and 3.5-day cycles. Flags projected peak demand days above the fleet power alert threshold.',
    },
  ],

  stack: {
    backend: 'FastAPI · DuckDB (in-memory, 2M rows) · Redis cache · SHAP · scikit-learn → Render',
    frontend: 'React 18 · TypeScript · Vite · Zustand · Recharts · D3.js → Vercel',
    data: 'Python · pandas · scikit-learn · lightgbm · xgboost · shap · numpy',
  },

  author: {
    name: 'Krantiykumar Yeole',
    github_profile: 'https://github.com/krantiyeole20/',
    github_repo: 'https://github.com/krantiyeole20/Cloud-Infra-Analytics-Cockpit',
    linkedin: 'https://www.linkedin.com/in/krantiyeole/',
  },
}
