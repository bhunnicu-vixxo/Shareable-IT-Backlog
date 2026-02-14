import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

import type { BacklogItemDto, IssueActivityDto } from '../types/linear-entities.types.js'
import type { PaginatedResponse } from '../types/api.types.js'

// Mock the backlog service
vi.mock('../services/backlog/backlog.service.js', () => ({
  backlogService: {
    getBacklogItems: vi.fn(),
    getBacklogItemById: vi.fn(),
  },
}))

// Mock the logger to avoid side effects
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import type { CommentDto } from '../types/linear-entities.types.js'
import { backlogService } from '../services/backlog/backlog.service.js'
import { getBacklogItems, getBacklogItemById } from '../controllers/backlog.controller.js'
import { generateETag } from '../middleware/cache-control.middleware.js'

const mockGetBacklogItems = vi.mocked(backlogService.getBacklogItems)
const mockGetBacklogItemById = vi.mocked(backlogService.getBacklogItemById)

function createMockRequest(
  overrides: { query?: Record<string, string>; params?: Record<string, string>; headers?: Record<string, string> } | Record<string, string> = {},
): Request {
  const hasQuery = overrides && typeof overrides === 'object' && 'query' in overrides
  const hasParams = overrides && typeof overrides === 'object' && 'params' in overrides
  const hasHeaders = overrides && typeof overrides === 'object' && 'headers' in overrides
  const query = hasQuery ? (overrides as { query?: Record<string, string> }).query : undefined
  const params = hasParams ? (overrides as { params?: Record<string, string> }).params : undefined
  const headers = hasHeaders ? (overrides as { headers?: Record<string, string> }).headers : undefined
  const rest = hasQuery || hasParams || hasHeaders ? {} : (overrides as Record<string, string>)
  return {
    query: query ?? rest,
    params: params ?? {},
    headers: headers ?? {},
  } as unknown as Request
}

function createMockResponse(): Response & { statusCode: number; body: unknown; _headers: Map<string, string | number> } {
  const headersMap = new Map<string, string | number>()
  const res = {
    statusCode: 200,
    body: null as unknown,
    _headers: headersMap,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
      return this
    },
    send(data: unknown) {
      this.body = typeof data === 'string' ? JSON.parse(data as string) : data
      return this
    },
    end() {
      return this
    },
    setHeader(name: string, value: string | number) {
      headersMap.set(name, value)
      return this
    },
    getHeader(name: string) {
      return headersMap.get(name)
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown; _headers: Map<string, string | number> }
}

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

/**
 * Tests for backlog controller handler (GET /api/backlog-items).
 *
 * Note: These tests verify the controller logic directly, not the route registration.
 * Route registration is verified via integration tests or manual verification.
 */
describe('BacklogController.getBacklogItems', () => {
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn()
  })

  it('should return paginated backlog items with 200 status', async () => {
    const mockResponse: PaginatedResponse<BacklogItemDto> = {
      items: [createMockBacklogItem()],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    }
    mockGetBacklogItems.mockResolvedValue(mockResponse)

    const req = createMockRequest()
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual({
      ...mockResponse,
      servedFromCache: false,
      lastSyncedAt: null,
    })
    expect(mockGetBacklogItems).toHaveBeenCalledWith({
      projectId: undefined,
      first: undefined,
      after: undefined,
    })
  })

  it('should pass projectId query parameter to the service', async () => {
    mockGetBacklogItems.mockResolvedValue({
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
    })

    const req = createMockRequest({ projectId: 'custom-project' })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(mockGetBacklogItems).toHaveBeenCalledWith({
      projectId: 'custom-project',
      first: undefined,
      after: undefined,
    })
  })

  it('should pass pagination parameters to the service', async () => {
    mockGetBacklogItems.mockResolvedValue({
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
    })

    const req = createMockRequest({ first: '25', after: 'cursor-xyz' })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(mockGetBacklogItems).toHaveBeenCalledWith({
      projectId: undefined,
      first: 25,
      after: 'cursor-xyz',
    })
  })

  it('should return 400 when first is not a valid number', async () => {
    const req = createMockRequest({ first: 'not-a-number' })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: {
        message: 'Parameter "first" must be a number between 1 and 250.',
        code: 'INVALID_PARAMETER',
      },
    })
    expect(mockGetBacklogItems).not.toHaveBeenCalled()
  })

  it('should return 400 when first is less than 1', async () => {
    const req = createMockRequest({ first: '0' })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: {
        message: 'Parameter "first" must be a number between 1 and 250.',
        code: 'INVALID_PARAMETER',
      },
    })
  })

  it('should return 400 when first exceeds 250', async () => {
    const req = createMockRequest({ first: '500' })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: {
        message: 'Parameter "first" must be a number between 1 and 250.',
        code: 'INVALID_PARAMETER',
      },
    })
  })

  it('should call next with error when service throws', async () => {
    const serviceError = new Error('Service failure')
    mockGetBacklogItems.mockRejectedValue(serviceError)

    const req = createMockRequest()
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(serviceError)
  })

  it('should return empty items for empty results', async () => {
    const emptyResponse: PaginatedResponse<BacklogItemDto> = {
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
    }
    mockGetBacklogItems.mockResolvedValue(emptyResponse)

    const req = createMockRequest()
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual({
      ...emptyResponse,
      servedFromCache: false,
      lastSyncedAt: null,
    })
  })

  it('should return 400 when fields includes unknown field', async () => {
    const req = createMockRequest({ query: { fields: 'id,title,notARealField' } })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_PARAMETER',
      },
    })
    expect((res.body as { error?: { message?: string } }).error?.message).toContain('Unknown field(s): notARealField')
    expect(mockGetBacklogItems).not.toHaveBeenCalled()
  })

  it('should return only requested fields (and always include id) when fields is provided', async () => {
    const item = createMockBacklogItem({ title: 'Hello', priority: 2 })
    mockGetBacklogItems.mockResolvedValue({
      items: [item],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
    })

    const req = createMockRequest({ query: { fields: 'title' } })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      items: [{ id: item.id, title: 'Hello' }],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
      servedFromCache: false,
      lastSyncedAt: null,
    })
  })

  it('should set Cache-Control and ETag headers when served from cache', async () => {
    const item = createMockBacklogItem({ id: 'issue-1', title: 'Cached' })
    const cachedResponse = {
      items: [item],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
      _servedFromCache: true,
    }
    mockGetBacklogItems.mockResolvedValue(cachedResponse)

    const req = createMockRequest()
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Cache-Control')).toBe('private, max-age=60, stale-while-revalidate=300')
    expect(res.getHeader('ETag')).toMatch(/^"[a-f0-9]{32}"$/)
  })

  it('should return 304 when If-None-Match matches current ETag (served from cache)', async () => {
    const item = createMockBacklogItem({ id: 'issue-1', title: 'Cached' })
    const cachedResponse = {
      items: [item],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 1,
      _servedFromCache: true,
    }
    mockGetBacklogItems.mockResolvedValue(cachedResponse)

    // Compute expected ETag exactly how the controller does.
    const expectedBody = JSON.stringify({
      items: cachedResponse.items,
      pageInfo: cachedResponse.pageInfo,
      totalCount: cachedResponse.totalCount,
      servedFromCache: true,
      lastSyncedAt: null,
    })
    const expectedEtag = generateETag(expectedBody)

    const req = createMockRequest({ headers: { 'if-none-match': expectedEtag } })
    const res = createMockResponse()

    await getBacklogItems(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(304)
    expect(res.body).toBeNull()
  })
})

describe('BacklogController.getBacklogItemById', () => {
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn()
  })

  it('should return item and comments with 200 status', async () => {
    const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const mockItem = createMockBacklogItem({ id: validUuid })
    const mockComments: CommentDto[] = [
      {
        id: 'comment-1',
        body: 'Test comment',
        createdAt: '2026-02-05T10:00:00.000Z',
        updatedAt: '2026-02-05T10:00:00.000Z',
        userId: null,
        userName: 'User',
        userAvatarUrl: null,
        parentId: null,
      },
    ]
    const mockActivities: IssueActivityDto[] = [
      {
        id: 'activity-1',
        createdAt: '2026-02-05T10:00:00.000Z',
        actorName: 'Jane Dev',
        type: 'state_change',
        description: 'Status changed from Backlog to In Progress',
      },
    ]
    mockGetBacklogItemById.mockResolvedValue({ item: mockItem, comments: mockComments, activities: mockActivities })

    const req = createMockRequest({ params: { id: validUuid } })
    const res = createMockResponse()

    await getBacklogItemById(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ item: mockItem, comments: mockComments, activities: mockActivities })
    expect(mockGetBacklogItemById).toHaveBeenCalledWith(validUuid)
  })

  it('should return 404 when item does not exist', async () => {
    const validUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    mockGetBacklogItemById.mockResolvedValue(null)

    const req = createMockRequest({ params: { id: validUuid } })
    const res = createMockResponse()

    await getBacklogItemById(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      error: { message: 'Backlog item not found', code: 'NOT_FOUND' },
    })
  })

  it('should return 400 when id is missing', async () => {
    const req = createMockRequest({ params: {} })
    const res = createMockResponse()

    await getBacklogItemById(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: { message: 'Invalid or missing parameter: id must be a valid UUID.', code: 'INVALID_PARAMETER' },
    })
    expect(mockGetBacklogItemById).not.toHaveBeenCalled()
  })

  it('should return 400 when id is not a valid UUID', async () => {
    const req = createMockRequest({ params: { id: 'not-a-uuid' } })
    const res = createMockResponse()

    await getBacklogItemById(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: { message: 'Invalid or missing parameter: id must be a valid UUID.', code: 'INVALID_PARAMETER' },
    })
    expect(mockGetBacklogItemById).not.toHaveBeenCalled()
  })

  it('should call next with error when service throws', async () => {
    const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const serviceError = new Error('Service failure')
    mockGetBacklogItemById.mockRejectedValue(serviceError)

    const req = createMockRequest({ params: { id: validUuid } })
    const res = createMockResponse()

    await getBacklogItemById(req, res as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(serviceError)
  })
})
