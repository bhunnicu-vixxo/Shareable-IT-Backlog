import { useMemo } from 'react'

export interface DataFreshnessInput {
  /** Whether the response was served from the backend sync cache. */
  servedFromCache?: boolean
  /** ISO 8601 timestamp of the last successful sync, or null if never synced. */
  lastSyncedAt?: string | null
  /** Optional reason for staleness override (e.g., from backend error context). */
  staleReason?: string
}

export interface DataFreshnessResult {
  /** Whether the data should be considered stale (served from cache during an outage). */
  isStale: boolean
  /** Human-readable reason for staleness (or empty string if fresh). */
  reason: string
  /** ISO 8601 timestamp of the last successful sync, or null. */
  lastSyncedAt: string | null
}

/**
 * Determine whether the displayed data is stale based on the API response metadata.
 *
 * Data is considered "stale" when:
 * 1. It was served from the backend sync cache (servedFromCache === true), AND
 * 2. The data is old enough to warrant user attention (> 10 minutes since last sync)
 *
 * This hook is intentionally separate from SyncStatusIndicator (which shows subtle
 * freshness dots) — it drives the more prominent StaleDataBanner for active outages.
 */
export function useDataFreshness(input: DataFreshnessInput | undefined): DataFreshnessResult {
  return useMemo(() => {
    if (!input) {
      return { isStale: false, reason: '', lastSyncedAt: null }
    }

    const { servedFromCache, lastSyncedAt, staleReason } = input
    const syncTime = lastSyncedAt ?? null

    // Not served from cache — data is fresh (live from Linear)
    if (!servedFromCache) {
      return { isStale: false, reason: '', lastSyncedAt: syncTime }
    }

    // Served from cache — check how old the data is
    if (syncTime) {
      const syncDate = new Date(syncTime)
      const ageMs = Date.now() - syncDate.getTime()
      const ageMinutes = ageMs / 60_000

      // Data less than 10 minutes old from cache is still reasonably fresh
      if (ageMinutes < 10) {
        return { isStale: false, reason: '', lastSyncedAt: syncTime }
      }
    }

    // Cache data older than 10 minutes or with unknown sync time → stale
    return {
      isStale: true,
      reason: staleReason ?? 'Data may be outdated due to a service disruption',
      lastSyncedAt: syncTime,
    }
  }, [input])
}
