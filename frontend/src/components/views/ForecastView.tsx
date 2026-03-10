// src/components/views/ForecastView.tsx
import { useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import { ForecastChart24h, ForecastChart7Day } from '../charts/ForecastChart'
import KpiCard from '../cards/KpiCard'
import ViewHeader from '../shared/ViewHeader'
import { VIEW_DESCRIPTIONS, CHART_DESCRIPTIONS } from '../../constants/descriptions'

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
            <ViewHeader title="Power Forecast" subtitle={VIEW_DESCRIPTIONS.forecast} />

            {d7?.alert && (
                <div style={{
                    padding: '12px 18px', borderRadius: 10, marginBottom: 20,
                    background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                    fontSize: 13, color: 'var(--accent-red)', fontWeight: 500,
                }}>
                    ⚡ {d7.alert_message}
                </div>
            )}

            <div className="chart-grid cols-2" style={{ marginBottom: 16 }}>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div className="chart-card-title">24-Hour Power Forecast</div>
                        {d24 && <span className="badge badge-network">{d24.horizon_hours}h</span>}
                    </div>
                    <div className="chart-card-subtitle">{CHART_DESCRIPTIONS.forecast_24h}</div>
                    {d24
                        ? <ForecastChart24h data={d24} height={260} />
                        : <div className="chart-placeholder">
                            {f24.loading ? <span className="loading-pulse">Training XGBoost model…</span> : 'Unavailable'}
                        </div>
                    }
                </div>

                <div className="chart-card">
                    <div className="chart-card-header">
                        <div className="chart-card-title">7-Day Power Forecast</div>
                        {d7?.alert && <span className="badge badge-high">PEAK ALERT</span>}
                    </div>
                    <div className="chart-card-subtitle">{CHART_DESCRIPTIONS.forecast_7day}</div>
                    {d7
                        ? <ForecastChart7Day data={d7} height={260} />
                        : <div className="chart-placeholder">
                            {f7.loading ? <span className="loading-pulse">Training forecast model…</span> : 'Unavailable'}
                        </div>
                    }
                </div>
            </div>

            {(d24 || d7) && (
                <div className="chart-grid cols-2">
                    {d24 && (
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <div className="chart-card-title">24h Detail — Next 12 Hours</div>
                            </div>
                            <div style={{ marginBottom: 16, padding: '0 16px' }}>
                                <KpiCard
                                    label="Mean Absolute Error (MAE)"
                                    value={d24.mae ? d24.mae.toFixed(1) : '—'}
                                    unit="kW"
                                    color="blue"
                                />
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Time</th><th>Predicted kW</th><th>CI Lower</th><th>CI Upper</th></tr></thead>
                                <tbody>
                                    {d24.series.slice(0, 12).map((pt, i) => (
                                        <tr key={i}>
                                            <td className="mono">{pt.timestamp.slice(11, 16)}</td>
                                            <td className="mono">{pt.predicted_kw.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            <td className="mono" style={{ color: 'var(--text-3)' }}>{pt.ci_lower.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            <td className="mono" style={{ color: 'var(--text-3)' }}>{pt.ci_upper.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {d7 && (
                        <div className="chart-card">
                            <div className="chart-card-header">
                                <div className="chart-card-title">7-Day Summary</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                <KpiCard label="Peak Day" value={d7.peak_day} />
                                <KpiCard
                                    label="Peak Power"
                                    value={d7.peak_predicted_kw.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    unit="kW"
                                    color={d7.alert ? 'red' : 'amber'}
                                />
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Date</th><th>Predicted kW</th><th>95% CI</th></tr></thead>
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
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
