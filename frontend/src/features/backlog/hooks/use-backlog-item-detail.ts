import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { ApiError } from '@/utils/api-error'
import type { BacklogDetailResponse } from '../types/backlog.types'

/**
 * Fetch a single backlog item by ID with its comments.
 *
 * Throws an ApiError with HTTP status code and error code from the backend's
 * standard error format, enabling callers to differentiate 404 (deleted/missing)
 * from transient server errors.
 */
async function fetchBacklogItemDetail(id: string): Promise<BacklogDetailResponse> {
  const res = await fetch(`${API_URL}/backlog-items/${encodeURIComponent(id)}`)
  if (!res.ok) {
    let message = 'Failed to load item details. Please try again.'
    let code = 'UNKNOWN_ERROR'
    try {
      const errorBody = await res.json()
      message = errorBody?.error?.message ?? message
      code = errorBody?.error?.code ?? code
    } catch {
      // Response body not parseable — use defaults
    }
    throw new ApiError(message, res.status, code)
  }
  return res.json() as Promise<BacklogDetailResponse>
}

/**
 * TanStack Query hook for fetching a single backlog item and its comments.
 *
 * - Skips fetch when id is null
 * - Uses queryKey: ['backlog-item', id]
 * - Provides isLoading, error, data, and refetch
 * - Does NOT retry 404 errors (item genuinely deleted)
 * - Retries other errors up to 2 times
 */
export function useBacklogItemDetail(id: string | null) {
  return useQuery<BacklogDetailResponse, ApiError | Error>({
    queryKey: ['backlog-item', id],
    queryFn: () => fetchBacklogItemDetail(id!),
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry 404s — item is genuinely gone
      if (error instanceof ApiError && error.isNotFound) return false
      // Retry other errors up to 2 times
      return failureCount < 2
    },
  })
}
