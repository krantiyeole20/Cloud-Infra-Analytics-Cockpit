// src/components/views/OverviewView.tsx
import { useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import MetricTimeSeries from '../charts/MetricTimeSeries'
import TopologyGraph from '../charts/TopologyGraph'
import KpiCard from '../cards/KpiCard'
import ViewHeader from '../shared/ViewHeader'
import { VIEW_DESCRIPTIONS, KPI_DESCRIPTIONS, CHART_DESCRIPTIONS } from '../../constants/descriptions'

export default function OverviewView() {
    const kpis = useDashboardStore((s) => s.kpis)
    const anomalies = useDashboardStore((s) => s.anomalies)
    const topology = useDashboardStore((s) => s.topology)
    const fetchKpis = useDashboardStore((s) => s.fetchKpis)
    const fetchAnomalies = useDashboardStore((s) => s.fetchAnomalies)
    const fetchTopology = useDashboardStore((s) => s.fetchTopology)
    const fetchTimeSeries = useDashboardStore((s) => s.fetchTimeSeries)

    useEffect(() => {
        fetchKpis(); fetchAnomalies(); fetchTopology()
        fetchTimeSeries('energy_efficiency', 'day')
    }, [fetchKpis, fetchAnomalies, fetchTopology, fetchTimeSeries])

    const d = kpis.data
    const fa = anomalies.data?.fleet_alert

    return (
        <div className="view">
            <ViewHeader title="Fleet Overview" subtitle={VIEW_DESCRIPTIONS.overview} />

            {fa?.active && (
                <div className="fleet-banner" style={{ marginBottom: 20, borderRadius: 10, border: '1px solid rgba(239,68,68,.3)' }}>
                    ⚡ Energy waste alert — {fa.waste_pct?.toFixed(1)}% of VMs exceeding power threshold
                    ({fa.vms_wasting_energy?.toLocaleString()} VMs idle-burning power)
                </div>
            )}

            <div className="kpi-grid">
                <KpiCard
                    label="Avg Energy Efficiency"
                    value={d ? `${(d.avg_energy_efficiency * 100).toFixed(1)}%` : '—'}
                    sub="Higher is better"
                    color={d && d.avg_energy_efficiency > 0.6 ? 'green' : 'amber'}
                    tooltip={KPI_DESCRIPTIONS.avg_energy_efficiency}
                />
                <KpiCard
                    label="Avg Compute Value"
                    value={d ? d.avg_compute_value.toFixed(3) : '—'}
                    sub="Instructions per watt"
                    color="blue"
                    tooltip={KPI_DESCRIPTIONS.avg_compute_value}
                />
                <KpiCard
                    label="Fleet Power"
                    value={d ? `${(d.fleet_power_kw / 1000).toFixed(1)} MW` : '—'}
                    sub="Total consumption"
                    tooltip={KPI_DESCRIPTIONS.fleet_power_kw}
                />
                <KpiCard
                    label="Energy Waste"
                    value={d ? `${d.vms_wasting_energy_pct.toFixed(1)}%` : '—'}
                    sub={d ? `${d.vms_wasting_energy.toLocaleString()} VMs` : ''}
                    color={d && d.vms_wasting_energy_pct > 5 ? 'red' : 'green'}
                    tooltip={KPI_DESCRIPTIONS.vms_wasting_energy_pct}
                />
                <KpiCard
                    label="Behavioral Anomalies"
                    value={d ? d.behavioral_anomalies.toString() : '—'}
                    sub="IsolationForest detections"
                    color={d && d.behavioral_anomalies > 0 ? 'amber' : 'green'}
                    tooltip={KPI_DESCRIPTIONS.behavioral_anomalies}
                />
                <KpiCard
                    label="Total Records"
                    value={d ? `${(d.total_vm_records / 1_000_000).toFixed(2)}M` : '—'}
                    sub="VM telemetry rows"
                    tooltip={KPI_DESCRIPTIONS.total_vm_records}
                />
            </div>

            {/* Charts row */}
            <div className="chart-grid cols-2" style={{ marginBottom: 16 }}>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div className="chart-card-title">Energy Efficiency Over Time</div>
                    </div>
                    <div className="chart-card-subtitle">{CHART_DESCRIPTIONS.energy_efficiency_timeseries}</div>
                    <MetricTimeSeries metric="energy_efficiency" bucket="day" height={220} />
                </div>

                <div className="chart-card">
                    <div className="chart-card-header">
                        <div className="chart-card-title">VM Cluster Topology</div>
                    </div>
                    <div className="chart-card-subtitle">{CHART_DESCRIPTIONS.topology_graph}</div>
                    {topology.data
                        ? <TopologyGraph data={topology.data} height={220} />
                        : <div className="chart-placeholder">
                            {topology.loading ? <span className="loading-pulse">Loading topology…</span> : 'No data'}
                        </div>
                    }
                </div>
            </div>

            {/* Waste anomaly table */}
            <div className="chart-card">
                <div className="chart-card-header">
                    <div className="chart-card-title">Top Waste Anomalies</div>
                </div>
                <div className="chart-card-subtitle">{CHART_DESCRIPTIONS.waste_anomaly_table}</div>
                {anomalies.data?.waste_samples?.length ? (
                    <table className="data-table">
                        <thead><tr><th>VM ID</th><th>Type</th><th>Priority</th><th>Power (W)</th><th>Efficiency</th><th>Compute Value</th></tr></thead>
                        <tbody>
                            {anomalies.data.waste_samples.slice(0, 8).map((row, i) => (
                                <tr key={i}>
                                    <td className="mono" style={{ fontSize: 11 }}>{row.vm_id?.slice(0, 12)}…</td>
                                    <td><span className={`badge badge-${row.task_type}`}>{row.task_type}</span></td>
                                    <td><span className="badge badge-medium">—</span></td>
                                    <td className="mono">{row.power_consumption?.toFixed(0)}</td>
                                    <td className="mono">{(row.energy_efficiency * 100).toFixed(1)}%</td>
                                    <td className="mono">{row.compute_value?.toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="chart-placeholder">
                        {anomalies.loading ? <span className="loading-pulse">Loading anomalies…</span> : 'No waste anomalies detected'}
                    </div>
                )}
            </div>
        </div>
    )
}
