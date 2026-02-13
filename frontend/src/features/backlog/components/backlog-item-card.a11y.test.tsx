import { describe, it, vi } from 'vitest'
import { BacklogItemCard } from './backlog-item-card'
import type { BacklogItem } from '../types/backlog.types'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'issue-1',
    identifier: 'VIX-42',
    title: 'Implement login page',
    description: 'A **markdown** description of the login page implementation.',
    priority: 2,
    priorityLabel: 'High',
    status: 'In Progress',
    statusType: 'started',
    assigneeName: 'Test User',
    projectName: 'Test Project',
    teamName: 'Vixxo',
    labels: [
      { id: 'label-1', name: 'Frontend', color: '#4CAF50' },
      { id: 'label-2', name: 'Accessibility', color: '#2196F3' },
    ],
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

describe('BacklogItemCard accessibility', () => {
  it('should have no axe violations with full data', async () => {
    const results = await checkAccessibility(<BacklogItemCard item={createMockItem()} />)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with "new" flag', async () => {
    const results = await checkAccessibility(
      <BacklogItemCard item={createMockItem({ isNew: true })} />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations when clickable (button role)', async () => {
    const results = await checkAccessibility(
      <BacklogItemCard item={createMockItem()} onClick={vi.fn()} />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations without description or labels', async () => {
    const results = await checkAccessibility(
      <BacklogItemCard
        item={createMockItem({
          description: null,
          labels: [],
          assigneeName: null,
        })}
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations in compact variant', async () => {
    const results = await checkAccessibility(
      <BacklogItemCard item={createMockItem()} variant="compact" />
    )
    expectNoCriticalOrSeriousViolations(results)
  })
})
