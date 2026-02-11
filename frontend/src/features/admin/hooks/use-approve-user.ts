import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

/**
 * TanStack Query mutation hook for approving a pending user (admin only).
 * Invalidates the pending users query on success.
 */
export function useApproveUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, number>({
    mutationFn: async (userId: number) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to approve user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
    },
  })

  return {
    approveUser: mutation.mutateAsync,
    isApproving: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
