import { describe, it, expect } from 'vitest'
import { render, screen } from '@/utils/test-utils'
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
})
