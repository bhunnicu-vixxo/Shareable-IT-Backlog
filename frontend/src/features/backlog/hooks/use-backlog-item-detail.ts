import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { BacklogDetailResponse } from '../types/backlog.types'

/**
 * Fetch a single backlog item by ID with its comments.
 *
 * Throws with a specific error message extracted from the API error response,
 * or falls back to a generic message if parsing fails.
 */
async function fetchBacklogItemDetail(id: string): Promise<BacklogDetailResponse> {
  const res = await fetch(`${API_URL}/backlog-items/${encodeURIComponent(id)}`)
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const message =
      (errorBody as { error?: { message?: string } })?.error?.message ??
      'Failed to load item details. Please try again.'
    throw new Error(message)
  }
  return res.json() as Promise<BacklogDetailResponse>
}

/**
 * TanStack Query hook for fetching a single backlog item and its comments.
 *
 * - Skips fetch when id is null
 * - Uses queryKey: ['backlog-item', id]
 * - Provides isLoading, error, data, and refetch
 */
export function useBacklogItemDetail(id: string | null) {
  return useQuery({
    queryKey: ['backlog-item', id],
    queryFn: () => fetchBacklogItemDetail(id!),
    enabled: !!id,
  })
}
