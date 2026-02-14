import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncStatus } from './use-sync-status'

/**
 * Watches sync status and automatically invalidates backlog items
 * when a sync transitions from 'syncing' to a terminal state
 * ('success', 'partial', or 'error').
 *
 * This bridges the gap between the 5-second sync status polling
 * and the backlog items query (which has no auto-refresh). Without
 * this, users see "Last synced: just now" but stale list data until
 * they manually refresh or the 5-minute stale time expires.
 *
 * Also auto-refreshes when lastSyncedAt changes (indicating a sync
 * completed in the background) even if we didn't observe the 'syncing'
 * intermediate state.
 */
export function useAutoRefreshOnSync() {
  const queryClient = useQueryClient()
  const { syncStatus } = useSyncStatus()
  const prevStatusRef = useRef<string | null>(null)
  const prevLastSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!syncStatus) return

    const currentStatus = syncStatus.status
    const currentLastSynced = syncStatus.lastSyncedAt ?? null
    const prevStatus = prevStatusRef.current
    const prevLastSynced = prevLastSyncedRef.current

    // Update refs for next comparison
    prevStatusRef.current = currentStatus
    prevLastSyncedRef.current = currentLastSynced

    // Skip initial mount — don't refetch on page load
    if (prevStatus === null) return

    // Transition from 'syncing' to a terminal state → refetch
    if (prevStatus === 'syncing' && currentStatus !== 'syncing') {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] })
      return
    }

    // lastSyncedAt changed (background sync completed) → refetch
    if (
      prevLastSynced !== null &&
      currentLastSynced !== null &&
      prevLastSynced !== currentLastSynced
    ) {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] })
    }
  }, [syncStatus, queryClient])
}
