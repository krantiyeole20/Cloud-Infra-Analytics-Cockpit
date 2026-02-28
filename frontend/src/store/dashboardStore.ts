// src/store/dashboardStore.ts
// Global Zustand store for the Cloud VM Intelligence Cockpit.
// All async API data flows through here — components read from the store.

import { create } from 'zustand'
import type {
    KpisResponse,
    WorkloadHeatmapResponse,
    WorkloadDistributionItem,
    TimeSeriesResponse,
    VmsResponse,
    VmSummaryItem,
    AnomaliesResponse,
    ShapResponse,
    RocResponse,
    Forecast24hResponse,
    Forecast7DayResponse,
    TopologyResponse,
    ExplorerQueryResponse,
    ViewId,
    TaskType,
} from '../types'
import * as api from '../api/client'

// ── Loading state helper ──────────────────────────────────────────────────────
type AsyncState<T> = {
    data: T | null
    loading: boolean
    error: string | null
}

const init = <T>(): AsyncState<T> => ({ data: null, loading: false, error: null })

// ── Store interface ───────────────────────────────────────────────────────────
interface DashboardStore {
    // Navigation
    activeView: ViewId
    setActiveView: (view: ViewId) => void

    // Filters
    selectedTaskType: TaskType | undefined
    setSelectedTaskType: (tt: TaskType | undefined) => void

    // Refresh state
    isRefreshing: boolean
    lastRefreshedAt: string | null
    rowsInDb: number

    // Data slices
    kpis: AsyncState<KpisResponse>
    heatmap: AsyncState<WorkloadHeatmapResponse>
    distribution: AsyncState<WorkloadDistributionItem[]>
    timeSeries: AsyncState<TimeSeriesResponse>
    vms: AsyncState<VmsResponse>
    vmSummary: AsyncState<VmSummaryItem[]>
    anomalies: AsyncState<AnomaliesResponse>
    shap: AsyncState<ShapResponse>
    roc: AsyncState<RocResponse>
    forecast24h: AsyncState<Forecast24hResponse>
    forecast7day: AsyncState<Forecast7DayResponse>
    topology: AsyncState<TopologyResponse>
    explorerResult: AsyncState<ExplorerQueryResponse>

    // Fetch actions
    fetchKpis: () => Promise<void>
    fetchHeatmap: () => Promise<void>
    fetchDistribution: () => Promise<void>
    fetchTimeSeries: (metric?: string, bucket?: 'hour' | 'day' | 'week') => Promise<void>
    fetchVms: (sort?: 'asc' | 'desc') => Promise<void>
    fetchVmSummary: () => Promise<void>
    fetchAnomalies: () => Promise<void>
    fetchShap: (vmId: string) => Promise<void>
    fetchRoc: () => Promise<void>
    fetchForecast24h: () => Promise<void>
    fetchForecast7Day: () => Promise<void>
    fetchTopology: () => Promise<void>
    runExplorerQuery: (params: { template?: string; sql?: string }) => Promise<void>
    triggerRefresh: () => Promise<void>

    // Bulk fetch for initial load
    fetchOverview: () => Promise<void>
}

// ── Helper: wrap any fetch call in loading/error state ────────────────────────
type SetFn = (partial: Partial<DashboardStore> | ((state: DashboardStore) => Partial<DashboardStore>)) => void

async function fetchSlice<T>(
    set: SetFn,
    key: keyof DashboardStore,
    fetcher: () => Promise<T>
) {
    set((s) => ({ ...s, [key]: { ...((s[key] as AsyncState<T>)), loading: true, error: null } }))
    try {
        const data = await fetcher()
        set((s) => ({ ...s, [key]: { data, loading: false, error: null } }))
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        set((s) => ({ ...s, [key]: { ...((s[key] as AsyncState<T>)), data: null, loading: false, error: msg } }))
    }
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useDashboardStore = create<DashboardStore>((set, get) => ({
    // Navigation
    activeView: 'overview',
    setActiveView: (view) => set({ activeView: view }),

    // Filters
    selectedTaskType: undefined,
    setSelectedTaskType: (tt) => {
        set({ selectedTaskType: tt })
        // Refetch filtered data
        get().fetchAnomalies()
        get().fetchVms()
    },

    // Refresh state
    isRefreshing: false,
    lastRefreshedAt: null,
    rowsInDb: 0,

    // Data slices — initial empty state
    kpis: init(),
    heatmap: init(),
    distribution: init(),
    timeSeries: init(),
    vms: init(),
    vmSummary: init(),
    anomalies: init(),
    shap: init(),
    roc: init(),
    forecast24h: init(),
    forecast7day: init(),
    topology: init(),
    explorerResult: init(),

    // ── Fetch actions ───────────────────────────────────────────────────────────
    fetchKpis: () => fetchSlice(set, 'kpis', api.getKpis),

    fetchHeatmap: () => fetchSlice(set, 'heatmap', api.getWorkloadHeatmap),

    fetchDistribution: () => fetchSlice(set, 'distribution', api.getWorkloadDistribution),

    fetchTimeSeries: (metric = 'energy_efficiency', bucket = 'day') =>
        fetchSlice(set, 'timeSeries', () =>
            api.getTimeSeries(metric, bucket, get().selectedTaskType)
        ),

    fetchVms: (sort = 'desc') =>
        fetchSlice(set, 'vms', () =>
            api.getVms(sort, get().selectedTaskType)
        ),

    fetchVmSummary: () =>
        fetchSlice(set, 'vmSummary', () =>
            api.getVmsSummary(get().selectedTaskType) as Promise<VmSummaryItem[]>
        ),

    fetchAnomalies: () =>
        fetchSlice(set, 'anomalies', () =>
            api.getAnomalies(get().selectedTaskType)
        ),

    fetchShap: (vmId: string) =>
        fetchSlice(set, 'shap', () => api.getShapForVm(vmId)),

    fetchRoc: () => fetchSlice(set, 'roc', api.getRocCurve),

    fetchForecast24h: () => fetchSlice(set, 'forecast24h', api.getForecast24h),

    fetchForecast7Day: () => fetchSlice(set, 'forecast7day', api.getForecast7Day),

    fetchTopology: () => fetchSlice(set, 'topology', api.getTopology),

    runExplorerQuery: (params) =>
        fetchSlice(set, 'explorerResult', () => api.runExplorerQuery(params)),

    // ── Refresh ─────────────────────────────────────────────────────────────────
    triggerRefresh: async () => {
        set({ isRefreshing: true })
        try {
            const result = await api.triggerRefresh()
            set({
                isRefreshing: false,
                lastRefreshedAt: result.timestamp,
                rowsInDb: (get().kpis.data?.total_vm_records ?? 0) + result.rows_added,
            })
            // Refresh all data after new rows and retrained models
            await Promise.allSettled([
                get().fetchKpis(),
                get().fetchHeatmap(),
                get().fetchAnomalies(),
                get().fetchTimeSeries(),
            ])
        } catch (err) {
            set({ isRefreshing: false })
            console.error('[store] Refresh failed:', err)
        }
    },

    // ── Bulk fetch for initial app load ─────────────────────────────────────────
    fetchOverview: async () => {
        await Promise.allSettled([
            get().fetchKpis(),
            get().fetchHeatmap(),
            get().fetchAnomalies(),
            get().fetchTimeSeries(),
            get().fetchVms(),
            get().fetchTopology(),
        ])
    },
}))
