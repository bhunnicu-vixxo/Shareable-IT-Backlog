import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

interface ToggleITRoleParams {
  userId: number
  isIT: boolean
}

/**
 * TanStack Query mutation hook for toggling a user's IT role (admin only).
 * Invalidates all-users query on success.
 */
export function useToggleITRole() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, ToggleITRoleParams>({
    mutationFn: async ({ userId, isIT }: ToggleITRoleParams) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/it-role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isIT }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to update IT role')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
    },
  })

  return {
    toggleITRole: mutation.mutateAsync,
    isToggling: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
