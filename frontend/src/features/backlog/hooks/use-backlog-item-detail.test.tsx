import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBacklogItemDetail } from './use-backlog-item-detail'
import type { BacklogDetailResponse } from '../types/backlog.types'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

  it('throws error message from API when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
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

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('Backlog item not found')
  })
})
