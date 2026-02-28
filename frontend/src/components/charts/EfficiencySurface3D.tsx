// src/components/charts/EfficiencySurface3D.tsx
// Recharts multi-line chart showing efficiency trends per task_type.
// Replaced Plotly (requires Node.js 'buffer/' polyfill — incompatible with Vite esbuild).
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { Surface3DResponse } from '../../types'
import { TASK_TYPE_COLORS } from '../../constants'

interface Props {
    data: Surface3DResponse
    height?: number
}

export default function EfficiencySurface3D({ data, height = 260 }: Props) {
    if (!data.surfaces.length) {
        return <div className="chart-placeholder" style={{ height }}>No surface data</div>
    }

    // Build flat array keyed by bucket index
    const maxLen = Math.max(...data.surfaces.map((s) => s.x.length))
    // Subsample for readability — max 60 points
    const step = Math.max(1, Math.floor(maxLen / 60))

    const chartData = Array.from({ length: Math.ceil(maxLen / step) }, (_, i) => {
        const idx = i * step
        const point: Record<string, number | string> = {
            ts: data.surfaces[0]?.x[idx]?.slice(0, 10) ?? `T${idx}`,
        }
        data.surfaces.forEach((surface) => {
            point[surface.task_type] = parseFloat((surface.y[idx] ?? 0).toFixed(4))
        })
        return point
    })

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="ts"
                    tick={{ fontSize: 9, fill: 'var(--text-3)' }}
                    tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                />
                <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                    contentStyle={{
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 8, fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [`${(v * 100).toFixed(2)}%`, name.toUpperCase()]}
                />
                <Legend
                    wrapperStyle={{ fontSize: 11, color: 'var(--text-2)' }}
                    formatter={(value: string) => value.toUpperCase()}
                />
                {data.surfaces.map((surface) => (
                    <Line
                        key={surface.task_type}
                        type="monotone"
                        dataKey={surface.task_type}
                        stroke={TASK_TYPE_COLORS[surface.task_type] ?? '#3b82f6'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: TASK_TYPE_COLORS[surface.task_type] }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}
