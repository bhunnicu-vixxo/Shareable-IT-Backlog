import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { BacklogItemDto } from '../../types/linear-entities.types.js'
import type { PaginatedResponse } from '../../types/api.types.js'
import { LinearConfigError } from '../../utils/linear-errors.js'

// Mock the linear-client service
vi.mock('../sync/linear-client.service.js', () => ({
  linearClient: {
    getIssuesByProject: vi.fn(),
    getIssueById: vi.fn(),
    getIssueComments: vi.fn(),
    getIssueHistory: vi.fn(),
  },
}))

// Mock the linear-transformers module
vi.mock('../sync/linear-transformers.js', () => ({
  toBacklogItemDtos: vi.fn(),
  toBacklogItemDto: vi.fn(),
  toCommentDtos: vi.fn(),
  toIssueActivityDtos: vi.fn(),
}))

// Import after mocking
import { linearClient } from '../sync/linear-client.service.js'
import {
  toBacklogItemDtos,
  toBacklogItemDto,
  toCommentDtos,
  toIssueActivityDtos,
} from '../sync/linear-transformers.js'
import { BacklogService } from './backlog.service.js'

const mockGetIssuesByProject = vi.mocked(linearClient.getIssuesByProject)
const mockGetIssueById = vi.mocked(linearClient.getIssueById)
const mockGetIssueComments = vi.mocked(linearClient.getIssueComments)
const mockGetIssueHistory = vi.mocked(linearClient.getIssueHistory)
const mockToBacklogItemDtos = vi.mocked(toBacklogItemDtos)
const mockToBacklogItemDto = vi.mocked(toBacklogItemDto)
const mockToCommentDtos = vi.mocked(toCommentDtos)
const mockToIssueActivityDtos = vi.mocked(toIssueActivityDtos)

function createMockBacklogItem(overrides: Partial<BacklogItemDto> = {}): BacklogItemDto {
  return {
    id: 'issue-1',
    identifier: 'VIX-1',
    title: 'Test Issue',
    description: null,
    priority: 3,
    priorityLabel: 'Normal',
    status: 'In Progress',
    statusType: 'started',
    assigneeId: null,
    assigneeName: null,
    projectId: 'proj-1',
    projectName: 'Test Project',
    teamId: 'team-1',
    teamName: 'Vixxo',
    labels: [],
    createdAt: '2026-02-05T10:00:00.000Z',
    updatedAt: '2026-02-05T12:00:00.000Z',
    completedAt: null,
    dueDate: null,
    sortOrder: 1.0,
    url: 'https://linear.app/vixxo/issue/VIX-1',
    isNew: false,
    ...overrides,
  }
}

describe('BacklogService', () => {
  let service: BacklogService

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up the env variable for project ID
    process.env.LINEAR_PROJECT_ID = 'test-project-id'
    service = new BacklogService()
  })

  describe('getBacklogItems', () => {
    it('should call linearClient.getIssuesByProject with configured project ID', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [],
        rateLimit: null,
      })
      mockToBacklogItemDtos.mockResolvedValue([])

      await service.getBacklogItems()

      expect(mockGetIssuesByProject).toHaveBeenCalledWith('test-project-id', {
        first: 20,
        after: undefined,
      })
    })

    it('should pass pagination options to linearClient', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [],
        rateLimit: null,
      })
      mockToBacklogItemDtos.mockResolvedValue([])

      await service.getBacklogItems({ first: 25, after: 'cursor-abc' })

      expect(mockGetIssuesByProject).toHaveBeenCalledWith('test-project-id', {
        first: 25,
        after: 'cursor-abc',
      })
    })

    it('should transform issues using toBacklogItemDtos', async () => {
      const mockIssues = [{ id: 'issue-1' }, { id: 'issue-2' }] as never[]
      mockGetIssuesByProject.mockResolvedValue({
        data: mockIssues,
        rateLimit: null,
      })
      mockToBacklogItemDtos.mockResolvedValue([
        createMockBacklogItem({ id: 'issue-1' }),
        createMockBacklogItem({ id: 'issue-2' }),
      ])

      await service.getBacklogItems()

      expect(mockToBacklogItemDtos).toHaveBeenCalledWith(mockIssues)
    })

    it('should sort items by priority ascending with None (0) last', async () => {
      const items: BacklogItemDto[] = [
        createMockBacklogItem({ id: '1', priority: 4, sortOrder: 1 }),   // Low
        createMockBacklogItem({ id: '2', priority: 0, sortOrder: 1 }),   // None → last
        createMockBacklogItem({ id: '3', priority: 1, sortOrder: 1 }),   // Urgent → first
        createMockBacklogItem({ id: '4', priority: 2, sortOrder: 1 }),   // High
        createMockBacklogItem({ id: '5', priority: 3, sortOrder: 1 }),   // Normal
      ]

      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockResolvedValue(items)

      const result = await service.getBacklogItems()

      expect(result.items.map((i) => i.priority)).toEqual([1, 2, 3, 4, 0])
    })

    it('should sort by sortOrder within the same priority level', async () => {
      const items: BacklogItemDto[] = [
        createMockBacklogItem({ id: '1', priority: 2, sortOrder: 3.0 }),
        createMockBacklogItem({ id: '2', priority: 2, sortOrder: 1.0 }),
        createMockBacklogItem({ id: '3', priority: 2, sortOrder: 2.0 }),
      ]

      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockResolvedValue(items)

      const result = await service.getBacklogItems()

      expect(result.items.map((i) => i.id)).toEqual(['2', '3', '1'])
    })

    it('should return a PaginatedResponse with correct shape', async () => {
      const items: BacklogItemDto[] = [
        createMockBacklogItem({ id: '1' }),
        createMockBacklogItem({ id: '2' }),
      ]

      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockResolvedValue(items)

      const result: PaginatedResponse<BacklogItemDto> = await service.getBacklogItems()

      expect(result).toEqual({
        items: expect.any(Array),
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
        totalCount: 2,
      })
      expect(result.items).toHaveLength(2)
    })

    it('should not mutate the original items array', async () => {
      const items: BacklogItemDto[] = [
        createMockBacklogItem({ id: '1', priority: 3, sortOrder: 2 }),
        createMockBacklogItem({ id: '2', priority: 1, sortOrder: 1 }),
      ]

      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockResolvedValue(items)

      await service.getBacklogItems()

      // Original array should not be reordered
      expect(items[0].id).toBe('1')
      expect(items[1].id).toBe('2')
    })

    it('should throw LinearConfigError when LINEAR_PROJECT_ID is not configured', async () => {
      delete process.env.LINEAR_PROJECT_ID
      const serviceNoEnv = new BacklogService()

      await expect(serviceNoEnv.getBacklogItems()).rejects.toThrow(LinearConfigError)
      // Verify it has statusCode and code for error middleware
      try {
        await serviceNoEnv.getBacklogItems()
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearConfigError)
        expect((error as LinearConfigError).statusCode).toBe(400)
        expect((error as LinearConfigError).code).toBe('CONFIGURATION_ERROR')
      }
    })

    it('should use projectId from options when provided', async () => {
      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockResolvedValue([])

      await service.getBacklogItems({ projectId: 'custom-project-id' })

      expect(mockGetIssuesByProject).toHaveBeenCalledWith('custom-project-id', {
        first: 20,
        after: undefined,
      })
    })

    it('should propagate errors from linearClient', async () => {
      mockGetIssuesByProject.mockRejectedValue(new Error('Linear API unavailable'))

      await expect(service.getBacklogItems()).rejects.toThrow('Linear API unavailable')
    })

    it('should propagate errors from toBacklogItemDtos', async () => {
      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockRejectedValue(new Error('Transform failed'))

      await expect(service.getBacklogItems()).rejects.toThrow('Transform failed')
    })

    it('should handle empty results', async () => {
      mockGetIssuesByProject.mockResolvedValue({ data: [] as never[], rateLimit: null })
      mockToBacklogItemDtos.mockResolvedValue([])

      const result = await service.getBacklogItems()

      expect(result.items).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.pageInfo.hasNextPage).toBe(false)
    })
  })

  describe('getBacklogItemById', () => {
    it('should return item, comments, and activities when issue exists', async () => {
      const mockIssue = { id: 'issue-123' } as never
      const mockComments = [{ id: 'comment-1' }] as never[]
      const mockHistory = [{ id: 'history-1' }] as never[]
      mockGetIssueById.mockResolvedValue({ data: mockIssue, rateLimit: null })
      mockGetIssueComments.mockResolvedValue({ data: mockComments, rateLimit: null })
      mockGetIssueHistory.mockResolvedValue({ data: mockHistory, rateLimit: null })
      mockToBacklogItemDto.mockResolvedValue(createMockBacklogItem({ id: 'issue-123' }))
      mockToCommentDtos.mockResolvedValue([
        { id: 'comment-1', body: 'A comment', createdAt: '2026-02-05T10:00:00.000Z', updatedAt: '2026-02-05T10:00:00.000Z', userId: null, userName: 'User', userAvatarUrl: null, parentId: null },
      ])
      mockToIssueActivityDtos.mockResolvedValue([
        { id: 'history-1', createdAt: '2026-02-05T10:00:00.000Z', actorName: 'Jane', type: 'state_change', description: 'Status changed from Backlog to In Progress' },
      ])

      const result = await service.getBacklogItemById('issue-123')

      expect(result).not.toBeNull()
      expect(result?.item.id).toBe('issue-123')
      expect(result?.comments).toHaveLength(1)
      expect(result?.activities).toHaveLength(1)
      expect(result?.activities[0]!.type).toBe('state_change')
      expect(mockGetIssueById).toHaveBeenCalledWith('issue-123')
      expect(mockGetIssueComments).toHaveBeenCalledWith('issue-123')
      expect(mockGetIssueHistory).toHaveBeenCalledWith('issue-123')
    })

    it('should return null when issue does not exist', async () => {
      mockGetIssueById.mockResolvedValue({ data: null, rateLimit: null })
      mockGetIssueComments.mockResolvedValue({ data: [], rateLimit: null })
      mockGetIssueHistory.mockResolvedValue({ data: [], rateLimit: null })

      const result = await service.getBacklogItemById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should return null when issue fetch rejects', async () => {
      mockGetIssueById.mockRejectedValue(new Error('Issue fetch failed'))
      mockGetIssueComments.mockResolvedValue({ data: [], rateLimit: null })
      mockGetIssueHistory.mockResolvedValue({ data: [], rateLimit: null })

      await expect(service.getBacklogItemById('bad-id')).rejects.toThrow('Issue fetch failed')
    })

    it('should return empty comments array when issue has no comments', async () => {
      const mockIssue = { id: 'issue-456' } as never
      mockGetIssueById.mockResolvedValue({ data: mockIssue, rateLimit: null })
      mockGetIssueComments.mockResolvedValue({ data: [], rateLimit: null })
      mockGetIssueHistory.mockResolvedValue({ data: [], rateLimit: null })
      mockToBacklogItemDto.mockResolvedValue(createMockBacklogItem({ id: 'issue-456' }))
      mockToCommentDtos.mockResolvedValue([])
      mockToIssueActivityDtos.mockResolvedValue([])

      const result = await service.getBacklogItemById('issue-456')

      expect(result?.comments).toEqual([])
      expect(result?.activities).toEqual([])
    })

    it('should degrade gracefully when history fetch fails', async () => {
      const mockIssue = { id: 'issue-789' } as never
      mockGetIssueById.mockResolvedValue({ data: mockIssue, rateLimit: null })
      mockGetIssueComments.mockResolvedValue({ data: [], rateLimit: null })
      mockGetIssueHistory.mockRejectedValue(new Error('History API error'))
      mockToBacklogItemDto.mockResolvedValue(createMockBacklogItem({ id: 'issue-789' }))
      mockToCommentDtos.mockResolvedValue([])

      const result = await service.getBacklogItemById('issue-789')

      expect(result).not.toBeNull()
      expect(result?.item.id).toBe('issue-789')
      expect(result?.activities).toEqual([])
    })

    it('should degrade gracefully when comments fetch fails', async () => {
      const mockIssue = { id: 'issue-789' } as never
      mockGetIssueById.mockResolvedValue({ data: mockIssue, rateLimit: null })
      mockGetIssueComments.mockRejectedValue(new Error('Comments API error'))
      mockGetIssueHistory.mockResolvedValue({ data: [], rateLimit: null })
      mockToBacklogItemDto.mockResolvedValue(createMockBacklogItem({ id: 'issue-789' }))
      mockToIssueActivityDtos.mockResolvedValue([])

      const result = await service.getBacklogItemById('issue-789')

      expect(result).not.toBeNull()
      expect(result?.comments).toEqual([])
    })
  })
})
