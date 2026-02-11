import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBacklogItems } from './use-backlog-items'
import type { BacklogListResponse } from '../types/backlog.types'

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

const mockResponse: BacklogListResponse = {
  items: [
    {
      id: 'issue-1',
      identifier: 'VIX-1',
      title: 'Test Issue',
      description: null,
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
      sortOrder: 1.0,
      prioritySortOrder: 1.0,
      url: 'https://linear.app/vixxo/issue/VIX-1',
      isNew: false,
    },
  ],
  pageInfo: { hasNextPage: false, endCursor: null },
  totalCount: 1,
}

describe('useBacklogItems', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch and return backlog items on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() => useBacklogItems(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backlog-items'),
    )
  })

  it('should set error state on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { message: 'Service temporarily unavailable', code: 'INTERNAL_ERROR' },
        }),
    })

    const { result } = renderHook(() => useBacklogItems(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Service temporarily unavailable')
  })

  it('should use fallback message when error body cannot be parsed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    })

    const { result } = renderHook(() => useBacklogItems(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe(
      'Failed to load backlog items. Please try again.',
    )
  })

  it('should start in loading state', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useBacklogItems(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})
