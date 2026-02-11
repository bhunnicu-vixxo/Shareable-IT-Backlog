import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getSyncStatusRefetchInterval, useSyncStatus } from './use-sync-status'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'

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

const mockIdleStatus: SyncStatus = {
  lastSyncedAt: null,
  status: 'idle',
  itemCount: null,
  errorMessage: null,
  errorCode: null,
  itemsSynced: null,
  itemsFailed: null,
}

const mockSyncingStatus: SyncStatus = {
  lastSyncedAt: '2026-02-10T06:00:00.000Z',
  status: 'syncing',
  itemCount: null,
  errorMessage: null,
  errorCode: null,
  itemsSynced: null,
  itemsFailed: null,
}

const mockSuccessStatus: SyncStatus = {
  lastSyncedAt: '2026-02-10T06:05:00.000Z',
  status: 'success',
  itemCount: 42,
  errorMessage: null,
  errorCode: null,
  itemsSynced: null,
  itemsFailed: null,
}

describe('useSyncStatus', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('should return sync status on successful fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessStatus),
    })

    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.syncStatus).toEqual(mockSuccessStatus)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should return null syncStatus before data is loaded', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    expect(result.current.syncStatus).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('should set error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
  })

  it('should set 2s polling interval when status is syncing', () => {
    expect(getSyncStatusRefetchInterval(true, mockSyncingStatus)).toBe(2000)
  })

  it('should stop polling when status is not syncing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIdleStatus),
    })

    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.syncStatus).toEqual(mockIdleStatus)
    })

    // Idle status should not trigger polling
    expect(result.current.syncStatus?.status).toBe('idle')
    expect(getSyncStatusRefetchInterval(true, mockIdleStatus)).toBe(false)
  })

  it('should provide refetch function', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessStatus),
    })

    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.syncStatus).not.toBeNull()
    })

    expect(typeof result.current.refetch).toBe('function')
  })

  it('should disable polling when pollWhileSyncing is false', () => {
    expect(getSyncStatusRefetchInterval(false, mockSyncingStatus)).toBe(false)
  })
})
