import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'
import type { BacklogListResponse } from '../types/backlog.types'

/**
 * Fields requested from the API for the list view.
 *
 * Omits detail-only fields (url, assigneeId, projectId, projectName,
 * teamId, completedAt, dueDate) to reduce payload size.
 * The `id` field is always included by the server even if not listed.
 */
const LIST_VIEW_FIELDS = [
  'id',
  'identifier',
  'title',
  'description',
  'priority',
  'priorityLabel',
  'status',
  'statusType',
  'labels',
  'isNew',
  'sortOrder',
  'prioritySortOrder',
  'assigneeName',
  'teamName',
  'createdAt',
  'updatedAt',
].join(',')

/**
 * Fetch backlog items from the backend API.
 *
 * Requests only the fields needed for the list view to reduce
 * response payload size.
 *
 * Throws with a specific error message extracted from the API error response,
 * or falls back to a generic message if parsing fails.
 */
async function fetchBacklogItems(): Promise<BacklogListResponse> {
  return apiFetchJson<BacklogListResponse>(
    `${API_URL}/backlog-items?fields=${encodeURIComponent(LIST_VIEW_FIELDS)}`,
    undefined,
    {
      fallbackMessage: 'Failed to load backlog items. Please try again.',
    },
  )
}

/**
 * TanStack Query hook for fetching and caching backlog items.
 *
 * - Stale after 5 minutes (QueryClient default staleTime)
 * - Cached for 10 minutes (explicit gcTime) to survive navigation
 * - Retries up to 2x for server/network errors; skips retry for 4xx (QueryClient default)
 * - Provides `isLoading`, `error`, `data`, and `refetch`
 */
export function useBacklogItems() {
  return useQuery({
    queryKey: ['backlog-items'],
    queryFn: fetchBacklogItems,
    gcTime: 10 * 60 * 1000, // 10 minutes — survive navigation back to list
  })
}
