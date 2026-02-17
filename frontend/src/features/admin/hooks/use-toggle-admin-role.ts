import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

interface ToggleAdminRoleParams {
  userId: number
  isAdmin: boolean
}

/**
 * TanStack Query mutation hook for promoting/demoting a user's admin role (admin only).
 * Invalidates all-users query on success.
 */
export function useToggleAdminRole() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, ToggleAdminRoleParams>({
    mutationFn: async ({ userId, isAdmin }: ToggleAdminRoleParams) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/admin-role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isAdmin }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to update admin role')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
    },
  })

  return {
    toggleAdminRole: mutation.mutateAsync,
    isToggling: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
