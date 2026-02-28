// src/hooks/useRefresh.ts
// Wraps the store's triggerRefresh with UX state helpers.

import { useCallback } from 'react'
import { useDashboardStore } from '../store/dashboardStore'

export function useRefresh() {
    const isRefreshing = useDashboardStore((s) => s.isRefreshing)
    const lastRefreshedAt = useDashboardStore((s) => s.lastRefreshedAt)
    const triggerRefresh = useDashboardStore((s) => s.triggerRefresh)

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return
        await triggerRefresh()
    }, [isRefreshing, triggerRefresh])

    const formattedLastRefresh = lastRefreshedAt
        ? new Date(lastRefreshedAt).toLocaleTimeString()
        : null

    return {
        isRefreshing,
        handleRefresh,
        lastRefreshedAt: formattedLastRefresh,
    }
}
