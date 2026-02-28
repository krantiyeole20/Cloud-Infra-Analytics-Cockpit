// src/App.tsx
// Top-level app shell. Bootstraps data on mount, renders layout skeleton.
// Phase 5 will fill in Sidebar/TopBar/MainCanvas content.

import { useEffect } from 'react'
import { useDashboardStore } from './store/dashboardStore'
import { usePolling } from './hooks/usePolling'

export default function App() {
    const fetchOverview = useDashboardStore((s) => s.fetchOverview)
    const fetchKpis = useDashboardStore((s) => s.fetchKpis)
    const kpis = useDashboardStore((s) => s.kpis)
    const fleetAlert = useDashboardStore((s) => s.anomalies.data?.fleet_alert)

    // Initial full load on mount
    useEffect(() => {
        fetchOverview()
    }, [fetchOverview])

    // Poll KPIs every 30s
    usePolling(fetchKpis, { intervalMs: 30_000, immediate: false })

    return (
        <div className="app-shell">
            {/* Fleet waste alert banner (Phase 0 decision: anomaly_ui = fleet-alert mode) */}
            {fleetAlert?.active && (
                <div className="alert-banner" role="alert">
                    ⚡ Fleet energy waste alert: {fleetAlert.waste_pct?.toFixed(1)}% of VMs are consuming
                    power above threshold while idle ({fleetAlert.vms_wasting_energy?.toLocaleString()} VMs)
                </div>
            )}

            {/* Layout placeholder — Phase 5 will render TopBar + Sidebar + MainCanvas */}
            <div className="layout-placeholder">
                <div className="status-bar">
                    <span className="logo">Cloud VM Intelligence Cockpit</span>
                    {kpis.loading && <span className="loading-indicator">Loading…</span>}
                    {kpis.data && (
                        <span className="kpi-summary">
                            Avg efficiency: {(kpis.data.avg_energy_efficiency * 100).toFixed(1)}% ·
                            Fleet power: {kpis.data.fleet_power_kw.toLocaleString()} kW ·
                            {kpis.data.total_vm_records.toLocaleString()} records
                        </span>
                    )}
                </div>
                <div className="content-placeholder">
                    <p>Phase 5 — Layout and Navigation coming next.</p>
                    <p>Backend is connected and data is flowing.</p>
                </div>
            </div>
        </div>
    )
}
