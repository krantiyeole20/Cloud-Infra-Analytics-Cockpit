// src/components/charts/MetricTimeSeries.tsx
import {
    ResponsiveContainer, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, AreaChart,
} from 'recharts'
import { useEffect, useMemo } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import { METRIC_LABELS } from '../../constants'
import type { TaskType } from '../../types'

interface Props {
    metric?: string
    bucket?: 'hour' | 'day' | 'week'
    taskType?: TaskType
    height?: number
    title?: string
}

export default function MetricTimeSeries({
    metric = 'energy_efficiency',
    bucket = 'day',
    taskType,
    height = 280,
    title,
}: Props) {
    const timeSeries = useDashboardStore((s) => s.timeSeries)
    const fetchTimeSeries = useDashboardStore((s) => s.fetchTimeSeries)

    useEffect(() => {
        fetchTimeSeries(metric, bucket)
    }, [metric, bucket, taskType, fetchTimeSeries])

    const data = useMemo(() => {
        if (!timeSeries.data?.series) return []
        return timeSeries.data.series.map((pt) => ({
            ts: pt.timestamp.slice(0, 10),
            value: pt.value,
            count: pt.record_count,
        }))
    }, [timeSeries.data])

    const label = title ?? METRIC_LABELS[metric] ?? metric
    const isEfficiency = metric === 'energy_efficiency'
    const lineColor = isEfficiency ? '#10b981' : '#f59e0b'

    const formatDate = (v: string) => {
        try {
            const d = new Date(v + 'T00:00:00')
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        } catch {
            return v
        }
    }

    if (timeSeries.loading) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                <span className="loading-pulse">Loading {label}…</span>
            </div>
        )
    }

    if (!data.length) {
        return <div className="chart-placeholder" style={{ height }}>No time-series data</div>
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <defs>
                    <linearGradient id="grad-ts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,235,227,0.05)" />
                <XAxis
                    dataKey="ts"
                    tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={formatDate}
                />
                <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={(v: number) =>
                        isEfficiency
                            ? `${(v * 100).toFixed(0)}%`
                            : v.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    }
                    label={{
                        value: isEfficiency ? 'Efficiency' : label,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 14,
                        style: { fill: 'var(--text-3)', fontSize: 9 },
                    }}
                />
                <Tooltip
                    contentStyle={{
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 8,
                        fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--text-2)', marginBottom: 4 }}
                    labelFormatter={formatDate}
                    formatter={(v: number) =>
                        isEfficiency
                            ? [`${(v * 100).toFixed(2)}%`, label]
                            : [v.toLocaleString(undefined, { maximumFractionDigits: 2 }), label]
                    }
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2}
                    fill="url(#grad-ts)"
                    dot={false}
                    activeDot={{ r: 4, fill: lineColor }}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
