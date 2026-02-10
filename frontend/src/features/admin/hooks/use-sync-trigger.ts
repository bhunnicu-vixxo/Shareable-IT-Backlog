import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL, SYNC_TRIGGER_TOKEN } from '@/utils/constants'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'

async function safeParseJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getApiErrorMessage(data: unknown): string | null {
  if (typeof data !== 'object' || !data) return null
  const maybeError = (data as { error?: unknown }).error
  if (typeof maybeError !== 'object' || !maybeError) return null
  const maybeMessage = (maybeError as { message?: unknown }).message
  return typeof maybeMessage === 'string' ? maybeMessage : null
}

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

      const response = await fetch(`${API_URL}/sync/trigger`, {
        method: 'POST',
        headers,
      })

      const data = await safeParseJson(response)

      if (response.status === 409) {
        throw new Error('Sync already in progress')
      }
      if (!response.ok) {
        const message = getApiErrorMessage(data)
        throw new Error(message ?? 'Failed to trigger sync')
      }

      return data as SyncStatus
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
