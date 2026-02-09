import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { BacklogListResponse } from '../types/backlog.types'

/**
 * Fetch backlog items from the backend API.
 *
 * Throws with a specific error message extracted from the API error response,
 * or falls back to a generic message if parsing fails.
 */
async function fetchBacklogItems(): Promise<BacklogListResponse> {
  const res = await fetch(`${API_URL}/backlog-items`)
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const message =
      (errorBody as { error?: { message?: string } })?.error?.message ??
      'Failed to load backlog items. Please try again.'
    throw new Error(message)
  }
  return res.json() as Promise<BacklogListResponse>
}

/**
 * TanStack Query hook for fetching and caching backlog items.
 *
 * - Caches for 5 minutes (configured in QueryClient staleTime)
 * - Provides `isLoading`, `error`, `data`, and `refetch`
 * - Retries once on failure (configured in QueryClient defaults: retry: 1)
 */
export function useBacklogItems() {
  return useQuery({
    queryKey: ['backlog-items'],
    queryFn: fetchBacklogItems,
  })
}
