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
      const headers: HeadersInit | undefined = SYNC_TRIGGER_TOKEN
        ? { Authorization: `Bearer ${SYNC_TRIGGER_TOKEN}` }
        : undefined

      try {
        return await apiFetchJson<SyncStatus>(`${API_URL}/sync/trigger`, {
          method: 'POST',
          headers,
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
    },
  })

  return {
    triggerSync: mutation.mutate,
    isTriggering: mutation.isPending,
    triggerError: mutation.error,
  }
}
