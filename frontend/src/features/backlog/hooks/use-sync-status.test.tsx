import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...original,
    useQuery: vi.fn(),
  }
})

import { renderHook } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { useSyncStatus } from './use-sync-status'
import type { SyncStatus } from '../types/backlog.types'

const mockSuccessStatus: SyncStatus = {
  lastSyncedAt: '2026-02-10T06:05:00.000Z',
  status: 'success',
  itemCount: 42,
  errorMessage: null,
  errorCode: null,
  itemsSynced: null,
  itemsFailed: null,
}

describe('useSyncStatus (backlog)', () => {
  const mockUseQuery = vi.mocked(useQuery)

  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseQuery.mockReset()
  })

  it('should configure TanStack Query with expected options', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useQuery>)

    renderHook(() => useSyncStatus())

    expect(mockUseQuery).toHaveBeenCalledTimes(1)
    const options = mockUseQuery.mock.calls[0]?.[0]
    expect(options).toEqual(
      expect.objectContaining({
        queryKey: ['sync-status', 'backlog'],
        refetchInterval: 5_000,
        staleTime: 30_000,
      }),
    )
    expect(typeof options.queryFn).toBe('function')
  })

  it('should map TanStack Query state to hook return shape', () => {
    mockUseQuery.mockReturnValue({
      data: mockSuccessStatus,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>)

    const { result } = renderHook(() => useSyncStatus())
    expect(result.current.syncStatus).toEqual(mockSuccessStatus)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch sync status via queryFn', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessStatus),
    })
    globalThis.fetch = fetchSpy

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>)

    renderHook(() => useSyncStatus())
    const options = mockUseQuery.mock.calls[0]?.[0] as unknown as { queryFn: () => Promise<SyncStatus> }

    const data = await options.queryFn()
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/sync/status'),
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(data).toEqual(mockSuccessStatus)
  })

  it('should throw from queryFn when response is not ok', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
    })
    globalThis.fetch = fetchSpy

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>)

    renderHook(() => useSyncStatus())
    const options = mockUseQuery.mock.calls[0]?.[0] as unknown as { queryFn: () => Promise<SyncStatus> }

    await expect(options.queryFn()).rejects.toThrow('Failed to fetch sync status')
  })
})
