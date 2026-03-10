// src/components/views/ExplorerView.tsx
import { useEffect, useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import ViewHeader from '../shared/ViewHeader'
import { VIEW_DESCRIPTIONS } from '../../constants/descriptions'

export default function ExplorerView() {
    const templates = useDashboardStore((s) => s.explorerResult)
    const runQuery = useDashboardStore((s) => s.runExplorerQuery)
    const [selectedTemplate, setSelectedTemplate] = useState<string>('avg_efficiency_by_type')
    const [customSql, setCustomSql] = useState('')
    const [mode, setMode] = useState<'template' | 'custom'>('template')

    const TEMPLATES = [
        'avg_efficiency_by_type',
        'avg_efficiency_by_priority',
        'waste_by_type',
        'top10_high_power_waiting',
        'cohort_compute_value',
        'efficiency_percentiles',
        'power_by_status',
    ]

    useEffect(() => {
        runQuery({ template: selectedTemplate })
    }, []) // eslint-disable-line

    const handleRun = () => {
        if (mode === 'template') {
            runQuery({ template: selectedTemplate })
        } else if (customSql.trim()) {
            runQuery({ sql: customSql.trim() })
        }
    }

    const result = templates.data

    return (
        <div className="view">
            <ViewHeader title="Data Explorer" subtitle={VIEW_DESCRIPTIONS.explorer} />

            <div className="chart-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <button
                        onClick={() => setMode('template')}
                        style={{
                            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                            background: mode === 'template' ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                            color: mode === 'template' ? 'var(--accent)' : 'var(--text-2)',
                            cursor: 'pointer', fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font)',
                        }}>
                        Named Templates
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        style={{
                            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                            background: mode === 'custom' ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                            color: mode === 'custom' ? 'var(--accent)' : 'var(--text-2)',
                            cursor: 'pointer', fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font)',
                        }}>
                        Custom SQL
                    </button>
                </div>

                {mode === 'template' ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {TEMPLATES.map((t) => (
                            <button
                                key={t}
                                onClick={() => setSelectedTemplate(t)}
                                style={{
                                    padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                                    background: selectedTemplate === t ? 'var(--accent-glow)' : 'var(--bg-surface-2)',
                                    color: selectedTemplate === t ? 'var(--accent)' : 'var(--text-2)',
                                    cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)',
                                }}>
                                {t}
                            </button>
                        ))}
                    </div>
                ) : (
                    <textarea
                        value={customSql}
                        onChange={(e) => setCustomSql(e.target.value)}
                        placeholder="SELECT task_type, AVG(energy_efficiency) FROM telemetry GROUP BY task_type LIMIT 10"
                        style={{
                            width: '100%', height: 90, padding: '10px 14px',
                            background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text-1)', fontFamily: 'var(--mono)',
                            fontSize: 12.5, resize: 'vertical', outline: 'none', marginBottom: 14,
                        }}
                    />
                )}

                <button
                    onClick={handleRun}
                    disabled={templates.loading}
                    style={{
                        padding: '8px 18px', borderRadius: 8,
                        background: 'var(--accent)', color: 'white', border: 'none',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: templates.loading ? .6 : 1,
                        fontFamily: 'var(--font)',
                    }}>
                    {templates.loading ? '⏳ Running…' : '▶ Run Query'}
                </button>

                {templates.error && (
                    <div style={{
                        marginTop: 10, padding: '8px 12px', borderRadius: 7,
                        background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                        color: 'var(--accent-red)', fontSize: 12
                    }}>
                        {templates.error}
                    </div>
                )}
            </div>

            {result && (
                <div className="chart-card">
                    <div className="chart-card-header">
                        <div className="chart-card-title">Query Results</div>
                    </div>
                    <div className="chart-card-subtitle">{result.row_count} rows · {result.columns.join(', ')}</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                            </thead>
                            <tbody>
                                {result.rows.map((row, i) => (
                                    <tr key={i}>
                                        {result.columns.map((c) => (
                                            <td key={c} className="mono" style={{ fontSize: 12 }}>
                                                {row[c] !== null && row[c] !== undefined ? String(row[c]) : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
