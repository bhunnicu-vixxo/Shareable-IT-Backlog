import { useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { ApiError } from '@/utils/api-error'
import { apiFetchJson } from '@/utils/api-fetch'
import type { BacklogDetailResponse, BacklogListResponse } from '../types/backlog.types'

/**
 * Fetch a single backlog item by ID with its comments.
 *
 * Throws an ApiError with HTTP status code and error code from the backend's
 * standard error format, enabling callers to differentiate 404 (deleted/missing)
 * from transient server errors.
 */
async function fetchBacklogItemDetail(id: string): Promise<BacklogDetailResponse> {
  return apiFetchJson<BacklogDetailResponse>(
    `${API_URL}/backlog-items/${encodeURIComponent(id)}`,
    undefined,
    { fallbackMessage: 'Failed to load item details. Please try again.' },
  )
}

/**
 * TanStack Query hook for fetching a single backlog item and its comments.
 *
 * - Skips fetch when id is null (`enabled: !!id`)
 * - Uses queryKey: ['backlog-item', id]
 * - staleTime: 2 minutes (fresher than list data at 5 min)
 * - Does NOT retry any 4xx errors (client errors are not transient)
 * - Retries server/network errors up to 2 times
 * - Uses list cache as placeholderData for instant perceived navigation
 */
export function useBacklogItemDetail(id: string | null) {
  const queryClient = useQueryClient()

  return useQuery<BacklogDetailResponse, ApiError | Error>({
    queryKey: ['backlog-item', id],
    queryFn: () => fetchBacklogItemDetail(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes — slightly fresher than list data
    // retry: inherited from global queryDefaults (skip 4xx, retry server errors up to 2×)
    placeholderData: () => {
      // Use the list cache to show item data instantly while detail fetches
      const listData = queryClient.getQueryData<BacklogListResponse>(['backlog-items'])
      const item = listData?.items.find((i) => i.id === id)
      if (!item) return undefined
      // Return a partial detail response using list data as placeholder
      return { item, comments: [], activities: [] }
    },
  })
}
