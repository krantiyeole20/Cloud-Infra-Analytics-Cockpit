// src/components/charts/RocCurve.tsx
// Recharts LineChart for ROC curve with diagonal reference and AUC badge.
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import type { RocResponse } from '../../types'

interface Props { data: RocResponse; height?: number }

export default function RocCurve({ data, height = 260 }: Props) {
    // Subsample to max 200 points for render perf
    const step = Math.max(1, Math.floor(data.fpr.length / 200))
    const chartData = data.fpr
        .filter((_, i) => i % step === 0)
        .map((fpr, i) => ({
            fpr: parseFloat(fpr.toFixed(3)),
            tpr: parseFloat(data.tpr[i * step]?.toFixed(3) ?? '0'),
        }))

    return (
        <div style={{ position: 'relative' }}>
            {/* AUC badge */}
            <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 10,
                background: 'var(--bg-surface-3)',
                border: `2px solid ${data.auc > 0.7 ? 'var(--accent-green)' : data.auc > 0.55 ? 'var(--accent-amber)' : 'var(--border-strong)'}`,
                borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--mono)',
                color: data.auc > 0.7 ? 'var(--accent-green)' : data.auc > 0.55 ? 'var(--accent-amber)' : 'var(--text-3)',
            }}>
                AUC = {data.auc.toFixed(3)}
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={chartData} margin={{ top: 12, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,235,227,0.05)" />
                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickCount={6}
                        tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                        label={{ value: 'False Positive Rate', fill: 'var(--text-3)', fontSize: 10, position: 'insideBottom', offset: -2 }} />
                    <YAxis type="number" domain={[0, 1]} tickCount={6}
                        tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                        label={{ value: 'TPR', fill: 'var(--text-3)', fontSize: 10, angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                        contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number, n: string) => [v.toFixed(3), n === 'tpr' ? 'True Positive Rate' : 'False Positive Rate']}
                    />
                    {/* Diagonal chance reference */}
                    <Line type="linear" dataKey={(d) => d.fpr} data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]}
                        stroke="var(--text-3)" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                    {/* ROC curve */}
                    <Line type="monotone" dataKey="tpr" stroke="#8b5cf6" strokeWidth={2} dot={false}
                        activeDot={{ r: 3, fill: '#8b5cf6' }} />
                </LineChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
                Diagonal = random classifier baseline
            </div>
        </div>
    )
}
