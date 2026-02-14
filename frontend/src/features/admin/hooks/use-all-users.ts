import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

export interface ManagedUser {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isIT: boolean
  isApproved: boolean
  isDisabled: boolean
  approvedAt: string | null
  lastAccessAt: string | null
  createdAt: string
}

/**
 * TanStack Query hook for fetching all users (admin only).
 * Returns approved, pending, and disabled users for the management view.
 */
export function useAllUsers() {
  const query = useQuery<ManagedUser[]>({
    queryKey: ['admin', 'all-users'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/users`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      return response.json()
    },
    staleTime: 30_000, // 30s
  })

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
