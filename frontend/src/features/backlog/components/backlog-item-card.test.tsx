import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { BacklogItemCard } from './backlog-item-card'
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

  it('has accessible aria-label with title and priority', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    const card = screen.getByRole('article', {
      name: 'Implement login page, Priority High',
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
      name: 'Implement login page, Priority High, New item',
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
      name: 'Implement login page, Priority High',
    })
    expect(card).toBeInTheDocument()

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('activates on Enter key when onClick is provided', () => {
    const onClick = vi.fn()
    render(<BacklogItemCard item={createMockItem()} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Implement login page, Priority High',
    })
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('activates on Space key when onClick is provided', () => {
    const onClick = vi.fn()
    render(<BacklogItemCard item={createMockItem()} onClick={onClick} />)

    const card = screen.getByRole('button', {
      name: 'Implement login page, Priority High',
    })
    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as article when onClick is not provided', () => {
    render(<BacklogItemCard item={createMockItem()} />)
    expect(
      screen.getByRole('article', { name: 'Implement login page, Priority High' }),
    ).toBeInTheDocument()
  })
})
