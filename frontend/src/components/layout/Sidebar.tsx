// src/components/layout/Sidebar.tsx
import { useDashboardStore } from '../../store/dashboardStore'
import type { ViewId, TaskType } from '../../types'
import { TASK_TYPE_COLORS, VIEW_LABELS } from '../../constants'

interface NavItem {
    id: ViewId
    icon: string
    badge?: (badge: BadgeData) => string | null
}

interface BadgeData {
    anomalies: number
    wasteAlert: boolean
}

const NAV_ITEMS: NavItem[] = [
    { id: 'overview', icon: '◈' },
    { id: 'workload', icon: '▦' },
    {
        id: 'anomaly',
        icon: '⚠',
        badge: ({ anomalies, wasteAlert }) =>
            wasteAlert ? 'ALERT' : anomalies > 0 ? String(anomalies) : null,
    },
    { id: 'forecast', icon: '⌲' },
    { id: 'explorer', icon: '⌕' },
]

const TASK_TYPES: { id: TaskType; label: string }[] = [
    { id: 'io', label: 'IO Tasks' },
    { id: 'network', label: 'Network Tasks' },
    { id: 'compute', label: 'Compute Tasks' },
]

export default function Sidebar() {
    const activeView = useDashboardStore((s) => s.activeView)
    const setActiveView = useDashboardStore((s) => s.setActiveView)
    const selectedTaskType = useDashboardStore((s) => s.selectedTaskType)
    const setSelectedTaskType = useDashboardStore((s) => s.setSelectedTaskType)
    const kpis = useDashboardStore((s) => s.kpis.data)
    const anomalies = useDashboardStore((s) => s.anomalies.data)

    const badgeData: BadgeData = {
        anomalies: anomalies?.behavioral?.length ?? 0,
        wasteAlert: anomalies?.fleet_alert?.active ?? false,
    }

    return (
        <nav className="sidebar">
            {/* Navigation */}
            <div className="sidebar-section">
                <div className="sidebar-section-label">Navigation</div>
                {NAV_ITEMS.map((item) => {
                    const badge = item.badge?.(badgeData)
                    return (
                        <div
                            key={item.id}
                            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => setActiveView(item.id)}
                        >
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                            <span>{VIEW_LABELS[item.id]}</span>
                            {badge && (
                                <span className={`nav-item-badge ${badge === 'ALERT' ? '' : 'green'}`}>
                                    {badge}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="sidebar-divider" />

            {/* Task type filter */}
            <div className="sidebar-section">
                <div className="sidebar-section-label">Filter by Type</div>
                <div className="filter-pills">
                    <div
                        className={`filter-pill active-all ${selectedTaskType === undefined ? 'active' : ''}`}
                        onClick={() => setSelectedTaskType(undefined)}
                    >
                        <span className="filter-dot" style={{ background: 'var(--text-3)' }} />
                        All Types
                    </div>
                    {TASK_TYPES.map((tt) => (
                        <div
                            key={tt.id}
                            className={`filter-pill ${selectedTaskType === tt.id ? 'active' : ''}`}
                            onClick={() => setSelectedTaskType(tt.id)}
                        >
                            <span className="filter-dot" style={{ background: TASK_TYPE_COLORS[tt.id] }} />
                            {tt.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer stats */}
            <div className="sidebar-footer">
                {kpis && (
                    <>
                        <div className="sidebar-stat">
                            <span className="sidebar-stat-label">Records</span>
                            <span className="sidebar-stat-val">
                                {(kpis.total_vm_records / 1_000_000).toFixed(2)}M
                            </span>
                        </div>
                        <div className="sidebar-stat">
                            <span className="sidebar-stat-label">Anomalies</span>
                            <span className="sidebar-stat-val">{kpis.behavioral_anomalies}</span>
                        </div>
                        <div className="sidebar-stat">
                            <span className="sidebar-stat-label">Waste</span>
                            <span className="sidebar-stat-val" style={{ color: kpis.vms_wasting_energy_pct > 5 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                {kpis.vms_wasting_energy_pct.toFixed(1)}%
                            </span>
                        </div>
                    </>
                )}
            </div>
        </nav>
    )
}
