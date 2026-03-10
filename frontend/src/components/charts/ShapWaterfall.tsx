// src/components/charts/ShapWaterfall.tsx
// Horizontal Recharts BarChart showing SHAP feature attributions.
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts'
import type { ShapResponse } from '../../types'

interface Props { data: ShapResponse; height?: number }

export default function ShapWaterfall({ data, height = 240 }: Props) {
    // Sort by absolute impact and take top 8
    const sorted = [...data.features]
        .filter((f) => f.shap_impact != null)
        .sort((a, b) => Math.abs(b.shap_impact) - Math.abs(a.shap_impact))
        .slice(0, 8)

    const chartData = sorted.map((f) => ({
        name: f.name.replace(/_/g, ' '),
        impact: parseFloat((f.shap_impact ?? 0).toFixed(4)),
        value: f.value,
    }))

    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5 }}>
                Feature impact on anomaly score.{' '}
                <span style={{ color: 'var(--accent-red)' }}>Red = pushes prediction up</span>
                {' · '}
                <span style={{ color: 'var(--accent-green)' }}>Green = pulls prediction down</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: 'var(--text-3)' }}>
                <span>Base: <strong style={{ color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>{data.base_value.toFixed(4)}</strong></span>
                <span>→</span>
                <span>Final: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{data.final_value.toFixed(4)}</strong></span>
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 20, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,235,227,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                        tickFormatter={(v: number) => v.toFixed(3)} />
                    <YAxis type="category" dataKey="name" width={120}
                        tick={{ fontSize: 10, fill: 'var(--text-2)' }} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number, _: string, entry: any) => [
                            `SHAP: ${(v > 0 ? '+' : '')}${v.toFixed(4)} | Feature val: ${entry.payload?.value?.toFixed?.(3) ?? v}`,
                            'Impact'
                        ]}
                    />
                    <ReferenceLine x={0} stroke="var(--border-strong)" strokeWidth={1} />
                    <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                        {chartData.map((d, i) => (
                            <Cell
                                key={i}
                                fill={d.impact > 0 ? '#ef4444' : '#10b981'}
                                fillOpacity={0.8}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
