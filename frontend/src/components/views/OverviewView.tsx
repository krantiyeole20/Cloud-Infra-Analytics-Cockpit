// src/components/views/OverviewView.tsx
import { useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="kpi-card">
            <div className="kpi-card-label">{label}</div>
            <div className={`kpi-card-value ${color ?? ''}`}>{value}</div>
            {sub && <div className="kpi-card-sub">{sub}</div>}
        </div>
    )
}

export default function OverviewView() {
    const kpis = useDashboardStore((s) => s.kpis)
    const anomalies = useDashboardStore((s) => s.anomalies)
    const topology = useDashboardStore((s) => s.topology)
    const fetchKpis = useDashboardStore((s) => s.fetchKpis)
    const fetchAnomalies = useDashboardStore((s) => s.fetchAnomalies)
    const fetchTopology = useDashboardStore((s) => s.fetchTopology)

    useEffect(() => {
        fetchKpis()
        fetchAnomalies()
        fetchTopology()
    }, [fetchKpis, fetchAnomalies, fetchTopology])

    const d = kpis.data
    const fa = anomalies.data?.fleet_alert

    return (
        <div className="view">
            <div className="view-header">
                <h1 className="view-title">Fleet Overview</h1>
                <p className="view-subtitle">
                    Real-time energy efficiency and compute value intelligence across all VM cohorts.
                </p>
            </div>

            {/* Fleet alert */}
            {fa?.active && (
                <div className="fleet-banner" style={{ marginBottom: 20, borderRadius: 10, border: '1px solid rgba(239,68,68,.3)' }}>
                    ⚡ Energy waste alert — {fa.waste_pct?.toFixed(1)}% of VMs exceeding power threshold
                    ({fa.vms_wasting_energy?.toLocaleString()} VMs idle-burning power)
                </div>
            )}

            {/* KPI Grid */}
            <div className="kpi-grid">
                <KpiCard
                    label="Avg Energy Efficiency"
                    value={d ? `${(d.avg_energy_efficiency * 100).toFixed(1)}%` : '—'}
                    sub="Higher is better"
                    color={d && d.avg_energy_efficiency > 0.6 ? 'green' : 'amber'}
                />
                <KpiCard
                    label="Avg Compute Value"
                    value={d ? d.avg_compute_value.toFixed(3) : '—'}
                    sub="Instructions per watt"
                    color="blue"
                />
                <KpiCard
                    label="Fleet Power"
                    value={d ? `${(d.fleet_power_kw / 1000).toFixed(1)} MW` : '—'}
                    sub="Total consumption"
                />
                <KpiCard
                    label="Energy Waste"
                    value={d ? `${d.vms_wasting_energy_pct.toFixed(1)}%` : '—'}
                    sub={d ? `${d.vms_wasting_energy.toLocaleString()} VMs` : ''}
                    color={d && d.vms_wasting_energy_pct > 5 ? 'red' : 'green'}
                />
                <KpiCard
                    label="Behavioral Anomalies"
                    value={d ? d.behavioral_anomalies.toString() : '—'}
                    sub="IsolationForest detections"
                    color={d && d.behavioral_anomalies > 0 ? 'amber' : 'green'}
                />
                <KpiCard
                    label="Total Records"
                    value={d ? `${(d.total_vm_records / 1_000_000).toFixed(2)}M` : '—'}
                    sub="VM telemetry rows"
                />
            </div>

            {/* Topology + anomaly snapshot */}
            <div className="chart-grid cols-2">
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">VM Cohort Topology</div>
                            <div className="chart-card-subtitle">Aggregated by task_type (3 clusters)</div>
                        </div>
                    </div>
                    {topology.data ? (
                        <div style={{ display: 'flex', gap: 12 }}>
                            {topology.data.nodes.map((n) => (
                                <div key={n.id} className="chart-card" style={{ flex: 1, margin: 0, padding: 14 }}>
                                    <div className={`badge badge-${n.task_type}`} style={{ marginBottom: 8 }}>{n.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                        {(n.vm_count / 1_000_000).toFixed(2)}M records<br />
                                        Efficiency: {(n.stats.avg_efficiency * 100).toFixed(1)}%<br />
                                        Waste: {n.stats.waste_pct.toFixed(1)}%<br />
                                        Power: {n.stats.avg_power.toFixed(0)} W avg
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="chart-placeholder">
                            {topology.loading ? <span className="loading-pulse">Loading topology…</span> : 'Topology data unavailable'}
                        </div>
                    )}
                </div>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Waste Anomalies</div>
                            <div className="chart-card-subtitle">Top idle-burning VMs</div>
                        </div>
                    </div>
                    {anomalies.data?.waste_samples?.length ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>VM ID</th><th>Type</th><th>Power (W)</th><th>Efficiency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {anomalies.data.waste_samples.slice(0, 6).map((row, i) => (
                                    <tr key={i}>
                                        <td className="mono" style={{ fontSize: 11 }}>{row.vm_id?.slice(0, 8)}…</td>
                                        <td><span className={`badge badge-${row.task_type}`}>{row.task_type}</span></td>
                                        <td className="mono">{row.power_consumption?.toFixed(0)}</td>
                                        <td className="mono">{(row.energy_efficiency * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="chart-placeholder">
                            {anomalies.loading ? <span className="loading-pulse">Loading anomalies…</span> : 'No waste anomalies'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
