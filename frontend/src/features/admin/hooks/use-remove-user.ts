import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

/**
 * TanStack Query mutation hook for permanently removing a disabled user (admin only).
 * Invalidates all-users query on success.
 */
export function useRemoveUser() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, number>({
    mutationFn: async (userId: number) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to remove user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
    },
  })

  return {
    removeUser: mutation.mutateAsync,
    isRemoving: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
