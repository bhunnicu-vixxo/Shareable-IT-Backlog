import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSyncTrigger } from './use-sync-trigger'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return { Wrapper, queryClient }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

const mockSyncingStatus: SyncStatus = {
  lastSyncedAt: null,
  status: 'syncing',
  itemCount: null,
  errorMessage: null,
  errorCode: null,
}

describe('useSyncTrigger', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should call POST /api/sync/trigger', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve(mockSyncingStatus),
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSyncTrigger(), { wrapper: Wrapper })

    await act(async () => {
      result.current.triggerSync()
    })

    await waitFor(() => {
      expect(result.current.isTriggering).toBe(false)
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sync/trigger'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should invalidate sync-status query on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve(mockSyncingStatus),
    })

    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSyncTrigger(), { wrapper: Wrapper })

    await act(async () => {
      result.current.triggerSync()
    })

    await waitFor(() => {
      expect(result.current.isTriggering).toBe(false)
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sync-status'] }),
    )
  })

  it('should handle 409 error (already syncing)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve(mockSyncingStatus),
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSyncTrigger(), { wrapper: Wrapper })

    await act(async () => {
      result.current.triggerSync()
    })

    await waitFor(() => {
      expect(result.current.triggerError).not.toBeNull()
    })

    expect(result.current.triggerError?.message).toBe('Sync already in progress')
  })

  it('should return isTriggering while mutation is pending', async () => {
    // Never-resolving fetch to keep the mutation pending
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSyncTrigger(), { wrapper: Wrapper })

    act(() => {
      result.current.triggerSync()
    })

    await waitFor(() => {
      expect(result.current.isTriggering).toBe(true)
    })
  })
})
