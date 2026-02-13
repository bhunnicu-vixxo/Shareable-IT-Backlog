import { describe, it, vi } from 'vitest'
import { ItemDetailModal } from './item-detail-modal'
import type { BacklogDetailResponse } from '../types/backlog.types'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

// Mock the detail hook to control loading/data states
const mockDetailData: BacklogDetailResponse = {
  item: {
    id: 'item-1',
    identifier: 'VIX-100',
    title: 'Test backlog item for accessibility',
    description: 'This is a **test** item with markdown description.',
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
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
    completedAt: null,
    dueDate: '2026-03-01',
    sortOrder: 1.0,
    prioritySortOrder: 1.0,
    url: 'https://linear.app/vixxo/issue/VIX-100',
    isNew: false,
  },
  comments: [
    {
      id: 'comment-1',
      body: 'This is a test comment about the item.',
      createdAt: '2026-02-10T15:00:00.000Z',
      updatedAt: '2026-02-10T15:00:00.000Z',
      userName: 'Commenter One',
      userAvatarUrl: null,
      parentId: null,
    },
  ],
  activities: [
    {
      id: 'activity-1',
      createdAt: '2026-01-15T10:00:00.000Z',
      actorName: 'System',
      type: 'created',
      description: 'Issue created',
    },
    {
      id: 'activity-2',
      createdAt: '2026-02-10T14:30:00.000Z',
      actorName: 'Test User',
      type: 'state_change',
      description: 'Status changed from Backlog to In Progress',
    },
  ],
}

vi.mock('../hooks/use-backlog-item-detail', () => ({
  useBacklogItemDetail: vi.fn(),
}))

import { useBacklogItemDetail } from '../hooks/use-backlog-item-detail'
const mockUseBacklogItemDetail = vi.mocked(useBacklogItemDetail)

describe('ItemDetailModal accessibility', () => {
  const defaultProps = {
    isOpen: true,
    itemId: 'item-1',
    onClose: vi.fn(),
  }

  it('should have no axe violations when open with data', async () => {
    mockUseBacklogItemDetail.mockReturnValue({
      data: mockDetailData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useBacklogItemDetail>)

    const results = await checkAccessibility(<ItemDetailModal {...defaultProps} />, {
      // Chakra Dialog portals outside landmarks in jsdom; `region` isn't meaningful here.
      disabledRules: ['region'],
    })
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations in loading state', async () => {
    mockUseBacklogItemDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useBacklogItemDetail>)

    const results = await checkAccessibility(<ItemDetailModal {...defaultProps} />, {
      disabledRules: ['region'],
    })
    expectNoCriticalOrSeriousViolations(results)
  })
})
