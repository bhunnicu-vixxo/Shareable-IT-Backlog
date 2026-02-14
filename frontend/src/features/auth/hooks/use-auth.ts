import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { User } from '../types/auth.types'

async function fetchMe(): Promise<User> {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include',
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthError('Not authenticated', 'AUTH_REQUIRED')
    }
    throw new Error('Failed to fetch user profile')
  }
  return response.json()
}

async function postIdentify(email: string): Promise<User> {
  const response = await fetch(`${API_URL}/auth/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message ?? 'Failed to identify')
  }
  return response.json()
}

async function postLogout(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message ?? 'Failed to log out')
  }
}

export class AuthError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
    this.name = 'AuthError'
  }
}

/**
 * Hook to manage auth state. Uses TanStack Query for session checking.
 *
 * On mount: calls GET /api/auth/me to check for existing session.
 * identify(email): calls POST /api/auth/identify to create session.
 * logout(): calls POST /api/auth/logout to destroy session.
 */
export function useAuth() {
  const queryClient = useQueryClient()

  const meQuery = useQuery<User, Error>({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const identifyMutation = useMutation<User, Error, string>({
    mutationFn: postIdentify,
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user)
    },
  })

  const logoutMutation = useMutation<void, Error>({
    mutationFn: postLogout,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
    },
  })

  // Determine auth state
  const isLoading = meQuery.isLoading
  const isAuthError = meQuery.error instanceof AuthError
  const user = meQuery.data ?? null

  return {
    user,
    isLoading,
    isIdentified: user !== null,
    isApproved: user?.isApproved === true && user?.isDisabled !== true,
    isAdmin: user?.isAdmin === true,
    isIT: user?.isIT === true,
    error: meQuery.error && !isAuthError ? meQuery.error.message : null,
    identify: identifyMutation.mutateAsync,
    isIdentifying: identifyMutation.isPending,
    identifyError: identifyMutation.error?.message ?? null,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    checkSession: () => meQuery.refetch(),
  }
}
