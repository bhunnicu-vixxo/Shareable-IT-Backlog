import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'

interface UnseenCountResponse {
  unseenCount: number
  lastSeenAt: string | null
}

async function fetchUnseenCount(): Promise<UnseenCountResponse> {
  return apiFetchJson<UnseenCountResponse>(
    `${API_URL}/users/unseen-count`,
    undefined,
    { fallbackMessage: 'Failed to load unseen count.' },
  )
}

/**
 * TanStack Query hook for fetching the authenticated user's unseen backlog item count.
 *
 * - Stale after 30 seconds (short — badge should stay reasonably current)
 * - Cached for 5 minutes to survive navigation
 * - Provides `unseenCount` and `lastSeenAt`
 */
export function useUnseenCount() {
  return useQuery({
    queryKey: ['unseen-count'],
    queryFn: fetchUnseenCount,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
