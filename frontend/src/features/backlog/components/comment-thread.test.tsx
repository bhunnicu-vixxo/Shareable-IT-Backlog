import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { CommentThread } from './comment-thread'
import type { BacklogItemComment } from '../types/backlog.types'

vi.mock('@/utils/formatters', () => ({
  formatDateTime: vi.fn(() => 'Feb 9, 2026 3:45 PM'),
}))

function createMockComment(overrides: Partial<BacklogItemComment> = {}): BacklogItemComment {
  return {
    id: 'comment-1',
    body: 'This is a test comment in **markdown**.',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T11:00:00.000Z',
    userName: 'Jane Dev',
    userAvatarUrl: null,
    parentId: null,
    ...overrides,
  }
}

describe('CommentThread', () => {
  it('renders empty state when no comments', () => {
    render(<CommentThread comments={[]} />)

    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
  })

  it('renders empty state when comments prop is null-ish', () => {
    render(<CommentThread comments={null as unknown as BacklogItemComment[]} />)

    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
  })

  it('renders a single top-level comment', () => {
    const comments = [
      createMockComment({ id: 'c1', userName: 'Alice', body: 'Hello world' }),
    ]

    render(<CommentThread comments={comments} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders multiple top-level comments', () => {
    const comments = [
      createMockComment({ id: 'c1', userName: 'Alice', body: 'First comment' }),
      createMockComment({ id: 'c2', userName: 'Bob', body: 'Second comment' }),
    ]

    render(<CommentThread comments={comments} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
  })

  it('renders threaded replies nested under parent comment', () => {
    const comments = [
      createMockComment({ id: 'c1', userName: 'Alice', body: 'Top-level comment' }),
      createMockComment({ id: 'c2', userName: 'Bob', body: 'Reply to Alice', parentId: 'c1' }),
    ]

    render(<CommentThread comments={comments} />)

    expect(screen.getByText('Top-level comment')).toBeInTheDocument()
    expect(screen.getByText('Reply to Alice')).toBeInTheDocument()

    // Verify there's a replies list
    const repliesList = screen.getByRole('list', { name: 'Replies' })
    expect(repliesList).toBeInTheDocument()
    expect(within(repliesList).getByText('Reply to Alice')).toBeInTheDocument()
  })

  it('renders accessible comment list with role and label', () => {
    const comments = [createMockComment({ id: 'c1' })]

    render(<CommentThread comments={comments} />)

    expect(screen.getByRole('list', { name: 'Comments' })).toBeInTheDocument()
  })

  it('shows "Unknown" for comments with null userName', () => {
    const comments = [
      createMockComment({ id: 'c1', userName: null, body: 'Anonymous comment' }),
    ]

    render(<CommentThread comments={comments} />)

    expect(screen.getAllByText('Unknown').length).toBeGreaterThanOrEqual(1)
  })

  it('displays formatted timestamp for each comment', () => {
    const comments = [
      createMockComment({
        id: 'c1',
        createdAt: '2026-02-09T15:45:00.000Z',
      }),
    ]

    render(<CommentThread comments={comments} />)

    expect(screen.getByText('Feb 9, 2026 3:45 PM')).toBeInTheDocument()
  })

  it('renders orphan replies as top-level comments instead of dropping them', () => {
    const comments = [
      createMockComment({ id: 'r1', userName: 'Bob', body: 'Orphan reply', parentId: 'missing-parent' }),
    ]

    render(<CommentThread comments={comments} />)

    expect(screen.getByText('Orphan reply')).toBeInTheDocument()
    // No replies list exists because it was promoted to top-level
    expect(screen.queryByRole('list', { name: 'Replies' })).not.toBeInTheDocument()
  })

  describe('collapse/expand for long threads', () => {
    function createLongThread(): BacklogItemComment[] {
      return [
        createMockComment({ id: 'parent', userName: 'Alice', body: 'Parent comment' }),
        createMockComment({ id: 'r1', userName: 'Bob', body: 'Reply 1', parentId: 'parent' }),
        createMockComment({ id: 'r2', userName: 'Carol', body: 'Reply 2', parentId: 'parent' }),
        createMockComment({ id: 'r3', userName: 'Dave', body: 'Reply 3', parentId: 'parent' }),
        createMockComment({ id: 'r4', userName: 'Eve', body: 'Reply 4', parentId: 'parent' }),
      ]
    }

    it('shows only first 2 replies and toggle when thread has >3 replies', () => {
      render(<CommentThread comments={createLongThread()} />)

      // Should see first 2 replies
      expect(screen.getByText('Reply 1')).toBeInTheDocument()
      expect(screen.getByText('Reply 2')).toBeInTheDocument()

      // Should NOT see replies 3 and 4 initially
      expect(screen.queryByText('Reply 3')).not.toBeInTheDocument()
      expect(screen.queryByText('Reply 4')).not.toBeInTheDocument()

      // Should show toggle button (4 total - 2 visible = 2 hidden)
      expect(screen.getByText('Show 2 more replies')).toBeInTheDocument()
    })

    it('expands all replies when toggle is clicked', async () => {
      const user = userEvent.setup()

      render(<CommentThread comments={createLongThread()} />)

      // Click the expand toggle
      const toggle = screen.getByText('Show 2 more replies')
      await user.click(toggle)

      // Now all replies should be visible
      expect(screen.getByText('Reply 1')).toBeInTheDocument()
      expect(screen.getByText('Reply 2')).toBeInTheDocument()
      expect(screen.getByText('Reply 3')).toBeInTheDocument()
      expect(screen.getByText('Reply 4')).toBeInTheDocument()

      // Toggle should be gone
      expect(screen.queryByText('Show 2 more replies')).not.toBeInTheDocument()
    })

    it('does not show toggle when thread has exactly 3 replies', () => {
      const comments = [
        createMockComment({ id: 'parent', body: 'Parent' }),
        createMockComment({ id: 'r1', body: 'Reply 1', parentId: 'parent' }),
        createMockComment({ id: 'r2', body: 'Reply 2', parentId: 'parent' }),
        createMockComment({ id: 'r3', body: 'Reply 3', parentId: 'parent' }),
      ]

      render(<CommentThread comments={comments} />)

      // All 3 replies visible, no toggle
      expect(screen.getByText('Reply 1')).toBeInTheDocument()
      expect(screen.getByText('Reply 2')).toBeInTheDocument()
      expect(screen.getByText('Reply 3')).toBeInTheDocument()
      expect(screen.queryByText(/Show \d+ more/)).not.toBeInTheDocument()
    })

    it('uses singular "reply" when only 1 hidden', () => {
      const comments = [
        createMockComment({ id: 'parent', body: 'Parent' }),
        createMockComment({ id: 'r1', body: 'Reply 1', parentId: 'parent' }),
        createMockComment({ id: 'r2', body: 'Reply 2', parentId: 'parent' }),
        createMockComment({ id: 'r3', body: 'Reply 3', parentId: 'parent' }),
        createMockComment({ id: 'r4', body: 'Reply 4', parentId: 'parent' }),
      ]

      render(<CommentThread comments={comments} />)
      expect(screen.getByText('Show 2 more replies')).toBeInTheDocument()
    })
  })

  describe('avatar display', () => {
    it('renders avatar with initials fallback when no avatar URL', () => {
      const comments = [
        createMockComment({ id: 'c1', userName: 'Jane Dev', userAvatarUrl: null }),
      ]

      render(<CommentThread comments={comments} />)

      // Should render the initials "JD" somewhere
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('renders avatar with single initial for single-word name', () => {
      const comments = [
        createMockComment({ id: 'c1', userName: 'Alice', userAvatarUrl: null }),
      ]

      render(<CommentThread comments={comments} />)

      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('renders "?" for null userName avatar', () => {
      const comments = [
        createMockComment({ id: 'c1', userName: null, userAvatarUrl: null }),
      ]

      render(<CommentThread comments={comments} />)

      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })
})
