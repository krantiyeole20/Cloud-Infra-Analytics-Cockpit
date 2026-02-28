// src/hooks/usePolling.ts
// Generic polling hook — calls a fetch function at a fixed interval.
// Used to auto-refresh KPIs and anomaly data every 30s.

import { useEffect, useRef, useCallback } from 'react'

interface UsePollingOptions {
    /** Interval in milliseconds. Default: 30000 (30s). */
    intervalMs?: number
    /** If false, polling is paused. Default: true. */
    enabled?: boolean
    /** Whether to call fetchFn immediately on mount. Default: true. */
    immediate?: boolean
}

export function usePolling(
    fetchFn: () => void | Promise<void>,
    options: UsePollingOptions = {}
): void {
    const {
        intervalMs = 30_000,
        enabled = true,
        immediate = true,
    } = options

    const savedFetchFn = useRef(fetchFn)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Keep ref current without re-registering the interval
    useEffect(() => {
        savedFetchFn.current = fetchFn
    }, [fetchFn])

    const fire = useCallback(async () => {
        try {
            await savedFetchFn.current()
        } catch (e) {
            console.warn('[usePolling] fetch error (suppressed):', e)
        }
    }, [])

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            return
        }

        if (immediate) {
            fire()
        }

        timerRef.current = setInterval(fire, intervalMs)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [enabled, intervalMs, immediate, fire])
}
