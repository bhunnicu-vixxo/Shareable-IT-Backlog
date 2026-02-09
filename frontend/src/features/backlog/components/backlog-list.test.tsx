import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/utils/test-utils'
import { BacklogList } from './backlog-list'
import type { BacklogListResponse, BacklogItem } from '../types/backlog.types'

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
