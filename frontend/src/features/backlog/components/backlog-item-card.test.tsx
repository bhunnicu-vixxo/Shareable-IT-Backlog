import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { BacklogItemCard, BacklogItemCardSkeleton } from './backlog-item-card'
import type { BacklogItem } from '../types/backlog.types'

function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'issue-1',
    identifier: 'VIX-42',
    title: 'Implement login page',
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
    url: 'https://linear.app/vixxo/issue/VIX-42',
    isNew: false,
    ...overrides,
  }
}

describe('BacklogItemCard', () => {
  it('renders the item title', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    expect(screen.getByText('Implement login page')).toBeInTheDocument()
  })

  it('renders the priority badge with correct number', () => {
    render(<BacklogItemCard item={createMockItem({ priority: 1, priorityLabel: 'Urgent' })} />)
    const badge = screen.getByRole('img', { name: 'Priority Urgent' })
    expect(badge).toHaveTextContent('1')
  })

  it('renders the status', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders the team name', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    expect(screen.getByText('Vixxo')).toBeInTheDocument()
  })

  it('renders the identifier', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    expect(screen.getByText('VIX-42')).toBeInTheDocument()
  })

  it('renders labels when present', () => {
    const item = createMockItem({
      labels: [
        { id: 'l1', name: 'Backend', color: '#0000ff' },
        { id: 'l2', name: 'API', color: '#00ff00' },
      ],
    })
    render(<BacklogItemCard item={item} />)
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
  })

  it('does not render labels section when no labels', () => {
    render(<BacklogItemCard item={createMockItem({ labels: [] })} />)
    expect(screen.queryByText('Backend')).not.toBeInTheDocument()
  })

  it('has accessible aria-label with title, priority, status, and business unit', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    const card = screen.getByRole('article', {
      name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo',
    })
    expect(card).toBeInTheDocument()
  })

  it('renders "New" badge when item isNew is true', () => {
    render(<BacklogItemCard item={createMockItem({ isNew: true })} />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('does not render "New" badge when item isNew is false', () => {
    render(<BacklogItemCard item={createMockItem({ isNew: false })} />)
    expect(screen.queryByText('New')).not.toBeInTheDocument()
  })

  it('includes "New item" in aria-label when isNew is true', () => {
    render(<BacklogItemCard item={createMockItem({ isNew: true })} />)
    const card = screen.getByRole('article', {
      name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo, New item',
    })
    expect(card).toBeInTheDocument()
  })

  it('"New" badge has accessible aria-label', () => {
    render(<BacklogItemCard item={createMockItem({ isNew: true })} />)
    expect(screen.getByLabelText('New item')).toBeInTheDocument()
  })

  it('renders as button and calls onClick when provided', () => {
    const onClick = vi.fn()
    render(<BacklogItemCard item={createMockItem()} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo',
    })
    expect(card).toBeInTheDocument()

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('activates on Enter key when onClick is provided', () => {
    const onClick = vi.fn()
    render(<BacklogItemCard item={createMockItem()} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo',
    })
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('activates on Space key when onClick is provided', () => {
    const onClick = vi.fn()
    render(<BacklogItemCard item={createMockItem()} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo',
    })
    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as article when onClick is not provided', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    expect(
      screen.getByRole('article', { name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo' }),
    ).toBeInTheDocument()
  })

  // --- Task 1: Description display tests ---

  it('renders description when present', () => {
    const item = createMockItem({ description: 'This is a detailed description of the task' })
    render(<BacklogItemCard item={item} />)
    expect(screen.getByText('This is a detailed description of the task')).toBeInTheDocument()
  })

  it('does not render description when null', () => {
    const item = createMockItem({ description: null })
    render(<BacklogItemCard item={item} />)
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument()
  })

  it('does not render description when empty string', () => {
    const item = createMockItem({ description: '' })
    render(<BacklogItemCard item={item} />)
    // Verify no extra empty DOM nodes for description
    const card = screen.getByRole('article', { name: 'Implement login page, Priority High, Status: In Progress, Business Unit: Vixxo' })
    expect(card.querySelector('[data-testid="card-description"]')).not.toBeInTheDocument()
  })

  // --- Task 2: Date metadata tests ---

  it('displays relative "Updated" time when updatedAt differs from createdAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-11T14:00:00.000Z'))

    const item = createMockItem({
      createdAt: '2026-02-09T10:00:00.000Z',
      updatedAt: '2026-02-11T12:00:00.000Z',
    })
    render(<BacklogItemCard item={item} />)
    expect(screen.getByText(/Updated about 2 hours ago/)).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('displays relative "Created" time when updatedAt equals createdAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-11T14:00:00.000Z'))

    const item = createMockItem({
      createdAt: '2026-02-09T10:00:00.000Z',
      updatedAt: '2026-02-09T10:00:00.000Z',
    })
    render(<BacklogItemCard item={item} />)
    expect(screen.getByText(/Created 2 days ago/)).toBeInTheDocument()

    vi.useRealTimers()
  })

  // --- Task 3: Variant prop tests ---

  it('default variant shows full layout with description and labels', () => {
    const item = createMockItem({
      description: 'A full description',
      labels: [{ id: 'l1', name: 'Backend', color: '#0000ff' }],
    })
    render(<BacklogItemCard item={item} variant="default" />)
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('data-variant', 'default')
    expect(screen.getByText('A full description')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
  })

  it('compact variant hides description and labels', () => {
    const item = createMockItem({
      description: 'Hidden description',
      labels: [{ id: 'l1', name: 'Backend', color: '#0000ff' }],
    })
    render(<BacklogItemCard item={item} variant="compact" />)
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('data-variant', 'compact')
    // Description and labels are rendered with display:none in compact mode
    const description = screen.queryByTestId('card-description')
    expect(description).toHaveStyle({ display: 'none' })
    // Labels container is hidden
    const labelsContainer = screen.getByText('Backend').closest('[class*="stack"]')
    expect(labelsContainer).toHaveStyle({ display: 'none' })
  })

  it('compact variant sets data-variant attribute', () => {
    render(<BacklogItemCard item={createMockItem()} variant="compact" />)
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('data-variant', 'compact')
  })

  it('omitting variant defaults to "default" behavior', () => {
    const item = createMockItem({ description: 'Visible description' })
    render(<BacklogItemCard item={item} />)
    expect(screen.getByText('Visible description')).toBeInTheDocument()
  })

  it('highlights search tokens in description text', () => {
    const item = createMockItem({ description: 'This task handles authentication flow' })
    render(<BacklogItemCard item={item} highlightTokens={['authentication']} />)
    // The highlighted text in the description should have a mark element
    const descriptionEl = screen.getByTestId('card-description')
    const marks = descriptionEl.querySelectorAll('mark')
    expect(marks.length).toBe(1)
    expect(marks[0].textContent).toBe('authentication')
  })

  it('strips common markdown from the description preview', () => {
    const item = createMockItem({
      description:
        '**Submitter name:** Craig\n\n- Item 1\n- Item 2\n\nSee [docs](https://example.com).',
    })
    render(<BacklogItemCard item={item} />)
    // We render a plain-text preview (markdown removed)
    expect(screen.getByText(/Submitter name: Craig/)).toBeInTheDocument()
    expect(screen.queryByText(/\*\*Submitter name:\*\*/)).not.toBeInTheDocument()
    expect(screen.getByText(/Item 1/)).toBeInTheDocument()
    expect(screen.getByText(/docs/)).toBeInTheDocument()
  })

  // --- Screen Reader Support (Story 11.2) ---

  it('aria-label includes status and business unit for screen readers', () => {
    const item = createMockItem({
      title: 'Data sync feature',
      priorityLabel: 'Normal',
      status: 'Todo',
      teamName: 'Operations',
    })
    render(<BacklogItemCard item={item} />)
    expect(
      screen.getByRole('article', {
        name: 'Data sync feature, Priority Normal, Status: Todo, Business Unit: Operations',
      }),
    ).toBeInTheDocument()
  })

  it('StackRankBadge has role="img" and descriptive aria-label', () => {
    render(<BacklogItemCard item={createMockItem({ priority: 1, priorityLabel: 'Urgent' })} />)
    const badge = screen.getByRole('img', { name: 'Priority Urgent' })
    expect(badge).toBeInTheDocument()
  })

  it('StatusBadge has aria-label with status text', () => {
    render(<BacklogItemCard item={createMockItem({ status: 'In Progress' })} />)
    expect(screen.getByLabelText('Status: In Progress')).toBeInTheDocument()
  })
})

describe('BacklogItemCardSkeleton', () => {
  it('renders skeleton container', () => {
    render(<BacklogItemCardSkeleton />)
    const skeleton = screen.getByTestId('backlog-item-card-skeleton')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders with default variant', () => {
    render(<BacklogItemCardSkeleton />)
    const skeleton = screen.getByTestId('backlog-item-card-skeleton')
    expect(skeleton).toHaveAttribute('data-variant', 'default')
  })

  it('renders with compact variant', () => {
    render(<BacklogItemCardSkeleton variant="compact" />)
    const skeleton = screen.getByTestId('backlog-item-card-skeleton')
    expect(skeleton).toHaveAttribute('data-variant', 'compact')
  })
})
