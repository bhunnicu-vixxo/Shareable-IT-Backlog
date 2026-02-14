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

  it('filters by description, teamName, status, and identifier', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Item one',
          description: 'This involves network security',
          teamName: 'Operations',
          status: 'In Progress',
          identifier: 'VIX-100',
        }),
        createMockItem({
          id: '2',
          title: 'Item two',
          description: 'Budget planning task',
          teamName: 'Finance',
          status: 'Backlog',
          identifier: 'VIX-200',
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Item one')).toBeInTheDocument()
    })

    // Search by description content
    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'network' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/Item one/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Item two/)).not.toBeInTheDocument()
    })

    // Search by identifier
    fireEvent.change(searchInput, { target: { value: 'VIX-200' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/Item two/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Item one/)).not.toBeInTheDocument()
    })
  })

  it('search is case-insensitive and trims whitespace', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'VPN Configuration' }),
        createMockItem({ id: '2', title: 'Database Setup' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('VPN Configuration')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: '  VpN  ' } })

    await waitFor(() => {
      // VPN Configuration should still be visible (matched); Database Setup should be gone
      expect(screen.getByLabelText(/VPN Configuration/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Database Setup/)).not.toBeInTheDocument()
    })
  })

  it('combines label + New-only + keyword search', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel vpn task',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '2',
          title: 'Siebel billing',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: true,
        }),
        createMockItem({
          id: '3',
          title: 'Gateway vpn task',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          isNew: true,
        }),
        createMockItem({
          id: '4',
          title: 'Siebel vpn old',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          isNew: false,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 4,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel vpn task')).toBeInTheDocument()
    })

    // Type keyword first
    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'vpn' } })

    await waitFor(() => {
      expect(screen.queryByLabelText(/Siebel billing/)).not.toBeInTheDocument()
    })

    // Toggle "New only" — should filter out "Siebel vpn old" (isNew: false)
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items, currently off' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Siebel vpn task/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Gateway vpn task/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Siebel vpn old/)).not.toBeInTheDocument()
    })
  })

  it('"Clear search" button in empty state resets keyword filter', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'VPN configuration' }),
        createMockItem({ id: '2', title: 'Database migration' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('VPN configuration')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } })

    await waitFor(() => {
      expect(screen.getByText(/No items found matching/)).toBeInTheDocument()
    })

    // Click the "Clear search filter" button in the empty-state area
    fireEvent.click(screen.getByRole('button', { name: 'Clear search filter' }))

    await waitFor(() => {
      expect(screen.getByText('VPN configuration')).toBeInTheDocument()
      expect(screen.getByText('Database migration')).toBeInTheDocument()
    })
  })

  it('highlights matching text in item titles when searching', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'VPN configuration issue' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('VPN configuration issue')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'vpn' } })

    await waitFor(() => {
      const markElement = document.querySelector('mark')
      expect(markElement).toBeInTheDocument()
      expect(markElement?.textContent).toBe('VPN')
    })
  })

  it('results count includes search query when active', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'VPN configuration' }),
        createMockItem({ id: '2', title: 'VPN monitoring' }),
        createMockItem({ id: '3', title: 'Database setup' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 3 items')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'vpn' } })

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 3 items matching "vpn"')).toBeInTheDocument()
    })
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

  it('reverses sort order when direction toggle is clicked', async () => {
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

    // Click direction toggle to switch to descending
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }))

    // Now priority descending (4, 3, 1 → Low, Normal, Urgent)
    await waitFor(() => {
      const cards = screen.getAllByRole('button', { name: /,\s*Priority/ })
      const titles = cards.map((card) => card.getAttribute('aria-label') ?? '')
      const urgentIdx = titles.findIndex((t) => t.includes('Urgent item'))
      const normalIdx = titles.findIndex((t) => t.includes('Normal item'))
      const lowIdx = titles.findIndex((t) => t.includes('Low item'))
      expect(lowIdx).toBeLessThan(normalIdx)
      expect(normalIdx).toBeLessThan(urgentIdx)
    })

    // Button label should now say "Sort ascending"
    expect(screen.getByRole('button', { name: 'Sort ascending' })).toBeInTheDocument()
  })

  it('keeps priority 0 ("None") items last in both asc and desc', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'None item', priority: 0, priorityLabel: 'None' }),
        createMockItem({ id: '2', title: 'Urgent item', priority: 1, priorityLabel: 'Urgent' }),
        createMockItem({ id: '3', title: 'Low item', priority: 4, priorityLabel: 'Low' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Urgent item')).toBeInTheDocument()
    })

    // Default (asc): None should be last
    const cardsAsc = screen.getAllByRole('button', { name: /,\s*Priority/ })
    const labelsAsc = cardsAsc.map((c) => c.getAttribute('aria-label') ?? '')
    const noneIdxAsc = labelsAsc.findIndex((l) => l.includes('None item'))
    const lastIdxAsc = labelsAsc.length - 1
    expect(noneIdxAsc).toBe(lastIdxAsc)

    // Toggle to desc: None should still be last
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }))

    await waitFor(() => {
      const cardsDesc = screen.getAllByRole('button', { name: /,\s*Priority/ })
      const labelsDesc = cardsDesc.map((c) => c.getAttribute('aria-label') ?? '')
      const noneIdxDesc = labelsDesc.findIndex((l) => l.includes('None item'))
      expect(noneIdxDesc).toBe(labelsDesc.length - 1)
    })
  })

  it('sorts by date created when sort field is changed', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Newest', createdAt: '2026-02-10T10:00:00.000Z' }),
        createMockItem({ id: '2', title: 'Oldest', createdAt: '2026-01-01T10:00:00.000Z' }),
        createMockItem({ id: '3', title: 'Middle', createdAt: '2026-02-01T10:00:00.000Z' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Newest')).toBeInTheDocument()
    })

    const trigger = screen.getByRole('combobox', { name: /sort backlog items/i })
    fireEvent.click(trigger)
    const option = await screen.findByRole('option', { name: 'Date Created' })
    fireEvent.click(option)

    // Ascending date: oldest first → Oldest, Middle, Newest
    // Cards use role="button" with aria-label like "Title, Priority Label"
    await waitFor(() => {
      const allCards = screen.getAllByRole('button', { name: /,\s*Priority/ })
      const cardLabels = allCards.map((c) => c.getAttribute('aria-label') ?? '')
      const oldestIdx = cardLabels.findIndex((l) => l.includes('Oldest'))
      const middleIdx = cardLabels.findIndex((l) => l.includes('Middle'))
      const newestIdx = cardLabels.findIndex((l) => l.includes('Newest'))
      expect(oldestIdx).toBeLessThan(middleIdx)
      expect(middleIdx).toBeLessThan(newestIdx)
    })
  })

  it('applies sort to filtered results (label + keyword + sort)', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({
          id: '1',
          title: 'Siebel low',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          priority: 4,
        }),
        createMockItem({
          id: '2',
          title: 'Siebel urgent',
          labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
          priority: 1,
        }),
        createMockItem({
          id: '3',
          title: 'Gateway high',
          labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
          priority: 2,
        }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Siebel low')).toBeInTheDocument()
    })

    // Type keyword "Siebel" to filter to Siebel items
    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'Siebel' } })

    await waitFor(() => {
      expect(screen.queryByLabelText(/Gateway high/)).not.toBeInTheDocument()
    })

    // Default sort is priority asc → Siebel urgent (1) before Siebel low (4)
    // Cards use role="button" with aria-label like "Title, Priority Label"
    const allCards = screen.getAllByRole('button', { name: /,\s*Priority/ })
    const cardLabels = allCards.map((c) => c.getAttribute('aria-label') ?? '')
    const urgentIdx = cardLabels.findIndex((l) => l.includes('Siebel urgent'))
    const lowIdx = cardLabels.findIndex((l) => l.includes('Siebel low'))
    expect(urgentIdx).toBeLessThan(lowIdx)
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
})
