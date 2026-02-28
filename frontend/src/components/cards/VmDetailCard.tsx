import React from 'react';

interface Props {
    vmId: string;
    taskType: string;
    computeValue: number;
    energyEfficiency: number;
    behavioralScore: number;
    completionProb: number;
    onShapRequest: (vmId: string) => void;
}

function getEfficiencyStatus(val: number) {
    if (val >= 0.7) return { label: 'EXCELLENT', color: 'green' };
    if (val >= 0.5) return { label: 'GOOD', color: 'blue' };
    if (val >= 0.3) return { label: 'DEGRADED', color: 'amber' };
    return { label: 'CRITICAL', color: 'red' };
}

function getBehavioralStatus(val: number) {
    if (val > 0.7) return { label: 'ANOMALY', color: 'red' };
    if (val > 0.5) return { label: 'SUSPICIOUS', color: 'amber' };
    return { label: 'NORMAL', color: 'green' };
}

function getCompletionStatus(val: number) {
    if (val > 0.7) return { label: 'LIKELY', color: 'green' };
    if (val >= 0.4) return { label: 'UNCERTAIN', color: 'amber' };
    return { label: 'AT RISK', color: 'red' };
}

function ScoreBar({ label, value, max = 1, statusLabel, statusColor, format = (v: number) => v.toFixed(2) }: {
    label: string, value: number, max?: number, statusLabel: string, statusColor: string, format?: (v: number) => string
}) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span className="mono">{format(value)}</span>
                    <span className={`badge badge-${statusColor === 'blue' ? 'low' : (statusColor === 'amber' ? 'medium' : (statusColor === 'red' ? 'high' : 'network'))}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {statusLabel}
                    </span>
                </div>
            </div>
            <div style={{ height: 6, background: 'var(--bg-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `var(--accent-${statusColor})`, transition: 'width 0.3s' }} />
            </div>
        </div>
    );
}

export default function VmDetailCard({ vmId, taskType, computeValue, energyEfficiency, behavioralScore, completionProb, onShapRequest }: Props) {
    const eff = getEfficiencyStatus(energyEfficiency);
    const beh = getBehavioralStatus(behavioralScore);
    const cmp = getCompletionStatus(completionProb);

    return (
        <div className="chart-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>VM Detail</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{vmId}</div>
                </div>
                <span className={`badge badge-${taskType}`}>{taskType.toUpperCase()}</span>
            </div>

            <ScoreBar label="Energy Efficiency" value={energyEfficiency} statusLabel={eff.label} statusColor={eff.color} format={v => `${(v * 100).toFixed(1)}%`} />
            <ScoreBar label="Behavioral Anomaly Score" value={behavioralScore} statusLabel={beh.label} statusColor={beh.color} />
            <ScoreBar label="Task Completion Probability" value={completionProb} statusLabel={cmp.label} statusColor={cmp.color} format={v => `${(v * 100).toFixed(1)}%`} />
            <ScoreBar label="Compute Value Score" value={computeValue} max={Math.max(1, computeValue * 1.5)} statusLabel="SCORE" statusColor="blue" format={v => v.toFixed(4)} />

            <button
                style={{ width: '100%', padding: '10px', marginTop: 12, background: 'var(--bg-surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                onClick={() => onShapRequest(vmId)}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
            >
                View SHAP Breakdown
            </button>
        </div>
    );
}
