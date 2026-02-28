// src/constants.ts
// Shared UI constants — poll intervals, metric display names, colors.

export const POLL_INTERVAL_MS = 30_000  // 30s KPI polling

export const TASK_TYPE_COLORS: Record<string, string> = {
    io: '#06b6d4',  // cyan
    network: '#3b82f6',  // blue
    compute: '#8b5cf6',  // violet
}

export const TASK_PRIORITY_COLORS: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
}

export const METRIC_LABELS: Record<string, string> = {
    energy_efficiency: 'Energy Efficiency',
    compute_value: 'Compute Value',
    throughput: 'Throughput',
    cpu_usage: 'CPU Usage (%)',
    memory_usage: 'Memory Usage (%)',
    network_traffic: 'Network Traffic',
    power_consumption: 'Power Consumption (kW)',
    num_executed_instructions: 'Instructions Executed',
    execution_time: 'Execution Time (s)',
}

export const VIEW_LABELS: Record<string, string> = {
    overview: 'Overview',
    workload: 'Workload',
    anomaly: 'Anomalies',
    forecast: 'Forecast',
    explorer: 'Explorer',
}
