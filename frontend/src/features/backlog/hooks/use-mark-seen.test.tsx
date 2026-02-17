import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMarkSeen } from './use-mark-seen'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    },
  }
}

describe('useMarkSeen', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('should call POST /api/users/mark-seen after delay once triggered', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lastSeenAt: '2026-02-17T12:00:00.000Z' }),
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMarkSeen(), { wrapper: Wrapper })

    act(() => {
      result.current.trigger()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await vi.runAllTicks()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/mark-seen'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('should invalidate unseen-count query on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lastSeenAt: '2026-02-17T12:00:00.000Z' }),
    })

    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMarkSeen(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['unseen-count'] }),
    )
  })

  it('should only fire once even on re-renders', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lastSeenAt: '2026-02-17T12:00:00.000Z' }),
    })

    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useMarkSeen(), { wrapper: Wrapper })

    act(() => {
      result.current.trigger()
      result.current.trigger()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await vi.runAllTicks()
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    // Re-render — should NOT fire again
    rerender()

    act(() => {
      result.current.trigger()
    })
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await vi.runAllTicks()
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lastSeenAt: '2026-02-17T12:00:00.000Z' }),
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMarkSeen({ enabled: false }), { wrapper: Wrapper })

    act(() => {
      result.current.trigger()
    })

    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await vi.runAllTicks()
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
