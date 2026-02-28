// src/components/charts/WorkloadHeatmap.tsx
// Pure SVG heatmap — task_type × metric matrix with color scale.
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

function getColor(t: number, col: string): string {
    // t in [0,1], 0 = worst, 1 = best
    if (EFFICIENCY_COLS.has(col)) {
        // Green scale — high is good
        const r = Math.round(16 + (10 - 16) * t)
        const g = Math.round(185 + (255 - 185) * t)
        const b = Math.round(129 + (180 - 129) * t)
        const a = 0.12 + t * 0.55
        return `rgba(${r},${g},${b},${a})`
    } else if (POWER_COLS.has(col)) {
        // Red scale — low is better (invert t)
        const inv = 1 - t
        const a = 0.08 + inv * 0.5
        return `rgba(239,68,68,${a})`
    } else {
        // Blue scale
        const a = 0.08 + t * 0.5
        return `rgba(59,130,246,${a})`
    }
}

export default function WorkloadHeatmap({ data, height = 160 }: Props) {
    const { rows, cols, matrix } = data

    // Per-column min/max for normalisation
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
    const svgH = CELL_H + rows.length * CELL_H  // header row + data rows

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                {/* Column headers */}
                {cols.map((c, ci) => (
                    <text
                        key={c}
                        x={LABEL_W + ci * CELL_W + CELL_W / 2}
                        y={CELL_H / 2 + 4}
                        textAnchor="middle"
                        fill="var(--text-3)"
                        fontSize={10}
                        fontFamily="var(--font)"
                    >
                        {METRIC_SHORT[c] ?? c}
                    </text>
                ))}

                {/* Rows */}
                {rows.map((row, ri) => (
                    <g key={row}>
                        {/* Row label */}
                        <text
                            x={LABEL_W - 8}
                            y={CELL_H + ri * CELL_H + CELL_H / 2 + 4}
                            textAnchor="end"
                            fill="var(--text-2)"
                            fontSize={11}
                            fontWeight={500}
                            fontFamily="var(--font)"
                        >
                            {row.toUpperCase()}
                        </text>

                        {/* Cells */}
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
                                        fill="var(--text-1)"
                                        fontSize={11}
                                        fontFamily="var(--mono)"
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
    )
}
