// src/api/client.ts
// Typed fetch wrappers for all backend API endpoints.
// Base URL resolved from VITE_API_BASE_URL env variable (or localhost:8000).

import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
    HealthResponse,
    KpisResponse,
    WorkloadHeatmapResponse,
    WorkloadDistributionItem,
    TimeSeriesResponse,
    Surface3DResponse,
    VmsResponse,
    VmSummaryItem,
    VmSampleRow,
    AnomaliesResponse,
    ShapResponse,
    RocResponse,
    Forecast24hResponse,
    Forecast7DayResponse,
    TopologyResponse,
    ExplorerTemplatesResponse,
    ExplorerQueryResponse,
    RefreshResponse,
    TaskType,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

const http: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 60_000,  // 60s for refresh (model retraining)
    headers: { 'Content-Type': 'application/json' },
})

// Global response interceptor — log errors without crashing
http.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
        const url = err.config?.url ?? 'unknown'
        const status = err.response?.status ?? 'network error'
        console.error(`[api] ${err.config?.method?.toUpperCase()} ${url} → ${status}`)
        return Promise.reject(err)
    }
)

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = async (): Promise<HealthResponse> => {
    const { data } = await http.get<HealthResponse>('/health')
    return data
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
export const getKpis = async (): Promise<KpisResponse> => {
    const { data } = await http.get<KpisResponse>('/kpis')
    return data
}

// ── Workload ──────────────────────────────────────────────────────────────────
export const getWorkloadHeatmap = async (): Promise<WorkloadHeatmapResponse> => {
    const { data } = await http.get<WorkloadHeatmapResponse>('/workload/heatmap')
    return data
}

export const getWorkloadDistribution = async (): Promise<WorkloadDistributionItem[]> => {
    const { data } = await http.get<WorkloadDistributionItem[]>('/workload/distribution')
    return data
}

// ── Performance ───────────────────────────────────────────────────────────────
export const getTimeSeries = async (
    metric = 'energy_efficiency',
    bucket: 'hour' | 'day' | 'week' = 'day',
    taskType?: TaskType
): Promise<TimeSeriesResponse> => {
    const params: Record<string, string> = { metric, bucket }
    if (taskType) params.task_type = taskType
    const { data } = await http.get<TimeSeriesResponse>('/performance/timeseries', { params })
    return data
}

export const getSurface3D = async (
    bucket: 'hour' | 'day' = 'day'
): Promise<Surface3DResponse> => {
    const { data } = await http.get<Surface3DResponse>('/performance/surface3d', {
        params: { bucket },
    })
    return data
}

// ── VMs ───────────────────────────────────────────────────────────────────────
export const getVms = async (
    sort: 'asc' | 'desc' = 'desc',
    taskType?: TaskType,
    limit = 20
): Promise<VmsResponse> => {
    const params: Record<string, string | number> = { sort, limit }
    if (taskType) params.task_type = taskType
    const { data } = await http.get<VmsResponse>('/vms', { params })
    return data
}

export const getVmsSummary = async (taskType?: TaskType): Promise<VmSummaryItem[]> => {
    const params: Record<string, string> = {}
    if (taskType) params.task_type = taskType
    const { data } = await http.get<VmSummaryItem[]>('/vms/summary', { params })
    return data
}

export const getVmSample = async (
    taskType?: TaskType,
    taskPriority?: string,
    limit = 50
): Promise<VmSampleRow[]> => {
    const params: Record<string, string | number> = { limit }
    if (taskType) params.task_type = taskType
    if (taskPriority) params.task_priority = taskPriority
    const { data } = await http.get<VmSampleRow[]>('/vms/sample', { params })
    return data
}

// ── Anomalies ─────────────────────────────────────────────────────────────────
export const getAnomalies = async (
    taskType?: TaskType,
    limit = 50
): Promise<AnomaliesResponse> => {
    const params: Record<string, string | number> = { limit }
    if (taskType) params.task_type = taskType
    const { data } = await http.get<AnomaliesResponse>('/anomalies', { params })
    return data
}

export const getShapForVm = async (vmId: string): Promise<ShapResponse> => {
    const { data } = await http.get<ShapResponse>(`/anomalies/${encodeURIComponent(vmId)}/shap`)
    return data
}

export const getRocCurve = async (): Promise<RocResponse> => {
    const { data } = await http.get<RocResponse>('/anomalies/roc')
    return data
}

// ── Forecast ──────────────────────────────────────────────────────────────────
export const getForecast24h = async (): Promise<Forecast24hResponse> => {
    const { data } = await http.get<Forecast24hResponse>('/forecast/24h')
    return data
}

export const getForecast7Day = async (): Promise<Forecast7DayResponse> => {
    const { data } = await http.get<Forecast7DayResponse>('/forecast/7day')
    return data
}

// ── Topology ──────────────────────────────────────────────────────────────────
export const getTopology = async (): Promise<TopologyResponse> => {
    const { data } = await http.get<TopologyResponse>('/topology')
    return data
}

// ── Explorer ──────────────────────────────────────────────────────────────────
export const getExplorerTemplates = async (): Promise<ExplorerTemplatesResponse> => {
    const { data } = await http.get<ExplorerTemplatesResponse>('/explorer/templates')
    return data
}

export const runExplorerQuery = async (
    params: { template?: string; sql?: string; limit?: number }
): Promise<ExplorerQueryResponse> => {
    const { data } = await http.get<ExplorerQueryResponse>('/explorer/query', { params })
    return data
}

// ── Refresh ───────────────────────────────────────────────────────────────────
export const triggerRefresh = async (): Promise<RefreshResponse> => {
    const { data } = await http.post<RefreshResponse>('/refresh')
    return data
}
