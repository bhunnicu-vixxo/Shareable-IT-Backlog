import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBacklogItemDetail } from './use-backlog-item-detail'
import { ApiError } from '@/utils/api-error'
import type { BacklogDetailResponse } from '../types/backlog.types'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useBacklogItemDetail', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('does not fetch when id is null', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderHook(() => useBacklogItemDetail(null), {
      wrapper: createWrapper(),
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches and returns item detail when id is provided', async () => {
    const detailResponse: BacklogDetailResponse = {
      item: {
        id: 'issue-1',
        identifier: 'VIX-1',
        title: 'Test item',
        description: 'Description',
        priority: 2,
        priorityLabel: 'High',
        status: 'In Progress',
        statusType: 'started',
        assigneeName: null,
        projectName: 'Test',
        teamName: 'Vixxo',
        labels: [],
        createdAt: '2026-02-05T10:00:00.000Z',
        updatedAt: '2026-02-05T12:00:00.000Z',
        completedAt: null,
        dueDate: null,
        sortOrder: 1,
        prioritySortOrder: 1,
        url: 'https://linear.app/vixxo/issue/VIX-1',
        isNew: false,
      },
      comments: [],
      activities: [],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detailResponse),
    })

    const { result } = renderHook(() => useBacklogItemDetail('issue-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(detailResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backlog-items/issue-1'),
    )
  })

  // ──── Error type differentiation ─────────────────────────────────────────

  it('throws ApiError with status 404 when API returns 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          error: { message: 'Backlog item not found', code: 'NOT_FOUND' },
        }),
    })

    const { result } = renderHook(() => useBacklogItemDetail('non-existent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(ApiError)
    const apiError = result.current.error as ApiError
    expect(apiError.message).toBe('Backlog item not found')
    expect(apiError.status).toBe(404)
    expect(apiError.code).toBe('NOT_FOUND')
    expect(apiError.isNotFound).toBe(true)
  })

  it('throws ApiError with status 500 when API returns server error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
        }),
    })

    const { result } = renderHook(() => useBacklogItemDetail('issue-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(ApiError)
    const apiError = result.current.error as ApiError
    expect(apiError.message).toBe('Internal server error')
    expect(apiError.status).toBe(500)
    expect(apiError.isNotFound).toBe(false)
    expect(apiError.isServerError).toBe(true)
  })

  it('throws ApiError with defaults when response body is not JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })

    const { result } = renderHook(() => useBacklogItemDetail('issue-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(ApiError)
    const apiError = result.current.error as ApiError
    expect(apiError.message).toBe('Failed to load item details. Please try again.')
    expect(apiError.status).toBe(502)
    expect(apiError.code).toBe('UNKNOWN_ERROR')
  })

  it('throws plain Error on network failure (no response)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => useBacklogItemDetail('issue-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Network errors throw TypeError, not ApiError
    expect(result.current.error).toBeInstanceOf(TypeError)
    expect((result.current.error as Error).message).toBe('Failed to fetch')
  })

  it('provides refetch function for retry support', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { message: 'Server error', code: 'INTERNAL_ERROR' },
        }),
    })

    const { result } = renderHook(() => useBacklogItemDetail('issue-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // refetch should be available as a function
    expect(typeof result.current.refetch).toBe('function')
  })
})
