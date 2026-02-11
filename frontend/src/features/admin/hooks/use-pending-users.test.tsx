import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePendingUsers } from './use-pending-users'

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

const mockPendingUsers = [
  { id: 2, email: 'pending@vixxo.com', displayName: 'Pending User', createdAt: '2026-02-10T10:00:00Z' },
  { id: 3, email: 'another@vixxo.com', displayName: 'Another', createdAt: '2026-02-10T11:00:00Z' },
]

describe('usePendingUsers', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch pending users', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPendingUsers),
    })

    const { result } = renderHook(() => usePendingUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pendingUsers).toEqual(mockPendingUsers)
  })

  it('should return empty array when no pending users', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    const { result } = renderHook(() => usePendingUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pendingUsers).toEqual([])
  })

  it('should handle fetch error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
    })

    const { result } = renderHook(() => usePendingUsers(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })
})
