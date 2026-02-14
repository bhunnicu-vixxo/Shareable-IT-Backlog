import { describe, it, vi } from 'vitest'
import { LabelFilter } from './label-filter'
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
  createMockItem({
    id: '1',
    labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
  }),
  createMockItem({
    id: '2',
    labels: [{ id: 'l2', name: 'Gateway', color: '#00ff00' }],
  }),
  createMockItem({
    id: '3',
    labels: [{ id: 'l3', name: 'VixxoLink', color: '#0000ff' }],
  }),
]

describe('LabelFilter accessibility', () => {
  it('should have no axe violations with no selection', async () => {
    const results = await checkAccessibility(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with a selection', async () => {
    const results = await checkAccessibility(
      <LabelFilter items={mockItems} value={['Siebel']} onChange={vi.fn()} />,
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with multiple selections', async () => {
    const results = await checkAccessibility(
      <LabelFilter items={mockItems} value={['Siebel', 'Gateway']} onChange={vi.fn()} />,
    )
    expectNoCriticalOrSeriousViolations(results)
  })
})

