import { describe, it, expect } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { ActivityTimeline } from './activity-timeline'
import type { IssueActivity } from '../types/backlog.types'

function createMockActivity(overrides: Partial<IssueActivity> = {}): IssueActivity {
  return {
    id: 'activity-1',
    createdAt: '2026-02-05T10:00:00.000Z',
    actorName: 'Jane Dev',
    type: 'state_change',
    description: 'Status changed from Backlog to In Progress',
    ...overrides,
  }
}

describe('ActivityTimeline', () => {
  it('renders activity count in heading', () => {
    const activities = [
      createMockActivity({ id: 'a1' }),
      createMockActivity({ id: 'a2', description: 'Assigned to Bob' }),
    ]

    render(<ActivityTimeline activities={activities} />)

    expect(screen.getByText('Activity (2)')).toBeInTheDocument()
  })

  it('renders empty state message when no activities', () => {
    render(<ActivityTimeline activities={[]} />)

    expect(screen.getByText('Activity (0)')).toBeInTheDocument()
    expect(screen.getByText('No activity recorded yet')).toBeInTheDocument()
  })

  it('renders activity entries with description, actor, and timestamp', () => {
    const activities = [
      createMockActivity({
        id: 'a1',
        actorName: 'Alice',
        description: 'Status changed from Backlog to In Progress',
        createdAt: '2026-02-05T10:30:00.000Z',
      }),
    ]

    render(<ActivityTimeline activities={activities} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Status changed from Backlog to In Progress')).toBeInTheDocument()
  })

  it('renders multiple activity entries', () => {
    const activities = [
      createMockActivity({
        id: 'a1',
        description: 'Priority changed from Normal to High',
        actorName: 'Alice',
      }),
      createMockActivity({
        id: 'a2',
        description: 'Assigned to Bob Smith',
        actorName: 'Alice',
      }),
      createMockActivity({
        id: 'a3',
        description: 'Label added: Frontend',
        actorName: 'System',
      }),
    ]

    render(<ActivityTimeline activities={activities} />)

    expect(screen.getByText('Activity (3)')).toBeInTheDocument()
    expect(screen.getByText('Priority changed from Normal to High')).toBeInTheDocument()
    expect(screen.getByText('Assigned to Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Label added: Frontend')).toBeInTheDocument()
  })

  it('renders accessible timeline list', () => {
    const activities = [createMockActivity()]

    render(<ActivityTimeline activities={activities} />)

    expect(screen.getByRole('list', { name: 'Activity timeline' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('renders "System" as actor for automated changes', () => {
    const activities = [
      createMockActivity({
        actorName: 'System',
        description: 'Item archived',
      }),
    ]

    render(<ActivityTimeline activities={activities} />)

    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Item archived')).toBeInTheDocument()
  })
})
