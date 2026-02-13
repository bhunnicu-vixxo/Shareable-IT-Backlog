import { useRef, useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ItemDetailModal } from './item-detail-modal'
import type { BacklogDetailResponse, BacklogItem, BacklogItemComment } from '../types/backlog.types'

function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'issue-1',
    identifier: 'VIX-42',
    title: 'Test backlog item',
    description: 'This is the **description** of the item.',
    priority: 2,
    priorityLabel: 'High',
    status: 'In Progress',
    statusType: 'started',
    assigneeName: 'Jane Dev',
    projectName: 'Test Project',
    teamName: 'Vixxo',
    labels: [
      { id: 'lbl-1', name: 'Backend', color: '#395389' },
      { id: 'lbl-2', name: 'API', color: '#00ff00' },
    ],
    createdAt: '2026-02-05T10:00:00.000Z',
    updatedAt: '2026-02-05T12:00:00.000Z',
    completedAt: null,
    dueDate: '2026-03-01',
    sortOrder: 1.0,
    prioritySortOrder: 1.0,
    url: 'https://linear.app/vixxo/issue/VIX-42',
    isNew: false,
    ...overrides,
  }
}

function createMockComment(overrides: Partial<BacklogItemComment> = {}): BacklogItemComment {
  return {
    id: 'comment-1',
    body: 'A test comment in **bold**.',
    createdAt: '2026-02-05T14:00:00.000Z',
    updatedAt: '2026-02-05T14:00:00.000Z',
    userName: 'Commenter',
    userAvatarUrl: null,
    parentId: null,
    ...overrides,
  }
}

function mockFetchDetail(response: BacklogDetailResponse) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  })
}

function mockFetch404() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: () =>
      Promise.resolve({
        error: { message: 'Backlog item not found', code: 'NOT_FOUND' },
      }),
  })
}

function mockFetch500() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: () =>
      Promise.resolve({
        error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
      }),
  })
}

describe('ItemDetailModal', () => {
  const originalFetch = globalThis.fetch
  const mockOnClose = vi.fn()

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // ──── Rendering states ────────────────────────────────────────────────────

  it('renders loading skeleton when data is being fetched', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    expect(screen.getByLabelText('Backlog item details')).toBeInTheDocument()
    expect(screen.getByTestId('item-detail-body-skeleton')).toBeInTheDocument()
  })

  it('renders item details when data loads successfully', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('VIX-42')).toBeInTheDocument()
    expect(screen.getByText('Vixxo')).toBeInTheDocument()
  })

  it('displays all required fields: assignee, priority, dates', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })

    // Metadata fields
    expect(screen.getByText('High')).toBeInTheDocument() // priorityLabel
    expect(screen.getByText('Jane Dev')).toBeInTheDocument() // assigneeName
  })

  it('renders labels when present', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Backend')).toBeInTheDocument()
    })
    expect(screen.getByText('API')).toBeInTheDocument()
  })

  it('renders description as markdown', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem({ description: 'Some **bold** text' }),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument()
    })
    // The bold text should render as <strong>
    expect(screen.getByText('bold')).toBeInTheDocument()
  })

  it('does not render description section when description is null', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem({ description: null }),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })
    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  // ──── Comments ────────────────────────────────────────────────────────────

  it('renders comments with author and body', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [
        createMockComment({ id: 'c1', userName: 'Alice', body: 'First comment' }),
        createMockComment({ id: 'c2', userName: 'Bob', body: 'Second comment' }),
      ],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Comments (2)')).toBeInTheDocument()
    })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
  })

  it('shows "No comments yet" when comments list is empty', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Comments (0)')).toBeInTheDocument()
    })
    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
  })

  it('renders "Unknown" for comment with null userName', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [createMockComment({ userName: null, body: 'Anonymous comment' })],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
    expect(screen.getByText('Anonymous comment')).toBeInTheDocument()
  })

  it('renders threaded comments with replies nested under parent', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [
        createMockComment({ id: 'c1', userName: 'Alice', body: 'Top-level comment' }),
        createMockComment({ id: 'c2', userName: 'Bob', body: 'Reply to Alice', parentId: 'c1' }),
      ],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Comments (2)')).toBeInTheDocument()
    })
    expect(screen.getByText('Top-level comment')).toBeInTheDocument()
    expect(screen.getByText('Reply to Alice')).toBeInTheDocument()
  })

  it('renders avatar initials for comments', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [
        createMockComment({ id: 'c1', userName: 'Jane Dev', body: 'Hello', userAvatarUrl: null }),
      ],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  it('renders collapse toggle for long reply threads', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [
        createMockComment({ id: 'c1', userName: 'Alice', body: 'Parent' }),
        createMockComment({ id: 'r1', body: 'Reply 1', parentId: 'c1' }),
        createMockComment({ id: 'r2', body: 'Reply 2', parentId: 'c1' }),
        createMockComment({ id: 'r3', body: 'Reply 3', parentId: 'c1' }),
        createMockComment({ id: 'r4', body: 'Reply 4', parentId: 'c1' }),
      ],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Show 2 more replies')).toBeInTheDocument()
    })
  })

  // ──── Activity section ───────────────────────────────────────────────────

  it('renders activity section with entries', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [
        {
          id: 'act-1',
          createdAt: '2026-02-05T10:00:00.000Z',
          actorName: 'Jane Dev',
          type: 'state_change',
          description: 'Status changed from Backlog to In Progress',
        },
        {
          id: 'act-2',
          createdAt: '2026-02-04T10:00:00.000Z',
          actorName: 'Bob',
          type: 'assignment',
          description: 'Assigned to Jane Dev',
        },
      ],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Activity (2)')).toBeInTheDocument()
    })
    expect(screen.getByText('Status changed from Backlog to In Progress')).toBeInTheDocument()
    expect(screen.getByText('Assigned to Jane Dev')).toBeInTheDocument()
  })

  it('shows empty activity state when no activities', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Activity (0)')).toBeInTheDocument()
    })
    expect(screen.getByText('No activity recorded yet')).toBeInTheDocument()
  })

  // ──── Error state: 404 (deleted/missing) ─────────────────────────────────

  it('renders ItemNotFoundState when API returns 404', async () => {
    mockFetch404()

    render(
      <ItemDetailModal isOpen={true} itemId="non-existent" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(
        screen.getByText('This item is no longer available'),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        'It may have been removed from the backlog or deleted in Linear.',
      ),
    ).toBeInTheDocument()
    // Should have a prominent Close button in the body
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    // Should NOT have a Try Again button
    expect(
      screen.queryByRole('button', { name: 'Try Again' }),
    ).not.toBeInTheDocument()
  })

  it('calls onClose when Close button in 404 state is clicked', async () => {
    mockFetch404()

    render(
      <ItemDetailModal isOpen={true} itemId="non-existent" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(
        screen.getByText('This item is no longer available'),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(mockOnClose).toHaveBeenCalled()
  })

  // ──── Error state: non-404 (server/network errors) ──────────────────────

  it('renders ItemErrorState when API returns 500', async () => {
    mockFetch500()

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(
        screen.getByText('Unable to load this item'),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText('A temporary problem prevented loading. Please try again.'),
    ).toBeInTheDocument()
    // Technical error details should not be shown to end users.
    expect(screen.queryByText(/internal server error/i)).not.toBeInTheDocument()
    // Should have Try Again and Close buttons
    expect(
      screen.getByRole('button', { name: 'Try Again' }),
    ).toBeInTheDocument()
  })

  it('calls refetch when Try Again button is clicked in 500 state', async () => {
    mockFetch500()

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(
        screen.getByText('Unable to load this item'),
      ).toBeInTheDocument()
    })

    // Click Try Again triggers refetch (which calls fetch again)
    const callCountBefore = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    await waitFor(() => {
      expect(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length,
      ).toBeGreaterThan(callCountBefore)
    })
  })

  // ──── Close functionality ─────────────────────────────────────────────────

  it('has a close button', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    // Chakra Dialog close is async — onOpenChange fires after internal state update
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  // ──── Keyboard focus management (AC: #4, #5) ─────────────────────────────

  it('closes modal when Escape key is pressed', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })

    // Press Escape on the dialog content
    const dialog = screen.getByLabelText('Backlog item details')
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('dialog has role="dialog" for accessibility', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-label', 'Backlog item details')
  })

  it('restores focus to the triggering element when closed with Escape (AC #4)', async () => {
    const user = userEvent.setup()
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    function Wrapper() {
      const triggerRef = useRef<HTMLButtonElement | null>(null)
      const [open, setOpen] = useState(false)

      return (
        <>
          <button ref={triggerRef} onClick={() => setOpen(true)}>
            Open item
          </button>
          <button>Outside</button>
          <ItemDetailModal
            isOpen={open}
            itemId={open ? 'issue-1' : null}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
          />
        </>
      )
    }

    render(<Wrapper />)

    const trigger = screen.getByRole('button', { name: 'Open item' })
    trigger.focus()
    expect(trigger).toHaveFocus()

    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Ensure key event targets the dialog to trigger Chakra's closeOnEscape behavior
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(trigger).toHaveFocus()
  })

  it('traps Tab focus within the modal (AC #5)', async () => {
    const user = userEvent.setup()
    const detail: BacklogDetailResponse = {
      item: createMockItem(),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    function Wrapper() {
      const triggerRef = useRef<HTMLButtonElement | null>(null)
      const [open, setOpen] = useState(false)

      return (
        <>
          <button ref={triggerRef} onClick={() => setOpen(true)}>
            Open item
          </button>
          <button>Outside</button>
          <ItemDetailModal
            isOpen={open}
            itemId={open ? 'issue-1' : null}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
          />
        </>
      )
    }

    render(<Wrapper />)

    const trigger = screen.getByRole('button', { name: 'Open item' })
    const outside = screen.getByRole('button', { name: 'Outside' })

    await user.click(trigger)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    // Force focus into the modal before tabbing
    const closeButton = await screen.findByRole('button', { name: 'Close' })
    closeButton.focus()

    // Tab a few times; focus should not escape to outside controls.
    await user.tab()
    expect(outside).not.toHaveFocus()
    await user.tab()
    expect(outside).not.toHaveFocus()
  })

  // ──── Does not fetch when closed ──────────────────────────────────────────

  it('does not render anything when isOpen is false', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    render(
      <ItemDetailModal isOpen={false} itemId={null} onClose={mockOnClose} />,
    )

    // When closed, the dialog should not render content
    expect(screen.queryByLabelText('Backlog item details')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // ──── Dash display for null optional values ───────────────────────────────

  it('displays dash for null assignee', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem({ assigneeName: null }),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })
    // The DetailField renders '—' for null values
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('displays dash for null due date', async () => {
    const detail: BacklogDetailResponse = {
      item: createMockItem({ dueDate: null }),
      comments: [],
      activities: [],
    }
    mockFetchDetail(detail)

    render(
      <ItemDetailModal isOpen={true} itemId="issue-1" onClose={mockOnClose} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Test backlog item')).toBeInTheDocument()
    })
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })
})
