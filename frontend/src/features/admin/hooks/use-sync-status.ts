import { useQuery } from '@tanstack/react-query'
import { API_URL, SYNC_TRIGGER_TOKEN } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'

export function getSyncStatusRefetchInterval(
  pollWhileSyncing: boolean,
  data: SyncStatus | undefined,
): number | false {
  if (!pollWhileSyncing) return false
  return data?.status === 'syncing' ? 2000 : false
}

function getAdminAuthHeaders(): HeadersInit | undefined {
  return SYNC_TRIGGER_TOKEN ? { Authorization: `Bearer ${SYNC_TRIGGER_TOKEN}` } : undefined
}

/**
 * TanStack Query hook for fetching and polling sync status.
 *
 * Polls every 2 seconds while sync is in progress (status === 'syncing'),
 * then stops polling when sync completes or is idle.
 *
 * @param options.pollWhileSyncing - Enable/disable auto-polling during sync (default: true)
 */
export function useSyncStatus(options?: { pollWhileSyncing?: boolean }) {
  const pollWhileSyncing = options?.pollWhileSyncing ?? true

  const query = useQuery<SyncStatus>({
    queryKey: ['sync-status'],
    queryFn: async () => {
      return apiFetchJson<SyncStatus>(`${API_URL}/sync/status`, {
        headers: getAdminAuthHeaders(),
      }, {
        fallbackMessage: 'Failed to fetch sync status',
      })
    },
    // Poll every 2s while syncing, otherwise don't poll
    refetchInterval: (query) => {
      return getSyncStatusRefetchInterval(pollWhileSyncing, query.state.data)
    },
    staleTime: 30_000, // 30s stale time for status
  })

  return {
    syncStatus: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
