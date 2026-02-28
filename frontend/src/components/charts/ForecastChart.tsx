// src/components/charts/ForecastChart.tsx
// Recharts AreaChart for 24h and 7-day power forecasts with CI bands.
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import type { Forecast24hResponse, Forecast7DayResponse } from '../../types'

interface Props24h { data: Forecast24hResponse; height?: number }
interface Props7d { data: Forecast7DayResponse; height?: number }

export function ForecastChart24h({ data, height = 260 }: Props24h) {
    const chartData = data.series.map((pt) => ({
        ts: pt.timestamp.slice(11, 16),
        predicted: pt.predicted_kw,
        ci_lower: pt.ci_lower,
        ci_upper: pt.ci_upper,
    }))

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="grad-fc24" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-ci" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ts" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                <Tooltip
                    contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [
                        `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} kW`,
                        name === 'predicted' ? 'Forecast' : name === 'ci_upper' ? '95% CI Upper' : '95% CI Lower',
                    ]}
                />
                {/* CI band */}
                <Area type="monotone" dataKey="ci_upper" stroke="none" fill="url(#grad-ci)" />
                <Area type="monotone" dataKey="ci_lower" stroke="none" fill="var(--bg-base)" />
                {/* Forecast line */}
                <Area type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2}
                    fill="url(#grad-fc24)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export function ForecastChart7Day({ data, height = 260 }: Props7d) {
    const chartData = data.series.map((pt) => ({
        date: pt.date.slice(5),  // MM-DD
        predicted: pt.predicted_kw,
        ci_lower: pt.ci_lower,
        ci_upper: pt.ci_upper,
        isPeak: pt.date === data.peak_day,
    }))

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="grad-fc7" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                <Tooltip
                    contentStyle={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} kW`, 'Forecast']}
                />
                {data.peak_day && (
                    <ReferenceLine
                        x={data.peak_day.slice(5)}
                        stroke="#ef4444"
                        strokeDasharray="4 2"
                        label={{ value: 'PEAK', fill: '#ef4444', fontSize: 10, position: 'top' }}
                    />
                )}
                <Area type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2}
                    fill="url(#grad-fc7)" dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
            </AreaChart>
        </ResponsiveContainer>
    )
}
