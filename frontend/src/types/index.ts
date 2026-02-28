// src/types/index.ts
// All TypeScript interfaces for Cloud VM Intelligence Cockpit API responses.
// Mirrors the FastAPI response shapes defined in HLD.md Section 6.

// ── /health ─────────────────────────────────────────────────────────────────
export interface HealthResponse {
    status: 'ok' | 'degraded'
    timestamp: string
    rows_loaded: number
    memory_mb: number
}

// ── /kpis ────────────────────────────────────────────────────────────────────
export interface KpisResponse {
    avg_energy_efficiency: number
    avg_compute_value: number
    vms_wasting_energy: number
    vms_wasting_energy_pct: number
    behavioral_anomalies: number
    fleet_power_kw: number
    total_vm_records: number
    last_updated: string
}

// ── /workload/heatmap ────────────────────────────────────────────────────────
export interface WorkloadHeatmapResponse {
    rows: string[]   // task_type labels
    cols: string[]   // metric names
    matrix: number[][] // rows × cols
    meta: Record<string, Record<string, number>> // task_type → priority → count
}

export interface WorkloadDistributionItem {
    task_type: string
    task_priority: string
    task_status: string
    count: number
    pct: number
}

// ── /performance ─────────────────────────────────────────────────────────────
export interface TimeSeriesPoint {
    timestamp: string
    value: number
    record_count: number
}

export interface TimeSeriesResponse {
    metric: string
    bucket: string
    task_type: string | null
    series: TimeSeriesPoint[]
}

export interface Surface3DSurface {
    task_type: string
    x: string[]    // timestamps
    y: number[]    // efficiency values
}

export interface Surface3DResponse {
    task_types: string[]
    surfaces: Surface3DSurface[]
    bucket: string
}

// ── /vms ─────────────────────────────────────────────────────────────────────
export interface VmCohort {
    task_type: string
    task_priority: string
    avg_compute_value: number
    avg_efficiency: number
    avg_throughput: number
    avg_power: number
    total_waste_events: number
    record_count: number
}

export interface VmsResponse {
    cohorts: VmCohort[]
    sort_by: string
    sort_order: 'asc' | 'desc'
    aggregation_note: string
}

export interface VmSummaryItem {
    task_type: string
    task_priority: string
    task_status: string
    avg_compute_value: number
    avg_efficiency: number
    avg_throughput: number
    avg_power: number
    avg_cpu: number
    avg_memory: number
    total_waste_events: number
    waste_pct: number
    record_count: number
}

export interface VmSampleRow {
    vm_id: string
    timestamp: string
    task_type: string
    task_priority: string
    task_status: string
    cpu_usage: number
    memory_usage: number
    network_traffic: number
    power_consumption: number
    energy_efficiency: number
    compute_value: number
    is_wasting_energy: 0 | 1
}

// ── /anomalies ───────────────────────────────────────────────────────────────
export interface BehavioralAnomalyRow {
    vm_id: string
    task_type: string
    task_priority: string
    task_status: string
    behavioral_anomaly_score: number
    energy_efficiency: number
    cpu_usage: number
    memory_usage: number
    power_consumption: number
}

export interface FleetAlert {
    active: boolean
    waste_pct: number
    vms_wasting_energy: number
    threshold_pct: number
    alert_mode: 'fleet_banner'
    error?: string
}

export interface WasteRow {
    vm_id: string
    task_type: string
    task_priority: string
    power_consumption: number
    energy_efficiency: number
    compute_value: number
    timestamp: string
}

export interface AnomaliesResponse {
    behavioral: BehavioralAnomalyRow[]
    fleet_alert: FleetAlert
    waste_samples: WasteRow[]
}

// ── /anomalies/{vm_id}/shap ───────────────────────────────────────────────────
export interface ShapFeature {
    name: string
    value: number
    shap_impact: number
}

export interface ShapResponse {
    vm_id: string
    base_value: number
    final_value: number
    features: ShapFeature[]
}

// ── /anomalies/roc ────────────────────────────────────────────────────────────
export interface RocResponse {
    fpr: number[]
    tpr: number[]
    auc: number
    model: string
}

// ── /forecast ─────────────────────────────────────────────────────────────────
export interface ForecastPoint24h {
    timestamp: string
    predicted_kw: number
    ci_lower: number
    ci_upper: number
}

export interface Forecast24hResponse {
    horizon_hours: number
    series: ForecastPoint24h[]
    mae: number
}

export interface ForecastPoint7Day {
    date: string
    predicted_kw: number
    ci_lower: number
    ci_upper: number
}

export interface Forecast7DayResponse {
    horizon_days: number
    series: ForecastPoint7Day[]
    peak_day: string
    peak_predicted_kw: number
    alert: boolean
    alert_message: string
}

// ── /topology ─────────────────────────────────────────────────────────────────
export interface TopologyNodeStats {
    avg_cpu: number
    avg_memory: number
    avg_power: number
    avg_efficiency: number
    avg_compute_value: number
    waste_pct: number
}

export interface TopologyNode {
    id: string
    label: string
    task_type: string
    vm_count: number
    stats: TopologyNodeStats
}

export interface TopologyEdge {
    source: string
    target: string
    weight: number
}

export interface TopologyResponse {
    nodes: TopologyNode[]
    edges: TopologyEdge[]
    layout: 'force'
    aggregation: string
}

// ── /explorer ─────────────────────────────────────────────────────────────────
export interface ExplorerTemplatesResponse {
    templates: string[]
    usage: string
}

export interface ExplorerQueryResponse {
    rows: Record<string, unknown>[]
    row_count: number
    columns: string[]
}

// ── /refresh ─────────────────────────────────────────────────────────────────
export interface RefreshResponse {
    rows_added: number
    models_retrained: string[]
    cache_invalidated: boolean
    timestamp: string
    elapsed_seconds: number
}

// ── Shared ────────────────────────────────────────────────────────────────────
export type TaskType = 'io' | 'network' | 'compute'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'waiting' | 'running' | 'completed'
export type ViewId = 'overview' | 'workload' | 'anomaly' | 'forecast' | 'explorer'
