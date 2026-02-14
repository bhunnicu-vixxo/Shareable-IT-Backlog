import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePermissions } from './use-permissions'

// Mock useAuth to control role booleans
const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

const defaultAuthState = {
  user: null,
  isLoading: false,
  isIdentified: false,
  isApproved: false,
  isAdmin: false,
  isIT: false,
  error: null,
  identify: vi.fn(),
  isIdentifying: false,
  identifyError: null,
  logout: vi.fn(),
  isLoggingOut: false,
  checkSession: vi.fn(),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('usePermissions', () => {
  it('returns correct permissions for a regular user', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: false, isAdmin: false })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    expect(result.current.canViewLinearLinks).toBe(false)
    expect(result.current.canViewMigrationMetadata).toBe(false)
    expect(result.current.canManageUsers).toBe(false)
    expect(result.current.canConfigureSystem).toBe(false)
    expect(result.current.role).toBe('user')
  })

  it('returns correct permissions for an IT user', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: true, isAdmin: false })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    expect(result.current.canViewLinearLinks).toBe(true)
    expect(result.current.canViewMigrationMetadata).toBe(true)
    expect(result.current.canManageUsers).toBe(false)
    expect(result.current.canConfigureSystem).toBe(false)
    expect(result.current.role).toBe('it')
  })

  it('returns correct permissions for an Admin user', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: false, isAdmin: true })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    expect(result.current.canViewLinearLinks).toBe(true)
    expect(result.current.canViewMigrationMetadata).toBe(true)
    expect(result.current.canManageUsers).toBe(true)
    expect(result.current.canConfigureSystem).toBe(true)
    expect(result.current.role).toBe('admin')
  })

  it('returns admin role when user is both IT and Admin', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: true, isAdmin: true })

    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() })

    expect(result.current.role).toBe('admin')
    expect(result.current.canManageUsers).toBe(true)
    expect(result.current.canViewLinearLinks).toBe(true)
  })

  it('returns stable reference when dependencies do not change', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: true, isAdmin: false })

    const { result, rerender } = renderHook(() => usePermissions(), {
      wrapper: createWrapper(),
    })

    const firstResult = result.current
    rerender()
    const secondResult = result.current

    // The return object should be memoized (same reference)
    expect(firstResult).toBe(secondResult)
  })
})
