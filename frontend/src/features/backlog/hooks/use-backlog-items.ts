import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'
import type { BacklogListResponse } from '../types/backlog.types'

/**
 * Fetch backlog items from the backend API.
 *
 * Throws with a specific error message extracted from the API error response,
 * or falls back to a generic message if parsing fails.
 */
async function fetchBacklogItems(): Promise<BacklogListResponse> {
  return apiFetchJson<BacklogListResponse>(`${API_URL}/backlog-items`, undefined, {
    fallbackMessage: 'Failed to load backlog items. Please try again.',
  })
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
