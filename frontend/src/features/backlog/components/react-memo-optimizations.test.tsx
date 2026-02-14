import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { BacklogItemCard } from './backlog-item-card'
import { EmptyStateWithGuidance } from './empty-state-with-guidance'
import { LabelFilter } from './label-filter'
import { StackRankBadge } from '@/shared/components/ui/stack-rank-badge'
import type { BacklogItem } from '../types/backlog.types'

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
    projectName: 'Test',
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

describe('React.memo optimizations', () => {
  describe('BacklogItemCard', () => {
    it('is wrapped with React.memo (has $$typeof memo symbol)', () => {
      // React.memo components have a specific type identifier
      expect(BacklogItemCard).toHaveProperty('$$typeof')
      // The displayName should be set for DevTools
      expect(BacklogItemCard.displayName).toBe('BacklogItemCard')
    })

    it('renders correctly when memoized', () => {
      render(<BacklogItemCard item={createMockItem()} />)
      expect(screen.getByText('Test item')).toBeInTheDocument()
    })
  })

  describe('StackRankBadge', () => {
    it('is wrapped with React.memo', () => {
      expect(StackRankBadge).toHaveProperty('$$typeof')
      expect(StackRankBadge.displayName).toBe('StackRankBadge')
    })

    it('renders correctly when memoized', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
      expect(screen.getByRole('img', { name: 'Priority Urgent' })).toBeInTheDocument()
    })
  })

  describe('EmptyStateWithGuidance', () => {
    it('is wrapped with React.memo', () => {
      expect(EmptyStateWithGuidance).toHaveProperty('$$typeof')
      expect(EmptyStateWithGuidance.displayName).toBe('EmptyStateWithGuidance')
    })

    it('renders correctly when memoized', () => {
      render(
        <EmptyStateWithGuidance
          keyword="test"
          selectedLabels={[]}
          showNewOnly={false}
          onClearKeyword={vi.fn()}
          onClearLabels={vi.fn()}
          onClearNewOnly={vi.fn()}
          onClearAll={vi.fn()}
        />,
      )
      expect(screen.getByText(/No items found matching "test"/)).toBeInTheDocument()
    })
  })

  describe('LabelFilter', () => {
    it('is wrapped with React.memo', () => {
      expect(LabelFilter).toHaveProperty('$$typeof')
      expect(LabelFilter.displayName).toBe('LabelFilter')
    })

    it('renders correctly when memoized', () => {
      const items = [createMockItem({
        labels: [{ id: 'l1', name: 'Siebel', color: '#ff0000' }],
      })]
      render(
        <LabelFilter
          items={items}
          value={[]}
          onChange={vi.fn()}
        />,
      )
      expect(screen.getByText('Filter by label')).toBeInTheDocument()
    })
  })

  // Note: SyncStatusIndicator is also wrapped with React.memo but uses internal hooks
  // (useSyncStatus, useState, useEffect) making it harder to test in isolation.
  // Its memo wrapping is verified by checking the component type in integration tests.
  // The memo still prevents parent-triggered re-renders when props are unchanged.
})
