// src/components/layout/MainCanvas.tsx
import { useDashboardStore } from '../../store/dashboardStore'
import OverviewView from '../views/OverviewView'
import WorkloadView from '../views/WorkloadView'
import AnomalyView from '../views/AnomalyView'
import ForecastView from '../views/ForecastView'
import ExplorerView from '../views/ExplorerView'

const VIEWS = {
    overview: OverviewView,
    workload: WorkloadView,
    anomaly: AnomalyView,
    forecast: ForecastView,
    explorer: ExplorerView,
}

export default function MainCanvas() {
    const activeView = useDashboardStore((s) => s.activeView)
    const View = VIEWS[activeView]
    return (
        <main className="main-canvas">
            <View />
        </main>
    )
}
