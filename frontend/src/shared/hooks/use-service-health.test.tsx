import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Provider } from '@/components/ui/provider'
import { ApiError } from '@/utils/api-error'
import { useServiceHealth } from './use-service-health'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Provider>
    )
  }

  return { Wrapper, queryClient }
}

describe('useServiceHealth', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns isServiceUnavailable false initially', () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    expect(result.current.isServiceUnavailable).toBe(false)
    expect(result.current.retry).toBeTypeOf('function')
  })

  it('sets isServiceUnavailable true after 3 consecutive 503 errors', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    // Simulate 3 consecutive 503 queries
    for (let i = 0; i < 3; i++) {
      queryClient.setQueryDefaults([`test-query-${i}`], { retry: false })
      queryClient.fetchQuery({
        queryKey: [`test-query-${i}`],
        queryFn: () => { throw new ApiError('Service unavailable', 503) },
      }).catch(() => { /* expected */ })
    }

    await waitFor(() => {
      expect(result.current.isServiceUnavailable).toBe(true)
    })
  })

  it('does not trigger for fewer than 3 errors', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    // Simulate 2 consecutive 503 queries (below threshold)
    for (let i = 0; i < 2; i++) {
      queryClient.fetchQuery({
        queryKey: [`test-err-${i}`],
        queryFn: () => { throw new ApiError('Service unavailable', 503) },
      }).catch(() => { /* expected */ })
    }

    // Give time for events to process
    await new Promise((r) => setTimeout(r, 50))

    expect(result.current.isServiceUnavailable).toBe(false)
  })

  it('resets to available on a successful query after failures', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      queryClient.fetchQuery({
        queryKey: [`fail-${i}`],
        queryFn: () => { throw new ApiError('Service unavailable', 503) },
      }).catch(() => { /* expected */ })
    }

    await waitFor(() => {
      expect(result.current.isServiceUnavailable).toBe(true)
    })

    // Now succeed
    queryClient.fetchQuery({
      queryKey: ['success-recovery'],
      queryFn: () => Promise.resolve({ ok: true }),
    })

    await waitFor(() => {
      expect(result.current.isServiceUnavailable).toBe(false)
    })
  })

  it('retry resets state and invalidates queries', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      queryClient.fetchQuery({
        queryKey: [`retry-fail-${i}`],
        queryFn: () => { throw new ApiError('Service unavailable', 503) },
      }).catch(() => { /* expected */ })
    }

    await waitFor(() => {
      expect(result.current.isServiceUnavailable).toBe(true)
    })

    // Call retry
    act(() => {
      result.current.retry()
    })

    expect(result.current.isServiceUnavailable).toBe(false)
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('detects TypeError network errors (cross-browser)', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    // Simulate 3 consecutive TypeError network errors
    for (let i = 0; i < 3; i++) {
      queryClient.fetchQuery({
        queryKey: [`network-err-${i}`],
        queryFn: () => { throw new TypeError('Load failed') }, // Safari-style
      }).catch(() => { /* expected */ })
    }

    await waitFor(() => {
      expect(result.current.isServiceUnavailable).toBe(true)
    })
  })

  it('ignores non-503, non-network errors', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useServiceHealth(), { wrapper: Wrapper })

    // Simulate 3 consecutive 404 errors (not 503)
    for (let i = 0; i < 3; i++) {
      queryClient.fetchQuery({
        queryKey: [`not-found-${i}`],
        queryFn: () => { throw new ApiError('Not found', 404) },
      }).catch(() => { /* expected */ })
    }

    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.isServiceUnavailable).toBe(false)
  })
})
