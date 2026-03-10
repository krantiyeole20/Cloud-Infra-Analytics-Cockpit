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
import {
    MOCK_KPIS, MOCK_HEATMAP, MOCK_DISTRIBUTION, MOCK_TIMESERIES,
    MOCK_VMS, MOCK_ANOMALIES, MOCK_ROC, MOCK_FORECAST_24H,
    MOCK_FORECAST_7DAY, MOCK_TOPOLOGY,
} from '../api/mockData'

// ── Loading state helper ──────────────────────────────────────────────────────
type AsyncState<T> = {
    data: T | null
    loading: boolean
    error: string | null
    demo?: boolean   // true when data is mock fallback
}

const init = <T>(): AsyncState<T> => ({ data: null, loading: false, error: null })

// Pre-populate a slice with demo data instantly, before any network request
const initDemo = <T>(data: T): AsyncState<T> => ({ data, loading: false, error: null, demo: true })

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

// ── Mock fallback map — used when the backend is unreachable ─────────────────
const MOCK_FALLBACKS: Partial<Record<keyof DashboardStore, unknown>> = {
    kpis:        MOCK_KPIS,
    heatmap:     MOCK_HEATMAP,
    distribution: MOCK_DISTRIBUTION,
    timeSeries:  MOCK_TIMESERIES,
    vms:         MOCK_VMS,
    anomalies:   MOCK_ANOMALIES,
    roc:         MOCK_ROC,
    forecast24h: MOCK_FORECAST_24H,
    forecast7day: MOCK_FORECAST_7DAY,
    topology:    MOCK_TOPOLOGY,
}

// ── Helper: wrap any fetch call in loading/error state ────────────────────────
type SetFn = (partial: Partial<DashboardStore> | ((state: DashboardStore) => Partial<DashboardStore>)) => void

async function fetchSlice<T>(
    set: SetFn,
    key: keyof DashboardStore,
    fetcher: () => Promise<T>
) {
    // If the slice already has demo data, skip the loading spinner — silently upgrade in background
    set((s) => {
        const cur = s[key] as AsyncState<T>
        if (cur.data) return s  // already populated — no spinner
        return { ...s, [key]: { ...cur, loading: true, error: null } }
    })
    try {
        const data = await fetcher()
        set((s) => ({ ...s, [key]: { data, loading: false, error: null, demo: false } }))
    } catch (err) {
        const fallback = MOCK_FALLBACKS[key] as T | undefined
        if (fallback !== undefined) {
            // Backend unreachable — keep/restore mock data so the UI is still usable
            set((s) => ({ ...s, [key]: { data: fallback, loading: false, error: null, demo: true } }))
        } else {
            const msg = err instanceof Error ? err.message : String(err)
            set((s) => ({ ...s, [key]: { ...((s[key] as AsyncState<T>)), data: null, loading: false, error: msg } }))
        }
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

    // Data slices — pre-populated with demo data for instant first render
    kpis:           initDemo<KpisResponse>(MOCK_KPIS),
    heatmap:        initDemo<WorkloadHeatmapResponse>(MOCK_HEATMAP),
    distribution:   initDemo<WorkloadDistributionItem[]>(MOCK_DISTRIBUTION),
    timeSeries:     initDemo<TimeSeriesResponse>(MOCK_TIMESERIES),
    vms:            initDemo<VmsResponse>(MOCK_VMS),
    vmSummary:      init<VmSummaryItem[]>(),
    anomalies:      initDemo<AnomaliesResponse>(MOCK_ANOMALIES),
    shap:           init<ShapResponse>(),
    roc:            initDemo<RocResponse>(MOCK_ROC),
    forecast24h:    initDemo<Forecast24hResponse>(MOCK_FORECAST_24H),
    forecast7day:   initDemo<Forecast7DayResponse>(MOCK_FORECAST_7DAY),
    topology:       initDemo<TopologyResponse>(MOCK_TOPOLOGY),
    explorerResult: init<ExplorerQueryResponse>(),

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
