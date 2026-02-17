import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUnseenCount } from './use-unseen-count'

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

describe('useUnseenCount', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch and return unseen count on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ unseenCount: 5, lastSeenAt: '2026-02-15T10:00:00.000Z' }),
    })

    const { result } = renderHook(() => useUnseenCount(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      unseenCount: 5,
      lastSeenAt: '2026-02-15T10:00:00.000Z',
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/unseen-count'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('should handle null lastSeenAt (first-time user)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ unseenCount: 42, lastSeenAt: null }),
    })

    const { result } = renderHook(() => useUnseenCount(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.unseenCount).toBe(42)
    expect(result.current.data?.lastSeenAt).toBeNull()
  })

  it('should set error state on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    })

    const { result } = renderHook(() => useUnseenCount(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Failed to load unseen count.')
  })

  it('should start in loading state', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useUnseenCount(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})
