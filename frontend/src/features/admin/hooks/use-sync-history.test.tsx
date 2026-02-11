import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSyncHistory } from './use-sync-history'
import type { SyncHistoryEntry } from '../types/admin.types'

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

const mockHistoryData: SyncHistoryEntry[] = [
  {
    id: 1,
    status: 'success',
    triggerType: 'scheduled',
    triggeredBy: null,
    startedAt: '2026-02-10T06:00:00.000Z',
    completedAt: '2026-02-10T06:00:02.000Z',
    durationMs: 2000,
    itemsSynced: 100,
    itemsFailed: 0,
    errorMessage: null,
    errorDetails: null,
    createdAt: '2026-02-10T06:00:00.000Z',
  },
  {
    id: 2,
    status: 'error',
    triggerType: 'manual',
    triggeredBy: 5,
    startedAt: '2026-02-10T12:00:00.000Z',
    completedAt: '2026-02-10T12:00:01.000Z',
    durationMs: 1000,
    itemsSynced: 0,
    itemsFailed: 0,
    errorMessage: 'Connection refused',
    errorDetails: { errorCode: 'SYNC_API_UNAVAILABLE' },
    createdAt: '2026-02-10T12:00:00.000Z',
  },
]

describe('useSyncHistory', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch sync history and return data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    })

    const { result } = renderHook(() => useSyncHistory(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.history).toEqual([])

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.history).toHaveLength(2)
    expect(result.current.history[0].status).toBe('success')
    expect(result.current.history[1].status).toBe('error')
    expect(result.current.error).toBeNull()
  })

  it('should call the correct API endpoint with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useSyncHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/sync/history'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('should handle fetch errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useSyncHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.history).toEqual([])
  })

  it('should return empty array when no history', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    const { result } = renderHook(() => useSyncHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.history).toEqual([])
  })

  it('should provide a refetch function', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    })

    const { result } = renderHook(() => useSyncHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')
  })
})
