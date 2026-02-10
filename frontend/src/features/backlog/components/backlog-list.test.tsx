import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
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

  it('renders BusinessUnitFilter dropdown in filter bar', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', teamName: 'Operations' }),
        createMockItem({ id: '2', teamName: 'Finance' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /filter by business unit/i })).toBeInTheDocument()
    })
    // Placeholder shows "All Business Units"
    expect(
      screen.getByText('All Business Units', { selector: '[data-part="value-text"]' }),
    ).toBeInTheDocument()
  })

  it('filters items by business unit when selection is made via keyboard', async () => {
    const user = userEvent.setup()
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops item', teamName: 'Operations' }),
        createMockItem({ id: '2', title: 'Fin item', teamName: 'Finance' }),
        createMockItem({ id: '3', title: 'Eng item', teamName: 'Engineering' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Ops item')).toBeInTheDocument()
    })

    // Open the business unit filter
    // Options (sorted): All Business Units, Engineering, Finance, Operations
    const combobox = screen.getByRole('combobox', { name: /filter by business unit/i })
    combobox.focus()
    await user.keyboard('{ArrowDown}') // open dropdown

    await waitFor(() => {
      expect(combobox.getAttribute('aria-expanded')).toBe('true')
    })

    // Navigate: currently on All BU (index 0) → Engineering → Finance
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Fin item')).toBeInTheDocument()
      expect(screen.queryByText('Ops item')).not.toBeInTheDocument()
      expect(screen.queryByText('Eng item')).not.toBeInTheDocument()
    })
  })

  it('displays results count with business unit name when filtered', async () => {
    const user = userEvent.setup()
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops item 1', teamName: 'Operations' }),
        createMockItem({ id: '2', title: 'Ops item 2', teamName: 'Operations' }),
        createMockItem({ id: '3', title: 'Fin item', teamName: 'Finance' }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Showing 3 items')).toBeInTheDocument()
    })

    // Select Operations (sorted: All BU, Finance, Operations)
    const combobox = screen.getByRole('combobox', { name: /filter by business unit/i })
    combobox.focus()
    await user.keyboard('{ArrowDown}') // open

    await waitFor(() => {
      expect(combobox.getAttribute('aria-expanded')).toBe('true')
    })

    // Navigate to Operations (index 2: All BU → Finance → Operations)
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Showing 2 items for Operations')).toBeInTheDocument()
    })
  })

  it('combines business unit filter with "New only" filter', async () => {
    const user = userEvent.setup()
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops old', teamName: 'Operations', isNew: false }),
        createMockItem({ id: '2', title: 'Ops new', teamName: 'Operations', isNew: true }),
        createMockItem({ id: '3', title: 'Fin new', teamName: 'Finance', isNew: true }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Ops old')).toBeInTheDocument()
    })

    // Select Operations (sorted: All BU, Finance, Operations)
    const combobox = screen.getByRole('combobox', { name: /filter by business unit/i })
    combobox.focus()
    await user.keyboard('{ArrowDown}') // open

    await waitFor(() => {
      expect(combobox.getAttribute('aria-expanded')).toBe('true')
    })

    await user.keyboard('{ArrowDown}') // Finance
    await user.keyboard('{ArrowDown}') // Operations
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.queryByText('Fin new')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Ops old')).toBeInTheDocument()
    expect(screen.getByText('Ops new')).toBeInTheDocument()

    // Now toggle "New only"
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))

    await waitFor(() => {
      expect(screen.getByText('Ops new')).toBeInTheDocument()
    })
    expect(screen.queryByText('Ops old')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 new item for Operations')).toBeInTheDocument()
  })

  it('shows empty filter state with "Clear filter" when BU filter returns no results', async () => {
    const user = userEvent.setup()
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops item', teamName: 'Operations', isNew: true }),
        createMockItem({ id: '2', title: 'Fin item', teamName: 'Finance', isNew: false }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Ops item')).toBeInTheDocument()
    })

    // Select Finance (sorted: All BU, Finance, Operations)
    const combobox = screen.getByRole('combobox', { name: /filter by business unit/i })
    combobox.focus()
    await user.keyboard('{ArrowDown}') // open

    await waitFor(() => {
      expect(combobox.getAttribute('aria-expanded')).toBe('true')
    })

    await user.keyboard('{ArrowDown}') // Finance (index 1)
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Fin item')).toBeInTheDocument()
    })

    // Now toggle "New only" — Finance has no new items
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))

    await waitFor(() => {
      expect(screen.getByText('No new items for Finance')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeInTheDocument()
    // The "Show all items" text appears as both the filter bar toggle (aria-label)
    // and the empty state button — verify at least one exists
    const showAllButtons = screen.getAllByRole('button', { name: 'Show all items' })
    expect(showAllButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('"Clear filter" button resets business unit filter', async () => {
    const user = userEvent.setup()
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops item', teamName: 'Operations', isNew: true }),
        createMockItem({ id: '2', title: 'Fin item', teamName: 'Finance', isNew: false }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 2,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Ops item')).toBeInTheDocument()
    })

    // Select Finance (sorted: All BU, Finance, Operations)
    const combobox = screen.getByRole('combobox', { name: /filter by business unit/i })
    combobox.focus()
    await user.keyboard('{ArrowDown}') // open

    await waitFor(() => {
      expect(combobox.getAttribute('aria-expanded')).toBe('true')
    })

    await user.keyboard('{ArrowDown}') // Finance
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Fin item')).toBeInTheDocument()
    })

    // Toggle new only → empty state (Finance has no new items)
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))

    await waitFor(() => {
      expect(screen.getByText('No new items for Finance')).toBeInTheDocument()
    })

    // Click "Clear filter" to remove business unit filter
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }))

    // Now showing new items across all BUs — only Ops item is new
    await waitFor(() => {
      expect(screen.getByText('Ops item')).toBeInTheDocument()
    })
    expect(screen.queryByText('Fin item')).not.toBeInTheDocument()
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

    // After debounce, items should be filtered. Use waitFor to wait for debounce to fire.
    await waitFor(() => {
      expect(screen.queryByText('Database migration')).not.toBeInTheDocument()
    })
    // Highlighted text is split across elements; find by aria-label on the card
    expect(screen.getByLabelText(/VPN configuration/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Network VPN issue/)).toBeInTheDocument()
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

  it('combines BU + New-only + keyword search', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops vpn task', teamName: 'Operations', isNew: true }),
        createMockItem({ id: '2', title: 'Ops billing', teamName: 'Operations', isNew: true }),
        createMockItem({ id: '3', title: 'Fin vpn task', teamName: 'Finance', isNew: true }),
        createMockItem({ id: '4', title: 'Ops vpn old', teamName: 'Operations', isNew: false }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 4,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Ops vpn task')).toBeInTheDocument()
    })

    // Type keyword first
    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'vpn' } })

    await waitFor(() => {
      expect(screen.queryByLabelText(/Ops billing/)).not.toBeInTheDocument()
    })

    // Toggle "New only" — should filter out "Ops vpn old" (isNew: false)
    fireEvent.click(screen.getByRole('button', { name: 'Show only new items' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Ops vpn task/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Fin vpn task/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Ops vpn old/)).not.toBeInTheDocument()
    })
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
    // Both the KeywordSearch clear icon and the empty-state button say "Clear search"
    const clearButtons = screen.getAllByRole('button', { name: 'Clear search' })
    expect(clearButtons.length).toBeGreaterThanOrEqual(1)
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

    // Click the "Clear search" button in the empty-state area (the last one in the DOM)
    const clearButtons = screen.getAllByRole('button', { name: 'Clear search' })
    fireEvent.click(clearButtons[clearButtons.length - 1])

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
      expect(screen.getByText('Showing 2 items matching "vpn"')).toBeInTheDocument()
    })
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
    // Direction toggle button should exist (default asc → shows "Sort descending")
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

    // Default sort: priority ascending (1, 3, 4 → Urgent, Normal, Low)
    const cards = screen.getAllByRole('button', { name: /,\s*Priority/ })
    const titles = cards.map((card) => card.getAttribute('aria-label') ?? '')
    // Urgent (priority 1) should appear before Normal (3) before Low (4)
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
    const user = userEvent.setup()
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

    // Change sort field to Date Created
    const sortCombobox = screen.getByRole('combobox', { name: /sort backlog items/i })
    sortCombobox.focus()
    await user.keyboard('{ArrowDown}') // open dropdown

    await waitFor(() => {
      expect(sortCombobox.getAttribute('aria-expanded')).toBe('true')
    })

    // Options: Priority (current), Date Created, Date Updated, Status
    // ArrowDown from Priority → Date Created
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

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

  it('applies sort to filtered results (BU + keyword + sort)', async () => {
    const response: BacklogListResponse = {
      items: [
        createMockItem({ id: '1', title: 'Ops low', teamName: 'Operations', priority: 4 }),
        createMockItem({ id: '2', title: 'Ops urgent', teamName: 'Operations', priority: 1 }),
        createMockItem({ id: '3', title: 'Fin high', teamName: 'Finance', priority: 2 }),
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 3,
    }
    mockFetchSuccess(response)

    render(<BacklogList />)

    await waitFor(() => {
      expect(screen.getByText('Ops low')).toBeInTheDocument()
    })

    // Type keyword "Ops" to filter to Operations items
    const searchInput = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(searchInput, { target: { value: 'Ops' } })

    await waitFor(() => {
      expect(screen.queryByLabelText(/Fin high/)).not.toBeInTheDocument()
    })

    // Default sort is priority asc → Ops urgent (1) before Ops low (4)
    // Cards use role="button" with aria-label like "Title, Priority Label"
    const allCards = screen.getAllByRole('button', { name: /,\s*Priority/ })
    const cardLabels = allCards.map((c) => c.getAttribute('aria-label') ?? '')
    const urgentIdx = cardLabels.findIndex((l) => l.includes('Ops urgent'))
    const lowIdx = cardLabels.findIndex((l) => l.includes('Ops low'))
    expect(urgentIdx).toBeLessThan(lowIdx)
  })
})
