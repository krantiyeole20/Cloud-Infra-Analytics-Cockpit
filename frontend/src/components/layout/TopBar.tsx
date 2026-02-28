// src/components/layout/TopBar.tsx
import { useDashboardStore } from '../../store/dashboardStore'
import { useRefresh } from '../../hooks/useRefresh'
import { usePolling } from '../../hooks/usePolling'

function RefreshIcon({ spin }: { spin: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            style={{ animation: spin ? 'spin .9s linear infinite' : undefined }}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
        </svg>
    )
}

export default function TopBar() {
    const kpis = useDashboardStore((s) => s.kpis)
    const fetchKpis = useDashboardStore((s) => s.fetchKpis)
    const { isRefreshing, handleRefresh, lastRefreshedAt } = useRefresh()

    // Poll KPIs every 30s
    usePolling(fetchKpis, { intervalMs: 30_000, immediate: false })

    const d = kpis.data

    const effPct = d ? (d.avg_energy_efficiency * 100).toFixed(1) : '—'
    const pwrKw = d ? d.fleet_power_kw.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'
    const waste = d ? d.vms_wasting_energy_pct.toFixed(1) : '—'
    const recs = d ? (d.total_vm_records / 1_000_000).toFixed(2) + 'M' : '—'

    const isLoading = kpis.loading || isRefreshing

    return (
        <header className="topbar">
            {/* Brand */}
            <div className="topbar-brand">
                <div className="topbar-logo">⚡</div>
                <div>
                    <div className="topbar-title">VM Intelligence</div>
                    <div className="topbar-subtitle">Cockpit</div>
                </div>
            </div>

            {/* KPIs */}
            <div className="topbar-kpis">
                <div className="topbar-kpi">
                    <span className="topbar-kpi-label">Avg Efficiency</span>
                    <span className={`topbar-kpi-value ${d && d.avg_energy_efficiency > 0.6 ? 'green' : 'amber'}`}>
                        {effPct}%
                    </span>
                </div>
                <div className="topbar-kpi">
                    <span className="topbar-kpi-label">Fleet Power</span>
                    <span className="topbar-kpi-value blue">{pwrKw} kW</span>
                </div>
                <div className="topbar-kpi">
                    <span className="topbar-kpi-label">Energy Waste</span>
                    <span className={`topbar-kpi-value ${d && d.vms_wasting_energy_pct > 5 ? 'red' : 'green'}`}>
                        {waste}%
                    </span>
                </div>
                <div className="topbar-kpi">
                    <span className="topbar-kpi-label">Records</span>
                    <span className="topbar-kpi-value">{recs}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="topbar-actions">
                <div className="topbar-status">
                    <span className={`status-dot ${isLoading ? 'loading' : ''}`} />
                    {isLoading
                        ? 'Updating…'
                        : lastRefreshedAt
                            ? `Refreshed ${lastRefreshedAt}`
                            : 'Live'}
                </div>
                <button
                    className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    title="Regenerate synthetic data + retrain ML models"
                >
                    <RefreshIcon spin={isRefreshing} />
                    {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>
        </header>
    )
}
