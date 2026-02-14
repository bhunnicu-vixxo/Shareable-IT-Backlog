import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

/**
 * TanStack Query hook for fetching visible label names (public endpoint).
 *
 * Fetches GET /api/labels/visible with session credentials.
 * Returns the list of visible label names and loading state.
 */
export function useVisibleLabels() {
  const query = useQuery<string[]>({
    queryKey: ['visible-labels'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/labels/visible`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Failed to fetch visible labels'
        throw new Error(message)
      }
      return response.json() as Promise<string[]>
    },
    staleTime: 30_000,
  })

  return {
    visibleLabels: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
