import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useLabelVisibility, useLabelVisibilityMutation } from './use-label-visibility'
import type { LabelVisibilityEntry } from '../types/admin.types'

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

const mockLabels: LabelVisibilityEntry[] = [
  {
    labelName: 'Bug',
    isVisible: true,
    showOnCards: true,
    firstSeenAt: '2026-02-14T10:00:00.000Z',
    reviewedAt: '2026-02-14T12:00:00.000Z',
    updatedAt: '2026-02-14T12:00:00.000Z',
    updatedBy: 1,
    itemCount: 10,
  },
  {
    labelName: 'Tech Debt',
    isVisible: false,
    showOnCards: true,
    firstSeenAt: '2026-02-14T10:00:00.000Z',
    reviewedAt: null,
    updatedAt: '2026-02-14T10:00:00.000Z',
    updatedBy: null,
    itemCount: 5,
  },
]

describe('useLabelVisibility', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch labels and return data with unreviewed count', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLabels),
    })

    const { result } = renderHook(() => useLabelVisibility(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.labels).toEqual([])

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.labels).toHaveLength(2)
    expect(result.current.labels[0].labelName).toBe('Bug')
    expect(result.current.unreviewedCount).toBe(1) // Tech Debt is unreviewed
    expect(result.current.error).toBeNull()
  })

  it('should call the correct API endpoint with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useLabelVisibility(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/settings/labels'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('should handle fetch errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Server error' } }),
    })

    const { result } = renderHook(() => useLabelVisibility(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(result.current.labels).toEqual([])
    expect(result.current.unreviewedCount).toBe(0)
  })

  it('should return zero unreviewed count when all labels are reviewed', async () => {
    const allReviewed = mockLabels.map((l) => ({
      ...l,
      reviewedAt: '2026-02-14T12:00:00.000Z',
    }))
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(allReviewed),
    })

    const { result } = renderHook(() => useLabelVisibility(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.unreviewedCount).toBe(0)
  })
})

describe('useLabelVisibilityMutation', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should call PATCH endpoint for single label update', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLabels[0]),
    })
    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useLabelVisibilityMutation(), {
      wrapper: createWrapper(),
    })

    await result.current.updateLabel({ labelName: 'Bug', isVisible: false })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/settings/labels/Bug'),
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ isVisible: false }),
      }),
    )
  })

  it('should call bulk PATCH endpoint for multiple labels', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLabels),
    })
    globalThis.fetch = fetchMock

    const { result } = renderHook(() => useLabelVisibilityMutation(), {
      wrapper: createWrapper(),
    })

    const updates = [
      { labelName: 'Bug', isVisible: true },
      { labelName: 'Tech Debt', isVisible: false },
    ]
    await result.current.bulkUpdateLabels(updates)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/settings/labels/bulk'),
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ labels: updates }),
      }),
    )
  })

  it('should handle mutation errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { message: 'Label not found' } }),
    })

    const { result } = renderHook(() => useLabelVisibilityMutation(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.updateLabel({ labelName: 'Unknown', isVisible: true }),
    ).rejects.toThrow('Label not found')
  })
})
