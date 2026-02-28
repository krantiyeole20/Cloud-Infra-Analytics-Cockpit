// src/components/views/WorkloadView.tsx — Phase 6: WorkloadHeatmap + EfficiencySurface3D
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import WorkloadHeatmap from '../charts/WorkloadHeatmap'
import EfficiencySurface3D from '../charts/EfficiencySurface3D'
import MetricTimeSeries from '../charts/MetricTimeSeries'
import type { Surface3DResponse } from '../../types'

export default function WorkloadView() {
    const heatmap = useDashboardStore((s) => s.heatmap)
    const vms = useDashboardStore((s) => s.vms)
    const fetchHeatmap = useDashboardStore((s) => s.fetchHeatmap)
    const fetchDistribution = useDashboardStore((s) => s.fetchDistribution)
    const fetchVms = useDashboardStore((s) => s.fetchVms)
    const fetchTimeSeries = useDashboardStore((s) => s.fetchTimeSeries)
    const [surface3d, setSurface3d] = useState<Surface3DResponse | null>(null)

    useEffect(() => {
        fetchHeatmap()
        fetchDistribution()
        fetchVms()
        fetchTimeSeries('cpu_usage', 'day')
        // Fetch surface3d directly — no store slot, surface data is view-local
        import('../../api/client').then(({ getSurface3D }) =>
            getSurface3D('day').then(setSurface3d).catch(() => { })
        )
    }, [fetchHeatmap, fetchDistribution, fetchVms, fetchTimeSeries])

    return (
        <div className="view">
            <div className="view-header">
                <h1 className="view-title">Workload Analysis</h1>
                <p className="view-subtitle">Resource heatmap, efficiency trends by task type, and compute value cohort rankings.</p>
            </div>

            {/* Heatmap + efficiency trends */}
            <div className="chart-grid cols-2" style={{ marginBottom: 16 }}>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Resource Heatmap</div>
                            <div className="chart-card-subtitle">task_type × metric — averaged across all priorities</div>
                        </div>
                    </div>
                    {heatmap.data
                        ? <WorkloadHeatmap data={heatmap.data} height={180} />
                        : <div className="chart-placeholder">
                            {heatmap.loading ? <span className="loading-pulse">Loading heatmap…</span> : 'No data'}
                        </div>
                    }
                </div>

                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Efficiency Trends by Task Type</div>
                            <div className="chart-card-subtitle">Daily avg — io / network / compute</div>
                        </div>
                    </div>
                    {surface3d
                        ? <EfficiencySurface3D data={surface3d} height={260} />
                        : <div className="chart-placeholder"><span className="loading-pulse">Loading trends…</span></div>
                    }
                </div>
            </div>

            {/* CPU time-series */}
            <div className="chart-card" style={{ marginBottom: 16 }}>
                <div className="chart-card-header">
                    <div>
                        <div className="chart-card-title">CPU Usage Over Time</div>
                        <div className="chart-card-subtitle">Daily average across fleet</div>
                    </div>
                </div>
                <MetricTimeSeries metric="cpu_usage" bucket="day" height={200} />
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
