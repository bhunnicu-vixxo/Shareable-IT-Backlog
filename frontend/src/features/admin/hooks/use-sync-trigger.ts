import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL, SYNC_TRIGGER_TOKEN } from '@/utils/constants'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'
import { ApiError } from '@/utils/api-error'
import { apiFetchJson } from '@/utils/api-fetch'

/**
 * TanStack Query mutation hook for triggering a manual sync.
 *
 * On success (202), invalidates the 'sync-status' query to start polling.
 * On 409 (sync already running), surfaces an error message.
 */
export function useSyncTrigger() {
  const queryClient = useQueryClient()

  const mutation = useMutation<SyncStatus, Error>({
    mutationFn: async () => {
      // Use the admin-protected endpoint so we can capture `triggeredBy` in sync_history.
      // We still optionally include SYNC_TRIGGER_TOKEN to support environments that use it
      // for additional protections on sync endpoints.
      const headers: HeadersInit | undefined = SYNC_TRIGGER_TOKEN
        ? { Authorization: `Bearer ${SYNC_TRIGGER_TOKEN}` }
        : undefined

      try {
        return await apiFetchJson<SyncStatus>(`${API_URL}/admin/sync/trigger`, {
          method: 'POST',
          headers,
          credentials: 'include',
        }, {
          fallbackMessage: 'Failed to trigger sync',
        })
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw new Error('Sync already in progress')
        }
        throw err
      }
    },
    onSuccess: () => {
      // Invalidate sync status to start polling
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      // Best-effort refresh of history (a new entry is created at sync start)
      queryClient.invalidateQueries({ queryKey: ['admin-sync-history'] })
    },
  })

  return {
    triggerSync: mutation.mutate,
    isTriggering: mutation.isPending,
    triggerError: mutation.error,
  }
}
