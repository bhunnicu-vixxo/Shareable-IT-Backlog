import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { SyncStatus } from '../types/backlog.types'

/**
 * TanStack Query hook for passively polling sync status on the backlog page.
 *
 * Polls frequently so sync errors surface quickly for business users.
 *
 * Note: this uses a backlog-specific query key so it doesn't inherit the
 * admin page's more aggressive polling behavior while syncing.
 */
export function useSyncStatus() {
  const query = useQuery<SyncStatus>({
    queryKey: ['sync-status', 'backlog'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/sync/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }
      return response.json()
    },
    // Keep this low to meet AC timing (show error quickly when sync fails).
    refetchInterval: 5_000,
    staleTime: 30_000, // Consider stale after 30s
  })

  return {
    syncStatus: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
