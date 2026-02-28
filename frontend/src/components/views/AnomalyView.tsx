// src/components/views/AnomalyView.tsx
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

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
    const shapData = shap.data

    return (
        <div className="view">
            <div className="view-header">
                <h1 className="view-title">Anomaly Detection</h1>
                <p className="view-subtitle">Behavioral IsolationForest + energy waste fleet alerts.</p>
            </div>

            {/* Fleet alert banner */}
            {fa && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', borderRadius: 10, marginBottom: 20,
                    background: fa.active ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.08)',
                    border: `1px solid ${fa.active ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.2)'}`,
                }}>
                    <span style={{ fontSize: 20 }}>{fa.active ? '⚡' : '✓'}</span>
                    <div>
                        <div style={{ fontWeight: 600, color: fa.active ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                            {fa.active ? 'Fleet Energy Waste Alert' : 'Fleet Waste Normal'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            {fa.waste_pct?.toFixed(2)}% waste rate
                            ({fa.vms_wasting_energy?.toLocaleString()} VMs) — threshold {fa.threshold_pct}%
                        </div>
                    </div>
                </div>
            )}

            <div className="chart-grid cols-2" style={{ marginBottom: 20 }}>
                {/* Behavioral anomalies */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">Behavioral Anomalies</div>
                            <div className="chart-card-subtitle">IsolationForest score per cohort (click row for SHAP)</div>
                        </div>
                        {behavioral.length > 0 && (
                            <span className="badge badge-high">{behavioral.length}</span>
                        )}
                    </div>
                    {behavioral.length ? (
                        <table className="data-table">
                            <thead><tr><th>Type</th><th>Priority</th><th>Score</th><th>Power</th><th>CPU</th></tr></thead>
                            <tbody>
                                {behavioral.slice(0, 8).map((row, i) => (
                                    <tr key={i} style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedVm(row.vm_id === selectedVm ? null : row.vm_id)}>
                                        <td><span className={`badge badge-${row.task_type}`}>{row.task_type}</span></td>
                                        <td><span className={`badge badge-${row.task_priority}`}>{row.task_priority}</span></td>
                                        <td className="mono" style={{ color: row.behavioral_anomaly_score > .8 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                                            {row.behavioral_anomaly_score?.toFixed(3)}
                                        </td>
                                        <td className="mono">{row.power_consumption?.toFixed(0)}</td>
                                        <td className="mono">{row.cpu_usage?.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="chart-placeholder">
                            {anomalies.loading ? <span className="loading-pulse">Scoring anomalies…</span> : 'No anomalies detected'}
                        </div>
                    )}
                </div>

                {/* ROC + SHAP */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div>
                                <div className="chart-card-title">Completion Predictor ROC</div>
                                <div className="chart-card-subtitle">LightGBM AUC on held-out validation</div>
                            </div>
                            {roc.data && <span className="badge badge-network">AUC {roc.data.auc.toFixed(3)}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
                            {roc.data
                                ? `ROC curve ready — ${roc.data.fpr.length} points, AUC = ${roc.data.auc.toFixed(4)}.
                   Chart component coming in Phase 6.`
                                : roc.loading ? <span className="loading-pulse">Computing ROC…</span>
                                    : 'ROC data unavailable'}
                        </div>
                    </div>

                    {selectedVm && (
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <div>
                                    <div className="chart-card-title">SHAP Attributions</div>
                                    <div className="chart-card-subtitle">{selectedVm.slice(0, 16)}…</div>
                                </div>
                            </div>
                            {shapData && shapData.vm_id === selectedVm ? (
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
                                        Base: {shapData.base_value.toFixed(4)} → Final: {shapData.final_value.toFixed(4)}
                                    </div>
                                    {shapData.features.slice(0, 5).map((f, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-3)', width: 140, flexShrink: 0 }}>{f.name}</span>
                                            <div style={{
                                                height: 6, borderRadius: 3, flexShrink: 0,
                                                width: `${Math.min(Math.abs(f.shap_impact) * 80, 100)}px`,
                                                background: (f.shap_impact ?? 0) > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                                            }} />
                                            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>
                                                {(f.shap_impact > 0 ? '+' : '')}{f.shap_impact?.toFixed(4)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="chart-placeholder">
                                    {shap.loading ? <span className="loading-pulse">Computing SHAP…</span> : 'Fetching…'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
