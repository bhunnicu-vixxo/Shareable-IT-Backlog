import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import { BacklogList } from './backlog-list'
import type {
  BacklogListResponse,
  BacklogItem,
  BacklogDetailResponse,
  BacklogItemComment,
} from '../types/backlog.types'

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
    expect(screen.getByRole('button', { name: 'Show only new items' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))

    // Old item should be hidden, new items visible
    expect(screen.queryByText('Old item')).not.toBeInTheDocument()
    expect(screen.getByText('New item A')).toBeInTheDocument()
    expect(screen.getByText('New item B')).toBeInTheDocument()
    expect(screen.getByText('Showing 2 new items')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))
    expect(screen.queryByText('Old item')).not.toBeInTheDocument()

    // Toggle off — "Show all" button appears when filter is active
    fireEvent.click(screen.getByRole('button', { name: 'Show all items' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))
    expect(screen.getByText('Showing 1 new item')).toBeInTheDocument()
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

  it('renders priority badges with size hierarchy for mixed priorities', async () => {
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

    const urgentBadge = screen.getByRole('img', { name: 'Priority Urgent' })
    const lowBadge = screen.getByRole('img', { name: 'Priority Low' })
    expect(urgentBadge).toHaveStyle({ width: '40px', height: '40px' })
    expect(lowBadge).toHaveStyle({ width: '28px', height: '28px' })
  })
})
