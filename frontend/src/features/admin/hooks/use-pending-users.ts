import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

export interface PendingUser {
  id: number
  email: string
  displayName: string | null
  createdAt: string
}

/**
 * TanStack Query hook for fetching pending users (admin only).
 */
export function usePendingUsers() {
  const query = useQuery<PendingUser[]>({
    queryKey: ['admin', 'pending-users'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/users/pending`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch pending users')
      }
      return response.json()
    },
    staleTime: 30_000, // 30s
  })

  return {
    pendingUsers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
