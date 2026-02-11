import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { BacklogItemDto } from '../../types/linear-entities.types.js'

// Mock the linear-client service
vi.mock('./linear-client.service.js', () => ({
  linearClient: {
    getIssuesByProject: vi.fn(),
  },
}))

// Mock the linear-transformers module
vi.mock('./linear-transformers.js', () => ({
  toBacklogItemDtosResilient: vi.fn(),
}))

// Mock the backlog service sort function
vi.mock('../backlog/backlog.service.js', () => ({
  sortBacklogItems: vi.fn((items: BacklogItemDto[]) => items),
  BacklogService: vi.fn(),
  backlogService: {},
}))

// Import after mocking
import { linearClient } from './linear-client.service.js'
import { toBacklogItemDtosResilient } from './linear-transformers.js'
import { sortBacklogItems } from '../backlog/backlog.service.js'
import { SyncService } from './sync.service.js'

const mockGetIssuesByProject = vi.mocked(linearClient.getIssuesByProject)
const mockToBacklogItemDtosResilient = vi.mocked(toBacklogItemDtosResilient)
const mockSortBacklogItems = vi.mocked(sortBacklogItems)

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
    prioritySortOrder: 1.0,
    url: 'https://linear.app/vixxo/issue/VIX-1',
    isNew: false,
    ...overrides,
  }
}

describe('SyncService', () => {
  let service: SyncService
  let originalProjectId: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    originalProjectId = process.env.LINEAR_PROJECT_ID
    process.env.LINEAR_PROJECT_ID = 'test-project-id'
    service = new SyncService()

    // Default: sortBacklogItems returns items as-is
    mockSortBacklogItems.mockImplementation((items) => [...items])
  })

  afterEach(() => {
    if (originalProjectId !== undefined) {
      process.env.LINEAR_PROJECT_ID = originalProjectId
    } else {
      delete process.env.LINEAR_PROJECT_ID
    }
  })

  describe('runSync', () => {
    it('should fetch all issues, transform, sort, and cache', async () => {
      const mockIssues = [{ id: 'i-1' }, { id: 'i-2' }] as never[]
      const mockDtos = [
        createMockBacklogItem({ id: 'i-1' }),
        createMockBacklogItem({ id: 'i-2' }),
      ]

      mockGetIssuesByProject.mockResolvedValue({
        data: mockIssues,
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: mockDtos, failures: [] })

      await service.runSync()

      expect(mockGetIssuesByProject).toHaveBeenCalledWith('test-project-id', {
        first: 50,
        after: undefined,
      })
      expect(mockToBacklogItemDtosResilient).toHaveBeenCalledWith(mockIssues)
      expect(mockSortBacklogItems).toHaveBeenCalledWith(mockDtos)

      const cached = service.getCachedItems()
      expect(cached).toHaveLength(2)

      const status = service.getStatus()
      expect(status.status).toBe('success')
      expect(status.itemCount).toBe(2)
      expect(status.lastSyncedAt).toBeTruthy()
      expect(status.errorMessage).toBeNull()
      expect(status.errorCode).toBeNull()
    })

    it('should paginate through all pages', async () => {
      const page1Issues = [{ id: 'i-1' }] as never[]
      const page2Issues = [{ id: 'i-2' }] as never[]

      mockGetIssuesByProject
        .mockResolvedValueOnce({
          data: page1Issues,
          rateLimit: null,
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        })
        .mockResolvedValueOnce({
          data: page2Issues,
          rateLimit: null,
          pageInfo: { hasNextPage: false, endCursor: null },
        })

      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [
          createMockBacklogItem({ id: 'i-1' }),
          createMockBacklogItem({ id: 'i-2' }),
        ],
        failures: [],
      })

      await service.runSync()

      expect(mockGetIssuesByProject).toHaveBeenCalledTimes(2)
      expect(mockGetIssuesByProject).toHaveBeenNthCalledWith(1, 'test-project-id', {
        first: 50,
        after: undefined,
      })
      expect(mockGetIssuesByProject).toHaveBeenNthCalledWith(2, 'test-project-id', {
        first: 50,
        after: 'cursor-1',
      })

      // Both pages' issues should be passed to transformer
      expect(mockToBacklogItemDtosResilient).toHaveBeenCalledWith([...page1Issues, ...page2Issues])
    })

    it('should preserve previous cache on failure', async () => {
      // First sync succeeds
      const mockDtos = [createMockBacklogItem({ id: 'i-1' })]
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: mockDtos, failures: [] })

      await service.runSync()
      expect(service.getCachedItems()).toHaveLength(1)

      // Second sync fails
      mockGetIssuesByProject.mockRejectedValue(new Error('Network error'))

      await service.runSync()

      // Cache should still have previous data
      expect(service.getCachedItems()).toHaveLength(1)
      expect(service.getCachedItems()![0].id).toBe('i-1')

      const status = service.getStatus()
      expect(status.status).toBe('error')
      expect(status.errorMessage).toBe('Network error')
      // Generic Error with 'Network error' doesn't match timeout patterns → SYNC_UNKNOWN_ERROR
      expect(status.errorCode).toBe('SYNC_UNKNOWN_ERROR')
    })

    it('should guard against concurrent sync runs', async () => {
      // Create a slow sync that we can control
      let resolveSync: (() => void) | undefined
      const slowPromise = new Promise<void>((resolve) => {
        resolveSync = resolve
      })

      mockGetIssuesByProject.mockImplementation(async () => {
        await slowPromise
        return {
          data: [] as never[],
          rateLimit: null,
          pageInfo: { hasNextPage: false, endCursor: null },
        }
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: [], failures: [] })

      // Start first sync (won't complete until we resolve)
      const firstSync = service.runSync()

      // Second sync should skip immediately
      await service.runSync()

      // First sync is still in progress
      expect(service.getStatus().status).toBe('syncing')

      // Let the first sync complete
      resolveSync!()
      await firstSync

      expect(service.getStatus().status).toBe('success')
    })

    it('should set error status when LINEAR_PROJECT_ID is not configured', async () => {
      delete process.env.LINEAR_PROJECT_ID

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('error')
      expect(status.errorMessage).toBe('LINEAR_PROJECT_ID not configured — cannot sync')
      expect(status.errorCode).toBe('SYNC_CONFIG_ERROR')
      expect(service.getCachedItems()).toBeNull()
    })

    it('should set errorCode from error classification on sync failure', async () => {
      const { LinearNetworkError } = await import('../../utils/linear-errors.js')
      mockGetIssuesByProject.mockRejectedValue(
        new LinearNetworkError({ message: 'Connection refused', code: 'NETWORK_ERROR' }),
      )

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('error')
      expect(status.errorCode).toBe('SYNC_API_UNAVAILABLE')
      expect(status.errorMessage).toBe('Connection refused')
    })

    it('should clear errorCode on successful sync after a previous failure', async () => {
      // First sync fails
      mockGetIssuesByProject.mockRejectedValue(new Error('API down'))
      await service.runSync()
      expect(service.getStatus().errorCode).toBe('SYNC_UNKNOWN_ERROR')

      // Second sync succeeds
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: [createMockBacklogItem()], failures: [] })
      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('success')
      expect(status.errorCode).toBeNull()
      expect(status.errorMessage).toBeNull()
    })
  })

  describe('getCachedItems', () => {
    it('should return null when cache is empty', () => {
      expect(service.getCachedItems()).toBeNull()
    })

    it('should return cached items after successful sync', async () => {
      const mockDtos = [
        createMockBacklogItem({ id: 'i-1' }),
        createMockBacklogItem({ id: 'i-2' }),
      ]
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }, { id: 'i-2' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: mockDtos, failures: [] })

      await service.runSync()

      const cached = service.getCachedItems()
      expect(cached).toHaveLength(2)
      expect(cached![0].id).toBe('i-1')
      expect(cached![1].id).toBe('i-2')
    })
  })

  describe('getStatus', () => {
    it('should return idle status initially', () => {
      const status = service.getStatus()
      expect(status.status).toBe('idle')
      expect(status.lastSyncedAt).toBeNull()
      expect(status.itemCount).toBeNull()
      expect(status.errorMessage).toBeNull()
      expect(status.errorCode).toBeNull()
    })

    it('should return success status after successful sync', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: [createMockBacklogItem()], failures: [] })

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('success')
      expect(status.lastSyncedAt).toBeTruthy()
      expect(status.itemCount).toBe(1)
      expect(status.errorMessage).toBeNull()
    })

    it('should return error status after failed sync', async () => {
      mockGetIssuesByProject.mockRejectedValue(new Error('API down'))

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('error')
      expect(status.errorMessage).toBe('API down')
      expect(status.errorCode).toBe('SYNC_UNKNOWN_ERROR')
    })

    it('should return a copy, not a reference', () => {
      const status1 = service.getStatus()
      const status2 = service.getStatus()
      expect(status1).not.toBe(status2)
      expect(status1).toEqual(status2)
    })
  })

  describe('partial sync handling', () => {
    it('should set partial status when some items fail and some succeed', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }, { id: 'i-2' }, { id: 'i-3' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })

      const successItems = [
        createMockBacklogItem({ id: 'i-1' }),
        createMockBacklogItem({ id: 'i-3' }),
      ]
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: successItems,
        failures: [
          { issueId: 'i-2', identifier: 'VIX-2', error: 'Transform failed' },
        ],
      })

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('partial')
      expect(status.itemsSynced).toBe(2)
      expect(status.itemsFailed).toBe(1)
      expect(status.errorCode).toBe('SYNC_PARTIAL_SUCCESS')
      expect(status.errorMessage).toBe('1 item(s) failed to sync')
      expect(status.lastSyncedAt).toBeTruthy()
      expect(status.itemCount).toBe(2)
    })

    it('should set error status when ALL items fail', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }, { id: 'i-2' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })

      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [],
        failures: [
          { issueId: 'i-1', identifier: 'VIX-1', error: 'Fail 1' },
          { issueId: 'i-2', identifier: 'VIX-2', error: 'Fail 2' },
        ],
      })

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('error')
      expect(status.itemsSynced).toBe(0)
      expect(status.itemsFailed).toBe(2)
      expect(status.errorCode).toBe('SYNC_TRANSFORM_FAILED')
    })

    it('should replace cache with successful items on partial failure', async () => {
      // First: successful sync to populate cache
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }, { id: 'i-2' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [createMockBacklogItem({ id: 'i-1' }), createMockBacklogItem({ id: 'i-2' })],
        failures: [],
      })
      await service.runSync()
      expect(service.getCachedItems()).toHaveLength(2)

      // Second: partial sync — only i-1 succeeds
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [createMockBacklogItem({ id: 'i-1' })],
        failures: [{ issueId: 'i-2', identifier: 'VIX-2', error: 'Transform failed' }],
      })
      await service.runSync()

      // Cache should be replaced with partial results (not preserved old)
      const cached = service.getCachedItems()
      expect(cached).toHaveLength(1)
      expect(cached![0].id).toBe('i-1')
    })

    it('should preserve previous cache when all items fail', async () => {
      // First: successful sync to populate cache
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [createMockBacklogItem({ id: 'i-1' })],
        failures: [],
      })
      await service.runSync()
      expect(service.getCachedItems()).toHaveLength(1)

      // Second: all items fail
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [],
        failures: [{ issueId: 'i-1', identifier: 'VIX-1', error: 'Fail' }],
      })
      await service.runSync()

      // Cache preserved from previous sync
      expect(service.getCachedItems()).toHaveLength(1)
      expect(service.getCachedItems()![0].id).toBe('i-1')
    })

    it('should return itemsSynced and itemsFailed in getStatus after partial sync', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }, { id: 'i-2' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [createMockBacklogItem({ id: 'i-1' })],
        failures: [{ issueId: 'i-2', identifier: 'VIX-2', error: 'Fail' }],
      })

      await service.runSync()

      const status = service.getStatus()
      expect(status.itemsSynced).toBe(1)
      expect(status.itemsFailed).toBe(1)
    })

    it('should return itemsSynced and itemsFailed as null/0 on full success', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [createMockBacklogItem({ id: 'i-1' })],
        failures: [],
      })

      await service.runSync()

      const status = service.getStatus()
      expect(status.status).toBe('success')
      expect(status.itemsSynced).toBe(1)
      expect(status.itemsFailed).toBe(0)
    })

    it('should return itemsSynced and itemsFailed as null initially', () => {
      const status = service.getStatus()
      expect(status.itemsSynced).toBeNull()
      expect(status.itemsFailed).toBeNull()
    })

    it('should track transform failures via getLastTransformFailures', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }, { id: 'i-2' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({
        items: [createMockBacklogItem({ id: 'i-1' })],
        failures: [{ issueId: 'i-2', identifier: 'VIX-2', error: 'Bad data' }],
      })

      await service.runSync()

      const failures = service.getLastTransformFailures()
      expect(failures).toHaveLength(1)
      expect(failures[0].issueId).toBe('i-2')
      expect(failures[0].identifier).toBe('VIX-2')
      expect(failures[0].error).toBe('Bad data')
    })
  })

  describe('clearCache', () => {
    it('should clear the cached items', async () => {
      mockGetIssuesByProject.mockResolvedValue({
        data: [{ id: 'i-1' }] as never[],
        rateLimit: null,
        pageInfo: { hasNextPage: false, endCursor: null },
      })
      mockToBacklogItemDtosResilient.mockResolvedValue({ items: [createMockBacklogItem()], failures: [] })

      await service.runSync()
      expect(service.getCachedItems()).not.toBeNull()

      service.clearCache()
      expect(service.getCachedItems()).toBeNull()
    })
  })
})
