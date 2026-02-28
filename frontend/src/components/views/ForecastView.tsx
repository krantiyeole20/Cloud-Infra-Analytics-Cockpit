// src/components/views/ForecastView.tsx
import { useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

export default function ForecastView() {
    const f24 = useDashboardStore((s) => s.forecast24h)
    const f7 = useDashboardStore((s) => s.forecast7day)
    const fetchForecast24h = useDashboardStore((s) => s.fetchForecast24h)
    const fetchForecast7Day = useDashboardStore((s) => s.fetchForecast7Day)

    useEffect(() => { fetchForecast24h(); fetchForecast7Day() }, [fetchForecast24h, fetchForecast7Day])

    const d24 = f24.data
    const d7 = f7.data

    return (
        <div className="view">
            <div className="view-header">
                <h1 className="view-title">Power Forecast</h1>
                <p className="view-subtitle">24-hour XGBoost + 7-day Fourier linear forecast with 95% confidence intervals.</p>
            </div>

            {/* 7-day alert */}
            {d7?.alert && (
                <div style={{
                    padding: '12px 18px', borderRadius: 10, marginBottom: 20,
                    background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                    fontSize: 13, color: 'var(--accent-red)', fontWeight: 500
                }}>
                    ⚡ {d7.alert_message}
                </div>
            )}

            <div className="chart-grid cols-2" style={{ marginBottom: 20 }}>
                {/* 24h summary */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">24-Hour Forecast</div>
                            <div className="chart-card-subtitle">XGBoost · lag 1/6/24h · MAE ≈ {d24?.mae?.toFixed(1) ?? '—'} kW</div>
                        </div>
                        {d24 && <span className="badge badge-network">{d24.horizon_hours}h horizon</span>}
                    </div>
                    {d24?.series?.length ? (
                        <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead><tr><th>Time</th><th>Pred kW</th><th>CI Lower</th><th>CI Upper</th></tr></thead>
                                <tbody>
                                    {d24.series.slice(0, 12).map((pt, i) => (
                                        <tr key={i}>
                                            <td className="mono" style={{ fontSize: 11 }}>{pt.timestamp.slice(11, 16)}</td>
                                            <td className="mono">{pt.predicted_kw.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            <td className="mono" style={{ color: 'var(--text-3)' }}>{pt.ci_lower.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            <td className="mono" style={{ color: 'var(--text-3)' }}>{pt.ci_upper.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {d24.series.length > 12 && (
                                <div style={{ textAlign: 'center', padding: '8px', fontSize: 11, color: 'var(--text-3)' }}>
                                    +{d24.series.length - 12} more hours · Recharts chart coming in Phase 6
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="chart-placeholder">
                            {f24.loading ? <span className="loading-pulse">Training forecast model…</span> : 'Forecast unavailable'}
                        </div>
                    )}
                </div>

                {/* 7-day summary */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">7-Day Forecast</div>
                            <div className="chart-card-subtitle">Linear Fourier seasonality (7-day + 3.5-day periods)</div>
                        </div>
                        {d7?.alert && <span className="badge badge-high">PEAK ALERT</span>}
                    </div>
                    {d7 && (
                        <div style={{ marginBottom: 14, display: 'flex', gap: 14 }}>
                            <div className="kpi-card" style={{ flex: 1, padding: 12 }}>
                                <div className="kpi-card-label">Peak Day</div>
                                <div className="kpi-card-value" style={{ fontSize: 16 }}>{d7.peak_day}</div>
                            </div>
                            <div className="kpi-card" style={{ flex: 1, padding: 12 }}>
                                <div className="kpi-card-label">Peak Power</div>
                                <div className={`kpi-card-value ${d7.alert ? 'red' : 'amber'}`} style={{ fontSize: 16 }}>
                                    {d7.peak_predicted_kw.toLocaleString(undefined, { maximumFractionDigits: 0 })} kW
                                </div>
                            </div>
                        </div>
                    )}
                    {d7?.series?.length ? (
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Pred kW</th><th>95% CI</th></tr></thead>
                            <tbody>
                                {d7.series.map((pt, i) => (
                                    <tr key={i} style={{ background: pt.date === d7.peak_day ? 'rgba(239,68,68,.06)' : undefined }}>
                                        <td className="mono">{pt.date}</td>
                                        <td className="mono" style={{ color: pt.date === d7.peak_day ? 'var(--accent-red)' : '' }}>
                                            {pt.predicted_kw.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                            [{pt.ci_lower.toLocaleString(undefined, { maximumFractionDigits: 0 })} – {pt.ci_upper.toLocaleString(undefined, { maximumFractionDigits: 0 })}]
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="chart-placeholder">
                            {f7.loading ? <span className="loading-pulse">Training forecast model…</span> : 'Forecast unavailable'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
