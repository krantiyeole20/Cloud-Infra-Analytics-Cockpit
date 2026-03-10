import InfoTooltip from '../shared/InfoTooltip'

interface Props {
    label: string
    value: string | number
    unit?: string
    sub?: string
    color?: string
    delta?: number
    tooltip?: string
}

export default function KpiCard({ label, value, unit, sub, color, delta, tooltip }: Props) {
    return (
        <div className={`kpi-card ${color ? color : ''}`}>
            <div className="kpi-card-label">
                {label}
                {tooltip && <InfoTooltip text={tooltip} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <div className="kpi-card-value" style={{ color: color ? `var(--accent-${color})` : undefined }}>
                    {value}
                </div>
                {unit && <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{unit}</span>}
            </div>
            {(sub || delta !== undefined) && (
                <div className="kpi-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {delta !== undefined && (
                        <span style={{
                            color: delta > 0 ? 'var(--accent-green)' : (delta < 0 ? 'var(--accent-red)' : 'var(--text-3)')
                        }}>
                            {delta > 0 ? '↑' : (delta < 0 ? '↓' : '−')} {Math.abs(delta).toFixed(1)}%
                        </span>
                    )}
                    {sub && <span>{sub}</span>}
                </div>
            )}
        </div>
    )
}
