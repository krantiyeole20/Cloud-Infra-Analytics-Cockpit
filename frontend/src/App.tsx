// src/App.tsx
import { useEffect } from 'react'
import { useDashboardStore } from './store/dashboardStore'
import SiteHeader from './components/layout/SiteHeader'
import TopBar from './components/layout/TopBar'
import Sidebar from './components/layout/Sidebar'
import MainCanvas from './components/layout/MainCanvas'

export default function App() {
    const fetchOverview = useDashboardStore((s) => s.fetchOverview)
    const fleetAlert = useDashboardStore((s) => s.anomalies.data?.fleet_alert)

    // Bootstrap all initial data on mount
    useEffect(() => { fetchOverview() }, [fetchOverview])

    return (
        <div className="app">
            {/* Site-wide header: project title, dataset link, GitHub, Connect */}
            <SiteHeader />

            {/* Fleet waste alert banner — fleet-alert mode per Phase 0 decision */}
            {fleetAlert?.active && (
                <div className="fleet-banner">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                        <path d="M12 9v4" /><path d="M12 17h.01" />
                    </svg>
                    Fleet energy waste exceeds threshold — {fleetAlert.waste_pct?.toFixed(1)}% of VMs
                    consuming power above idle limit ({fleetAlert.vms_wasting_energy?.toLocaleString()} VMs)
                </div>
            )}

            {/* Top bar with KPIs and refresh */}
            <TopBar />

            {/* Sidebar + canvas */}
            <div className="app-body">
                <Sidebar />
                <MainCanvas />
            </div>
        </div>
    )
}
