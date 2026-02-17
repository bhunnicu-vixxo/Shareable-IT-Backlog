import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

/**
 * TanStack Query mutation hook for rejecting a pending user (admin only).
 * Invalidates pending-users and all-users queries on success.
 */
export function useRejectUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, number>({
    mutationFn: async (userId: number) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/reject`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to reject user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
    },
  })

  return {
    rejectUser: mutation.mutateAsync,
    isRejecting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
