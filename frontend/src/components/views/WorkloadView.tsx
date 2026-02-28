// src/components/views/WorkloadView.tsx
import { useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

const METRIC_LABELS: Record<string, string> = {
    avg_cpu: 'CPU %', avg_memory: 'Memory %', avg_network: 'Network',
    avg_power: 'Power (W)', avg_efficiency: 'Efficiency', avg_compute_value: 'Compute Value', avg_throughput: 'Throughput',
}

function HeatmapCell({ value, min, max, col }: { value: number; min: number; max: number; col: string }) {
    const t = max === min ? 0 : (value - min) / (max - min)
    const alpha = 0.1 + t * 0.6
    const isEfficiency = col === 'avg_efficiency' || col === 'avg_compute_value'
    const color = isEfficiency
        ? `rgba(16,185,129,${alpha})`
        : col === 'avg_power' ? `rgba(239,68,68,${alpha})` : `rgba(59,130,246,${alpha})`
    return (
        <td style={{ background: color, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, padding: '8px 12px', color: 'var(--text-1)' }}>
            {value.toFixed(col === 'avg_efficiency' || col === 'avg_compute_value' ? 3 : 1)}
        </td>
    )
}

export default function WorkloadView() {
    const heatmap = useDashboardStore((s) => s.heatmap)
    const distribution = useDashboardStore((s) => s.distribution)
    const vms = useDashboardStore((s) => s.vms)
    const fetchHeatmap = useDashboardStore((s) => s.fetchHeatmap)
    const fetchDistribution = useDashboardStore((s) => s.fetchDistribution)
    const fetchVms = useDashboardStore((s) => s.fetchVms)

    useEffect(() => {
        fetchHeatmap(); fetchDistribution(); fetchVms()
    }, [fetchHeatmap, fetchDistribution, fetchVms])

    const hm = heatmap.data

    // Column min/max for heat scaling
    const colRanges = hm
        ? hm.cols.map((_, ci) => {
            const vals = hm.matrix.map((r) => r[ci])
            return { min: Math.min(...vals), max: Math.max(...vals) }
        })
        : []

    return (
        <div className="view">
            <div className="view-header">
                <h1 className="view-title">Workload Analysis</h1>
                <p className="view-subtitle">Resource metric heatmap and VM cohort compute value rankings.</p>
            </div>

            {/* Heatmap */}
            <div className="chart-card" style={{ marginBottom: 20 }}>
                <div className="chart-card-header">
                    <div>
                        <div className="chart-card-title">Resource Heatmap — task_type × metric</div>
                        <div className="chart-card-subtitle">Averaged across all task priorities</div>
                    </div>
                </div>
                {hm ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Task Type</th>
                                    {hm.cols.map((c) => <th key={c}>{METRIC_LABELS[c] ?? c}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {hm.rows.map((row, ri) => (
                                    <tr key={row}>
                                        <td><span className={`badge badge-${row}`}>{row.toUpperCase()}</span></td>
                                        {hm.matrix[ri].map((val, ci) => (
                                            <HeatmapCell key={ci} value={val} col={hm.cols[ci]} min={colRanges[ci]?.min ?? 0} max={colRanges[ci]?.max ?? 1} />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="chart-placeholder">
                        {heatmap.loading ? <span className="loading-pulse">Loading heatmap…</span> : 'No data'}
                    </div>
                )}
            </div>

            {/* Cohort rankings */}
            <div className="chart-card">
                <div className="chart-card-header">
                    <div>
                        <div className="chart-card-title">Compute Value Rankings</div>
                        <div className="chart-card-subtitle">By (task_type × task_priority) cohort</div>
                    </div>
                </div>
                {vms.data?.cohorts?.length ? (
                    <table className="data-table">
                        <thead>
                            <tr><th>Type</th><th>Priority</th><th>Compute Value</th><th>Efficiency</th><th>Throughput</th><th>Power (W)</th><th>Records</th></tr>
                        </thead>
                        <tbody>
                            {vms.data.cohorts.slice(0, 12).map((c, i) => (
                                <tr key={i}>
                                    <td><span className={`badge badge-${c.task_type}`}>{c.task_type}</span></td>
                                    <td><span className={`badge badge-${c.task_priority}`}>{c.task_priority}</span></td>
                                    <td className="mono">{c.avg_compute_value?.toFixed(4)}</td>
                                    <td className="mono">{c.avg_efficiency ? `${(c.avg_efficiency * 100).toFixed(1)}%` : '—'}</td>
                                    <td className="mono">{c.avg_throughput?.toFixed(1)}</td>
                                    <td className="mono">{c.avg_power?.toFixed(0)}</td>
                                    <td className="mono">{c.record_count?.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="chart-placeholder">
                        {vms.loading ? <span className="loading-pulse">Loading cohorts…</span> : 'No data'}
                    </div>
                )}
            </div>
        </div>
    )
}
