// src/components/charts/WorkloadHeatmap.tsx
// Pure SVG heatmap — task_type × metric matrix with colorblind-safe color scale.
import type { WorkloadHeatmapResponse } from '../../types'

interface Props {
    data: WorkloadHeatmapResponse
    height?: number
}

const METRIC_SHORT: Record<string, string> = {
    avg_cpu: 'CPU', avg_memory: 'Mem', avg_network: 'Net',
    avg_power: 'Pwr', avg_efficiency: 'Eff', avg_compute_value: 'CV', avg_throughput: 'Tput',
}

const EFFICIENCY_COLS = new Set(['avg_efficiency', 'avg_compute_value'])
const POWER_COLS = new Set(['avg_power'])

// Colorblind-safe binned color scale
function getColor(t: number, col: string): string {
    if (EFFICIENCY_COLS.has(col)) {
        // Viridis-inspired: purple → teal → yellow-green (colorblind safe)
        if (t < 0.33)  return `rgba(68,1,84,${0.15 + t * 0.5})`
        if (t < 0.66)  return `rgba(49,104,142,${0.25 + t * 0.45})`
        if (t < 0.85)  return `rgba(53,183,121,${0.3 + t * 0.4})`
        return `rgba(253,231,37,${0.35 + t * 0.35})`
    } else if (POWER_COLS.has(col)) {
        // Red scale — low power = lighter (good), high = saturated (costly)
        const inv = 1 - t
        const a = 0.08 + inv * 0.5
        return `rgba(239,68,68,${a})`
    } else {
        // Amber scale for utilization metrics
        const a = 0.06 + t * 0.45
        return `rgba(245,158,11,${a})`
    }
}

const IBM_PLEX = 'IBM Plex Sans, system-ui, sans-serif'

export default function WorkloadHeatmap({ data, height = 160 }: Props) {
    const { rows, cols, matrix } = data

    const colRanges = cols.map((_, ci) => {
        const vals = matrix.map((r) => r[ci])
        const mn = Math.min(...vals)
        const mx = Math.max(...vals)
        return { min: mn, max: mx === mn ? mn + 1 : mx }
    })

    const CELL_H = Math.max(38, Math.floor(height / (rows.length || 1)))
    const LABEL_W = 80
    const CELL_W = 82

    const svgW = LABEL_W + cols.length * CELL_W
    const svgH = CELL_H + rows.length * CELL_H

    return (
        <div>
            <div style={{ overflowX: 'auto' }}>
                <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                    {/* Column headers */}
                    {cols.map((c, ci) => (
                        <text
                            key={c}
                            x={LABEL_W + ci * CELL_W + CELL_W / 2}
                            y={CELL_H / 2 + 4}
                            textAnchor="middle"
                            fill="#5c5044"
                            fontSize={10}
                            fontFamily={IBM_PLEX}
                        >
                            {METRIC_SHORT[c] ?? c}
                        </text>
                    ))}

                    {/* Rows */}
                    {rows.map((row, ri) => (
                        <g key={row}>
                            <text
                                x={LABEL_W - 8}
                                y={CELL_H + ri * CELL_H + CELL_H / 2 + 4}
                                textAnchor="end"
                                fill="#a39382"
                                fontSize={11}
                                fontWeight={500}
                                fontFamily={IBM_PLEX}
                            >
                                {row.toUpperCase()}
                            </text>

                            {matrix[ri].map((val, ci) => {
                                const { min, max } = colRanges[ci]
                                const t = (val - min) / (max - min)
                                const bg = getColor(t, cols[ci])
                                const x = LABEL_W + ci * CELL_W
                                const y = CELL_H + ri * CELL_H
                                return (
                                    <g key={ci}>
                                        <rect
                                            x={x + 2} y={y + 2}
                                            width={CELL_W - 4} height={CELL_H - 4}
                                            fill={bg} rx={6}
                                        />
                                        <text
                                            x={x + CELL_W / 2}
                                            y={y + CELL_H / 2 + 4}
                                            textAnchor="middle"
                                            fill="#f0ebe3"
                                            fontSize={11}
                                            fontFamily="JetBrains Mono, monospace"
                                        >
                                            {EFFICIENCY_COLS.has(cols[ci])
                                                ? `${(val * 100).toFixed(1)}%`
                                                : val.toFixed(1)}
                                        </text>
                                    </g>
                                )
                            })}
                        </g>
                    ))}
                </svg>
            </div>

            {/* Color legend */}
            <div style={{
                display: 'flex',
                gap: 14,
                justifyContent: 'flex-end',
                marginTop: 8,
                fontSize: 10.5,
                color: 'var(--text-3)',
                fontFamily: IBM_PLEX,
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 8, background: 'rgba(68,1,84,0.55)', borderRadius: 2, display: 'inline-block' }} />
                    Low eff
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 8, background: 'rgba(49,104,142,0.55)', borderRadius: 2, display: 'inline-block' }} />
                    Mid
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 8, background: 'rgba(253,231,37,0.6)', borderRadius: 2, display: 'inline-block' }} />
                    High eff
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 8, background: 'rgba(245,158,11,0.45)', borderRadius: 2, display: 'inline-block' }} />
                    Utilization
                </span>
            </div>
        </div>
    )
}
