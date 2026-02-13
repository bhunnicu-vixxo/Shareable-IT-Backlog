import { describe, it, vi } from 'vitest'
import { BusinessUnitFilter } from './business-unit-filter'
import type { BacklogItem } from '../types/backlog.types'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'issue-1',
    identifier: 'VIX-42',
    title: 'Test item',
    description: null,
    priority: 2,
    priorityLabel: 'High',
    status: 'In Progress',
    statusType: 'started',
    assigneeName: null,
    projectName: null,
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

const mockItems: BacklogItem[] = [
  createMockItem({ id: '1', teamName: 'Vixxo' }),
  createMockItem({ id: '2', teamName: 'Engineering' }),
  createMockItem({ id: '3', teamName: 'Product' }),
]

describe('BusinessUnitFilter accessibility', () => {
  it('should have no axe violations with no selection', async () => {
    const results = await checkAccessibility(
      <BusinessUnitFilter
        items={mockItems}
        value={null}
        onChange={vi.fn()}
        resultCount={3}
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with a selection', async () => {
    const results = await checkAccessibility(
      <BusinessUnitFilter
        items={mockItems}
        value="Vixxo"
        onChange={vi.fn()}
        resultCount={1}
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations in compact mode', async () => {
    const results = await checkAccessibility(
      <BusinessUnitFilter
        items={mockItems}
        value={null}
        onChange={vi.fn()}
        compact
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })
})
