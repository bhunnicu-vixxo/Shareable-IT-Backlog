import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

interface ToggleParams {
  userId: number
  action: 'disable' | 'enable'
}

/**
 * TanStack Query mutation hook for toggling user disabled status (admin only).
 * Invalidates both all-users and pending-users queries on success.
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, ToggleParams>({
    mutationFn: async ({ userId, action }: ToggleParams) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? `Failed to ${action} user`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
    },
  })

  return {
    toggleStatus: mutation.mutateAsync,
    isToggling: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
