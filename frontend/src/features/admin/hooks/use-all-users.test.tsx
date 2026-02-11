import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAllUsers } from './use-all-users'

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

const mockUsers = [
  { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false, approvedAt: '2026-02-10T10:00:00Z', lastAccessAt: '2026-02-10T14:00:00Z', createdAt: '2026-02-10T10:00:00Z' },
  { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', isAdmin: false, isApproved: false, isDisabled: false, approvedAt: null, lastAccessAt: null, createdAt: '2026-02-10T11:00:00Z' },
  { id: 3, email: 'disabled@vixxo.com', displayName: 'Disabled', isAdmin: false, isApproved: true, isDisabled: true, approvedAt: '2026-02-10T10:00:00Z', lastAccessAt: null, createdAt: '2026-02-10T12:00:00Z' },
]

describe('useAllUsers', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch all users', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    })

    const { result } = renderHook(() => useAllUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.users).toEqual(mockUsers)
    expect(result.current.users).toHaveLength(3)
  })

  it('should return empty array when no users', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    const { result } = renderHook(() => useAllUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.users).toEqual([])
  })

  it('should handle fetch error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Internal Server Error' } }),
    })

    const { result } = renderHook(() => useAllUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })
})
