// src/components/views/AnomalyView.tsx — Phase 7: RocCurve + ShapWaterfall + VmDetailCard
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import RocCurve from '../charts/RocCurve'
import ShapWaterfall from '../charts/ShapWaterfall'
import VmDetailCard from '../cards/VmDetailCard'

export default function AnomalyView() {
    const anomalies = useDashboardStore((s) => s.anomalies)
    const roc = useDashboardStore((s) => s.roc)
    const shap = useDashboardStore((s) => s.shap)
    const fetchAnomalies = useDashboardStore((s) => s.fetchAnomalies)
    const fetchRoc = useDashboardStore((s) => s.fetchRoc)
    const fetchShap = useDashboardStore((s) => s.fetchShap)
    const [selectedVm, setSelectedVm] = useState<string | null>(null)

    useEffect(() => { fetchAnomalies(); fetchRoc() }, [fetchAnomalies, fetchRoc])
    useEffect(() => { if (selectedVm) fetchShap(selectedVm) }, [selectedVm, fetchShap])

    const fa = anomalies.data?.fleet_alert
    const behavioral = anomalies.data?.behavioral ?? []

    return (
        <div className="view">
            <div className="view-header">
                <h1 className="view-title">Anomaly Detection</h1>
                <p className="view-subtitle">Behavioral IsolationForest scores, SHAP explanations, and energy waste fleet alerts.</p>
            </div>

            {/* Fleet alert */}
            {fa && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', borderRadius: 10, marginBottom: 20,
                    background: fa.active ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.08)',
                    border: `1px solid ${fa.active ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.2)'}`,
                }}>
                    <span style={{ fontSize: 22 }}>{fa.active ? '⚡' : '✓'}</span>
                    <div>
                        <div style={{ fontWeight: 600, color: fa.active ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                            {fa.active ? 'Fleet Energy Waste Alert' : 'Fleet Waste Normal'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            {fa.waste_pct?.toFixed(2)}% waste rate ({fa.vms_wasting_energy?.toLocaleString()} VMs) — threshold {fa.threshold_pct}%
                        </div>
                    </div>
                </div>
            )}

            <div className="chart-grid cols-2" style={{ marginBottom: 16 }}>
                {/* Behavioral anomaly table */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Behavioral Anomalies</div>
                            <div className="chart-card-subtitle">Click a row to load SHAP waterfall</div>
                        </div>
                        {behavioral.length > 0 && <span className="badge badge-high">{behavioral.length}</span>}
                    </div>
                    {behavioral.length ? (
                        <table className="data-table">
                            <thead><tr><th>Type</th><th>Priority</th><th>Score</th><th>Power</th><th>CPU</th><th>SHAP</th></tr></thead>
                            <tbody>
                                {behavioral.slice(0, 8).map((row, i) => (
                                    <tr key={i} style={{ cursor: 'pointer', background: row.vm_id === selectedVm ? 'rgba(59,130,246,.08)' : undefined }}
                                        onClick={() => setSelectedVm(row.vm_id === selectedVm ? null : row.vm_id)}>
                                        <td><span className={`badge badge-${row.task_type}`}>{row.task_type}</span></td>
                                        <td><span className={`badge badge-${row.task_priority}`}>{row.task_priority}</span></td>
                                        <td className="mono" style={{ color: (row.behavioral_anomaly_score ?? 0) > .8 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                                            {row.behavioral_anomaly_score?.toFixed(3)}
                                        </td>
                                        <td className="mono">{row.power_consumption?.toFixed(0)}</td>
                                        <td className="mono">{row.cpu_usage?.toFixed(1)}%</td>
                                        <td style={{ fontSize: 11 }}>{row.vm_id === selectedVm ? '▼' : '▶'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="chart-placeholder">
                            {anomalies.loading ? <span className="loading-pulse">Scoring…</span> : 'No anomalies detected'}
                        </div>
                    )}
                </div>

                {/* ROC curve */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Completion Predictor ROC</div>
                            <div className="chart-card-subtitle">LightGBM · held-out validation</div>
                        </div>
                    </div>
                    {roc.data
                        ? <RocCurve data={roc.data} height={260} />
                        : <div className="chart-placeholder">
                            {roc.loading ? <span className="loading-pulse">Computing ROC…</span> : 'Unavailable'}
                        </div>
                    }
                </div>
            </div>

            {/* SHAP waterfall / VmDetailCard panel */}
            {selectedVm && (
                <div className="chart-card" style={{
                    border: '1px solid var(--border-strong)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    position: 'fixed', right: 20, top: 70, bottom: 20, width: 440,
                    zIndex: 100, display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-surface-1)'
                }}>
                    <div className="chart-card-header" style={{ flexShrink: 0 }}>
                        <div>
                            <div className="chart-card-title">VM Investigation Panel</div>
                            <div className="chart-card-subtitle">{selectedVm}</div>
                        </div>
                        <button onClick={() => setSelectedVm(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    </div>

                    <div style={{ padding: '0 20px', flex: 1, overflowY: 'auto' }}>
                        <VmDetailCard
                            vmId={selectedVm}
                            taskType={behavioral.find(b => b.vm_id === selectedVm)?.task_type ?? 'compute'}
                            computeValue={behavioral.find(b => b.vm_id === selectedVm)?.compute_value ?? 0.5}
                            energyEfficiency={behavioral.find(b => b.vm_id === selectedVm)?.energy_efficiency ?? 0.5}
                            behavioralScore={behavioral.find(b => b.vm_id === selectedVm)?.behavioral_anomaly_score ?? 0.8}
                            completionProb={0.65} // Mock or fetch from completion model if available
                            onShapRequest={(id) => fetchShap(id)}
                        />

                        {shap.data && shap.data.vm_id === selectedVm ? (
                            <div style={{ marginTop: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>SHAP Explanations</div>
                                <ShapWaterfall data={shap.data} height={300} />
                            </div>
                        ) : (
                            <div style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>
                                {shap.loading ? <span className="loading-pulse">Computing SHAP…</span> : 'Click View SHAP Breakdown to load explanations.'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Waste samples */}
            {anomalies.data?.waste_samples?.length && (
                <div className="chart-card" style={{ marginTop: 16 }}>
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Waste Anomaly Samples</div>
                            <div className="chart-card-subtitle">VMs above idle power threshold</div>
                        </div>
                    </div>
                    <table className="data-table">
                        <thead><tr><th>VM ID</th><th>Type</th><th>Power (W)</th><th>Efficiency</th><th>Compute Value</th></tr></thead>
                        <tbody>
                            {anomalies.data.waste_samples.slice(0, 6).map((row, i) => (
                                <tr key={i}>
                                    <td className="mono" style={{ fontSize: 11 }}>{row.vm_id?.slice(0, 12)}…</td>
                                    <td><span className={`badge badge-${row.task_type}`}>{row.task_type}</span></td>
                                    <td className="mono">{row.power_consumption?.toFixed(0)}</td>
                                    <td className="mono">{(row.energy_efficiency * 100).toFixed(1)}%</td>
                                    <td className="mono">{row.compute_value?.toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
