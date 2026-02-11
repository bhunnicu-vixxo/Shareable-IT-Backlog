import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { SyncHistoryEntry } from '../types/admin.types'

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
 * TanStack Query hook for fetching sync history from the admin API.
 *
 * Fetches GET /api/admin/sync/history with session credentials.
 * Returns the history list, loading state, error, and refetch function.
 */
export function useSyncHistory() {
  const query = useQuery<SyncHistoryEntry[]>({
    queryKey: ['admin-sync-history'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/sync/history`, {
        credentials: 'include',
      })
      const data = await safeParseJson(response)
      if (!response.ok) {
        const message = getApiErrorMessage(data)
        throw new Error(message ?? 'Failed to fetch sync history')
      }
      return data as SyncHistoryEntry[]
    },
    staleTime: 30_000, // 30s stale time
  })

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
