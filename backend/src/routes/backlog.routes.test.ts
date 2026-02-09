import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

import type { BacklogItemDto } from '../types/linear-entities.types.js'
import type { PaginatedResponse } from '../types/api.types.js'

// Mock the backlog service
vi.mock('../services/backlog/backlog.service.js', () => ({
  backlogService: {
    getBacklogItems: vi.fn(),
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

import { backlogService } from '../services/backlog/backlog.service.js'
import { getBacklogItems } from '../controllers/backlog.controller.js'

const mockGetBacklogItems = vi.mocked(backlogService.getBacklogItems)

function createMockRequest(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request
}

function createMockResponse(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
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
    url: 'https://linear.app/vixxo/issue/VIX-1',
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

    expect(res.body).toEqual(mockResponse)
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

    expect(res.body).toEqual(emptyResponse)
  })
})
