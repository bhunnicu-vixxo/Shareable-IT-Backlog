import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import { BacklogList } from './backlog-list'
import type {
  BacklogListResponse,
  BacklogItem,
  BacklogDetailResponse,
  BacklogItemComment,
} from '../types/backlog.types'

// Mock @tanstack/react-virtual because jsdom has no real layout engine.
// Most tests want the full list in the DOM; some tests set a "visible window"
// to verify that BacklogList renders only a subset of items.
let virtualItemsLimit: number | null = null
const scrollToOffset = vi.fn()
const scrollToIndex = vi.fn()
vi.mock('@/shared/hooks/use-visible-labels', () => ({
  useVisibleLabels: () => ({
    visibleLabels: ['Siebel', 'Gateway', 'VixxoLink', 'Corrigo', 'Bug', 'Feature', 'Enhancement'],
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: virtualItemsLimit ?? count }, (_, i) => ({
        index: i,
        start: i * 140,
        size: 140,
        key: i,
      })),
    getTotalSize: () => count * 140,
    scrollToOffset,
    scrollToIndex,
    measureElement: vi.fn(),
  }),
}))

function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'issue-1',
    identifier: 'VIX-1',
    title: 'Test Issue',
    description: null,
    priority: 2,
    priorityLabel: 'High',
    status: 'In Progress',
    statusType: 'started',
    assigneeName: null,
    projectName: 'Test Project',
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
    ...overrides,
  }
}

function mockFetchSuccess(response: BacklogListResponse) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  })
}

function mockFetchError(message: string) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: { message, code: 'INTERNAL_ERROR' } }),
  })
}

describe('BacklogList', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    virtualItemsLimit = null
    scrollToOffset.mockReset()
    scrollToIndex.mockReset()
  })

  it('shows loading skeleton while fetching', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    render(<BacklogList />)

    // Loading skeleton container should be present
    expect(screen.getByTestId('backlog-list-loading')).toBeInTheDocument()

    // During loading, no actual content items should be shown
    expect(screen.queryByText('No backlog items found')).not.toBeInTheDocument()
    expect(screen.queryByText('Failed to load backlog items')).not.toBeInTheDocument()
  })

  it('renders backlog items when data loads successfully', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'First item', identifier: 'VIX-1' }),
        createMockItem({ id: '2', title: 'Second item', identifier: 'VIX-2' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('First item')).toBeInTheDocument()
    })
    expect(screen.getByText('Second item')).toBeInTheDocument()
  })

  it('excludes completed and cancelled items from the backlog view', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Active item', statusType: 'started' }),
        createMockItem({ id: '2', title: 'Completed item', statusType: 'completed' }),
        createMockItem({ id: '3', title: 'Cancelled item', statusType: 'cancelled' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Active item')).toBeInTheDocument()
    })
    expect(screen.queryByText('Completed item')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled item')).not.toBeInTheDocument()
  })

  it('displays results count', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1' }),
        createMockItem({ id: '2' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 2 items')).toBeInTheDocument()
    })
  })

  it('displays singular count for 1 item', async () => {
    const response: BacklogListResponse = {
      items: [createMockItem({ id: '1' })],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 1 item')).toBeInTheDocument()
    })
  })

  it('shows error state with retry button on API failure', async () => {
    mockFetchError('Service temporarily unavailable')

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load backlog items')).toBeInTheDocument()
    })
    expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('preserves stale data when refetch fails but cached data exists (AC #2)', async () => {
    const { focusManager } = await import('@tanstack/react-query')

    // Phase 1: Load data successfully
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Stale item A' }),
        createMockItem({ id: '2', title: 'Stale item B' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)
    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Stale item A')).toBeInTheDocument()
    })

    // Phase 2: Make subsequent fetches fail, then trigger refetch via focus
    mockFetchError('Linear API unavailable')
    focusManager.setFocused(true)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    // Items should still be visible (stale data preserved, not error state)
    expect(screen.getByText('Stale item A')).toBeInTheDocument()
    expect(screen.getByText('Stale item B')).toBeInTheDocument()
    expect(screen.queryByText('Failed to load backlog items')).not.toBeInTheDocument()

    // Cleanup focusManager state
    focusManager.setFocused(undefined)
  })

  it('shows empty state when no items returned', async () => {
    const response: BacklogListResponse = {
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('No backlog items found')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Data may not have been synced yet. Contact your admin to trigger a sync.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows "New only" filter button when new items exist', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Old item', isNew: false }),
        createMockItem({ id: '2', title: 'Fresh item', isNew: true }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Fresh item')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Show only new items, currently off' })).toBeInTheDocument()
    expect(screen.getByText('New only (1)')).toBeInTheDocument()
  })

  it('does not show filter button when no new items exist', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', isNew: false }),
        createMockItem({ id: '2', isNew: false }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 2 items')).toBeInTheDocument()
    })
    expect(screen.queryByText(/New only/)).not.toBeInTheDocument()
  })

  it('filters to show only new items when filter toggled', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Old item', isNew: false }),
        createMockItem({ id: '2', title: 'New item A', isNew: true }),
        createMockItem({ id: '3', title: 'New item B', isNew: true }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Old item')).toBeInTheDocument()
    })

    // Click the filter button
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    // Old item should be hidden, new items visible
    expect(screen.queryByText('Old item')).not.toBeInTheDocument()
    expect(screen.getByText('New item A')).toBeInTheDocument()
    expect(screen.getByText('New item B')).toBeInTheDocument()
    expect(screen.getByText('Showing 2 of 3 new items')).toBeInTheDocument()
  })

  it('toggles back to show all items', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Old item', isNew: false }),
        createMockItem({ id: '2', title: 'New item', isNew: true }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Old item')).toBeInTheDocument()
    })

    // Toggle on
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))
    expect(screen.queryByText('Old item')).not.toBeInTheDocument()

    // Toggle off — "Show all" button appears when filter is active
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently on' }))
    expect(screen.getByText('Old item')).toBeInTheDocument()
    expect(screen.getByText('New item')).toBeInTheDocument()
  })

  it('shows correct singular count for 1 new item in filter mode', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Old item', isNew: false }),
        createMockItem({ id: '2', title: 'Single new', isNew: true }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Old item')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))
    expect(screen.getByText('Showing 1 of 2 new items')).toBeInTheDocument()
  })

  it('opens detail modal when item is clicked', async () => {
    const listResponse: BacklogListResponse = {
      items: [
        createMockItem({ id: 'issue-1', title: 'Detail item', identifier: 'VIX-1' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    const detailResponse: BacklogDetailResponse = {
      item: createMockItem({
        id: 'issue-1',
        title: 'Detail item',
        identifier: 'VIX-1',
        description: 'Item description here',
      }),
      comments: [] as BacklogItemComment[],
      activities: [],
    }

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      const isDetailRequest = urlStr.includes('/backlog-items/') && urlStr.split('/').pop() !== 'backlog-items'
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(isDetailRequest ? detailResponse : listResponse),
      })
    })

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Detail item')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Detail item'))

    await waitFor(() => {
      expect(screen.getByLabelText('Backlog item details')).toBeInTheDocument()
    })

    await waitFor(
      () => {
        expect(screen.getByText('Item description here')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  // ─── Label Filter Tests ───

  it('renders LabelFilter dropdown in filter bar', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
        }),
        createMockItem({
          id: '2',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /filter by label/i })).toBeInTheDocument()
    })
    // Placeholder shows "All Labels"
    expect(
      screen.getByText('All Labels', { selector: '[data-part="value-text"]' }),
    ).toBeInTheDocument()
  })

  it('filters items by single label selection', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel item',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
        }),
        createMockItem({
          id: '2',
          title: 'Gateway item',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
        }),
        createMockItem({
          id: '3',
          title: 'VixxoLink item',
          labels: [{ id: 'l3', name: 'VixxoLink', color: '#0000ff' }],
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const siebelOption = await screen.findByRole('option', { name: /Siebel/ })
    fireEvent.click(siebelOption)

    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
      expect(screen.queryByText('Gateway item')).not.toBeInTheDocument()
      expect(screen.queryByText('VixxoLink item')).not.toBeInTheDocument()
    })
  })

  it('filters items by multiple labels (OR logic)', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel item',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
        }),
        createMockItem({
          id: '2',
          title: 'Gateway item',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
        }),
        createMockItem({
          id: '3',
          title: 'VixxoLink item',
          labels: [{ id: 'l3', name: 'VixxoLink', color: '#0000ff' }],
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
    })

    // Select Siebel
    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const siebelOption = await screen.findByRole('option', { name: /Siebel/ })
    fireEvent.click(siebelOption)

    // Select Gateway (multi-select, so click trigger again and select)
    const gatewayOption = await screen.findByRole('option', { name: /Gateway/ })
    fireEvent.click(gatewayOption)

    await waitFor(() => {
      // Both Siebel and Gateway items should be visible (OR logic)
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
      expect(screen.getByText('Gateway item')).toBeInTheDocument()
      // VixxoLink should be hidden
      expect(screen.queryByText('VixxoLink item')).not.toBeInTheDocument()
    })

    // Keep results count short for multi-select labels (VIX-431)
    await waitFor(() => {
      expect(
        screen.getByText(/Showing 2 of 3 items for 2 labels/),
      ).toBeInTheDocument()
    })
  })

  it('displays results count with label names when filtered', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel item 1',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
        }),
        createMockItem({
          id: '2',
          title: 'Siebel item 2',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
        }),
        createMockItem({
          id: '3',
          title: 'Gateway item',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 3 items')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const siebelOption = await screen.findByRole('option', { name: /Siebel/ })
    fireEvent.click(siebelOption)

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 3 items for Siebel')).toBeInTheDocument()
    })
  })

  it('combines label filter with "New only" filter', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel old',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: false,
        }),
        createMockItem({
          id: '2',
          title: 'Siebel new',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '3',
          title: 'Gateway new',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          isNew: true,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel old')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const siebelOption = await screen.findByRole('option', { name: /Siebel/ })
    fireEvent.click(siebelOption)

    await waitFor(() => {
      expect(screen.queryByText('Gateway new')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Siebel old')).toBeInTheDocument()
    expect(screen.getByText('Siebel new')).toBeInTheDocument()

    // Now toggle "New only"
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(screen.getByText('Siebel new')).toBeInTheDocument()
    })
    expect(screen.queryByText('Siebel old')).not.toBeInTheDocument()
  })

  it('shows empty filter state with "Clear label filter" when label filter returns no results', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel item',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '2',
          title: 'Gateway item',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          isNew: false,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const gatewayOption = await screen.findByRole('option', { name: /Gateway/ })
    fireEvent.click(gatewayOption)

    await waitFor(() => {
      expect(screen.getByText('Gateway item')).toBeInTheDocument()
    })

    // Now toggle "New only" — Gateway has no new items
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(screen.getByText('No new items for Gateway')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Clear label filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn off New only' })).toBeInTheDocument()
  })

  it('"Clear label filter" button resets label filter', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel item',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '2',
          title: 'Gateway item',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          isNew: false,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const gatewayOption = await screen.findByRole('option', { name: /Gateway/ })
    fireEvent.click(gatewayOption)

    await waitFor(() => {
      expect(screen.getByText('Gateway item')).toBeInTheDocument()
    })

    // Toggle new only → empty state (Gateway has no new items)
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(screen.getByText('No new items for Gateway')).toBeInTheDocument()
    })

    // Click "Clear label filter" to remove label filter
    fireEvent.click(screen.getByRole('button', { name: 'Clear label filter' }))

    // Now showing new items across all labels — only Siebel item is new
    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
    })
    expect(screen.queryByText('Gateway item')).not.toBeInTheDocument()
  })

  it('"Clear all filters" button resets all active filters at once', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel item',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '2',
          title: 'Gateway item',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          isNew: false,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const gatewayOption = await screen.findByRole('option', { name: /Gateway/ })
    fireEvent.click(gatewayOption)

    await waitFor(() => {
      expect(screen.getByText('Gateway item')).toBeInTheDocument()
    })

    // Toggle new only → empty state (Gateway has no new items)
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(screen.getByText('No new items for Gateway')).toBeInTheDocument()
    })

    // Click "Clear all filters" to reset everything
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))

    // Both items should be visible again
    await waitFor(() => {
      expect(screen.getByText('Siebel item')).toBeInTheDocument()
      expect(screen.getByText('Gateway item')).toBeInTheDocument()
    })
  })

  it('renders EmptyStateWithGuidance with role="status" when filters yield zero results', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Only item', isNew: false }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Only item')).toBeInTheDocument()
    })

    // Search for something that doesn't exist
    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  it('no-data BacklogEmptyState still renders when items array is empty', async () => {
    const response: BacklogListResponse = {
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('No backlog items found')).toBeInTheDocument()
    })
    // This is the no-data state, not the filter-empty state
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  // ─── Keyword Search Tests ───

  it('renders keyword search input in the filter bar', async () => {
    const response: BacklogListResponse = {
      items: [createMockItem({ id: '1' })],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: 'Search backlog items' })).toBeInTheDocument()
    })
  })

  it('filters items by keyword after debounce', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'VPN configuration' }),
        createMockItem({ id: '2', title: 'Database migration' }),
        createMockItem({ id: '3', title: 'Network VPN issue' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('VPN configuration')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'vpn' } })

    await waitFor(() => {
      expect(screen.queryByText('Database migration')).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText(/VPN configuration/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Network VPN issue/)).toBeInTheDocument()
  })

  it('shows empty state with "Clear search" when keyword search has no results', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'VPN configuration' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('VPN configuration')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByText('No items found matching "nonexistent"')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Clear search filter' })).toBeInTheDocument()
  })

  it('renders stack rank badges with sequential numbering', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Urgent item', priority: 1, priorityLabel: 'Urgent' }),
        createMockItem({ id: '2', title: 'Low item', priority: 4, priorityLabel: 'Low' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Urgent item')).toBeInTheDocument()
    })

    const rank1Badge = screen.getByRole('img', { name: 'Rank 1, Urgent priority' })
    const rank2Badge = screen.getByRole('img', { name: 'Rank 2, Low priority' })
    expect(rank1Badge).toHaveTextContent('1')
    expect(rank2Badge).toHaveTextContent('2')
  })

  // ─── Sorting Tests ───

  it('renders sort control in the filter bar', async () => {
    const response: BacklogListResponse = {
      items: [createMockItem({ id: '1' })],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /sort backlog items/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Sort descending' })).toBeInTheDocument()
  })

  it('sorts items by priority ascending by default (urgent first)', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Low item', priority: 4 }),
        createMockItem({ id: '2', title: 'Urgent item', priority: 1 }),
        createMockItem({ id: '3', title: 'Normal item', priority: 3 }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Urgent item')).toBeInTheDocument()
    })

    const cards = screen.getAllByRole('button', { name: /,\s*Priority/ })
    const titles = cards.map((card) => card.getAttribute('aria-label') ?? '')
    const urgentIdx = titles.findIndex((t) => t.includes('Urgent item'))
    const normalIdx = titles.findIndex((t) => t.includes('Normal item'))
    const lowIdx = titles.findIndex((t) => t.includes('Low item'))
    expect(urgentIdx).toBeLessThan(normalIdx)
    expect(normalIdx).toBeLessThan(lowIdx)
  })

  // ─── Virtual Scrolling Tests ───

  it('renders items inside a virtual scroll container', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Item A' }),
        createMockItem({ id: '2', title: 'Item B' }),
        createMockItem({ id: '3', title: 'Item C' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Item A')).toBeInTheDocument()
    })
    expect(screen.getByText('Item B')).toBeInTheDocument()
    expect(screen.getByText('Item C')).toBeInTheDocument()
  })

  it('resets virtual scroll position to top when filters change', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Old item', isNew: false }),
        createMockItem({ id: '2', title: 'New item', isNew: true }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Old item')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(scrollToOffset).toHaveBeenCalledWith(0)
    })
  })

  it('does not show "of Y" when all items are displayed', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Item A' }),
        createMockItem({ id: '2', title: 'Item B' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 2 items')).toBeInTheDocument()
    })
    expect(screen.queryByText(/of \d+ items/)).not.toBeInTheDocument()
  })

  // ─── Label filter empty state in virtual list ───

  it('renders EmptyStateWithGuidance outside virtual scroller when label filters yield no results', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel new',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '2',
          title: 'Gateway old',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          isNew: false,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel new')).toBeInTheDocument()
    })

    // Select Gateway label
    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const gatewayOption = await screen.findByRole('option', { name: /Gateway/ })
    fireEvent.click(gatewayOption)

    await waitFor(() => {
      expect(screen.getByText('Gateway old')).toBeInTheDocument()
    })

    // Toggle "New only" — Gateway has no new items → empty state
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(screen.getByTestId('empty-state-with-guidance')).toBeInTheDocument()
    })
    expect(screen.queryByText('Siebel new')).not.toBeInTheDocument()
    expect(screen.queryByText('Gateway old')).not.toBeInTheDocument()
  })

  // ─── Deep-link: ?item=VIX-XXX opens detail modal ───

  it('auto-opens detail modal when ?item= query param matches an item identifier', async () => {
    const listResponse: BacklogListResponse = {
      items: [
        createMockItem({ id: 'abc-123', title: 'Deep Link Target', identifier: 'VIX-338' }),
        createMockItem({ id: 'abc-456', title: 'Other Item', identifier: 'VIX-100' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    const detailResponse: BacklogDetailResponse = {
      item: createMockItem({ id: 'abc-123', title: 'Deep Link Target', identifier: 'VIX-338', description: 'Deep linked item' }),
      comments: [] as BacklogItemComment[],
      activities: [],
    }

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      const isDetailRequest = urlStr.includes('/backlog-items/') && urlStr.split('/').pop() !== 'backlog-items'
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(isDetailRequest ? detailResponse : listResponse),
      })
    })

    render(<BacklogList />, { initialEntries: ['/?item=VIX-338'] })

    // The detail modal should open for VIX-338
    await waitFor(() => {
      expect(screen.getByLabelText('Backlog item details')).toBeInTheDocument()
    })
  })

  it('does not open detail modal when ?item= does not match any identifier', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: 'abc-123', title: 'Some Item', identifier: 'VIX-338' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />, { initialEntries: ['/?item=VIX-999'] })

    await waitFor(() => {
      expect(screen.getByText('Some Item')).toBeInTheDocument()
    })

    // No dialog should open
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
