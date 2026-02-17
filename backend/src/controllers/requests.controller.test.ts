import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock service
vi.mock('../services/requests/request.service.js', () => ({
  createRequest: vi.fn(),
  getRequestsByUser: vi.fn(),
  getTriageQueue: vi.fn(),
  getRequestById: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  findSimilarItems: vi.fn(),
  mergeRequest: vi.fn(),
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createRequest,
  getRequestsByUser,
  findSimilarItems,
  approveRequest,
  rejectRequest,
  mergeRequest,
} from '../services/requests/request.service.js'
import {
  submitRequest,
  getMyRequests,
  getSimilarItems,
  approveRequestHandler,
  rejectRequestHandler,
  mergeRequestHandler,
} from './requests.controller.js'

const mockCreateRequest = vi.mocked(createRequest)
const mockGetRequestsByUser = vi.mocked(getRequestsByUser)
const mockFindSimilarItems = vi.mocked(findSimilarItems)
const mockApproveRequest = vi.mocked(approveRequest)
const mockRejectRequest = vi.mocked(rejectRequest)
const mockMergeRequest = vi.mocked(mergeRequest)

function createMockReq(overrides: Record<string, unknown> = {}): unknown {
  return {
    session: { userId: '1', isAdmin: true },
    body: {},
    params: {},
    query: {},
    ...overrides,
  }
}

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res
}

const next = vi.fn()

describe('requests.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitRequest', () => {
    it('should return 400 when title is too short', async () => {
      const req = createMockReq({ body: { title: 'Short', description: 'x'.repeat(50), businessImpact: 'medium' } })
      const res = createMockRes()

      await submitRequest(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }))
    })

    it('should return 400 when description is too short', async () => {
      const req = createMockReq({ body: { title: 'A valid title here', description: 'Short', businessImpact: 'medium' } })
      const res = createMockRes()

      await submitRequest(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when businessImpact is invalid', async () => {
      const req = createMockReq({ body: { title: 'A valid title here', description: 'x'.repeat(50), businessImpact: 'extreme' } })
      const res = createMockRes()

      await submitRequest(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 201 on successful submission', async () => {
      const mockRequest = { id: 'uuid-1', title: 'Test', status: 'submitted' }
      mockCreateRequest.mockResolvedValueOnce(mockRequest as never)

      const req = createMockReq({
        body: {
          title: 'A valid request title',
          description: 'x'.repeat(50),
          businessImpact: 'medium',
        },
      })
      const res = createMockRes()

      await submitRequest(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockRequest)
    })

    it('should validate urgency when provided', async () => {
      const req = createMockReq({
        body: {
          title: 'A valid request title',
          description: 'x'.repeat(50),
          businessImpact: 'medium',
          urgency: 'invalid_urgency',
        },
      })
      const res = createMockRes()

      await submitRequest(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('getMyRequests', () => {
    it('should return user requests', async () => {
      const requests = [{ id: 'uuid-1' }, { id: 'uuid-2' }]
      mockGetRequestsByUser.mockResolvedValueOnce(requests as never)

      const req = createMockReq()
      const res = createMockRes()

      await getMyRequests(req as never, res as never, next)

      expect(res.json).toHaveBeenCalledWith(requests)
      expect(mockGetRequestsByUser).toHaveBeenCalledWith(1)
    })
  })

  describe('getSimilarItems', () => {
    it('should return empty array for short search text', async () => {
      const req = createMockReq({ query: { title: 'ab' } })
      const res = createMockRes()

      await getSimilarItems(req as never, res as never, next)

      expect(res.json).toHaveBeenCalledWith([])
      expect(mockFindSimilarItems).not.toHaveBeenCalled()
    })

    it('should return similar items for valid search', async () => {
      const items = [{ identifier: 'VIX-100', title: 'Login page', status: 'Unknown' }]
      mockFindSimilarItems.mockResolvedValueOnce(items)

      const req = createMockReq({ query: { title: 'login page' } })
      const res = createMockRes()

      await getSimilarItems(req as never, res as never, next)

      expect(res.json).toHaveBeenCalledWith(items)
    })
  })

  describe('approveRequestHandler', () => {
    it('should return 404 for nonexistent request', async () => {
      mockApproveRequest.mockRejectedValueOnce(
        Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' }),
      )

      const req = createMockReq({ params: { id: 'nonexistent' } })
      const res = createMockRes()

      await approveRequestHandler(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 409 for invalid status transition', async () => {
      mockApproveRequest.mockRejectedValueOnce(
        Object.assign(new Error('Cannot approve'), { code: 'INVALID_STATUS' }),
      )

      const req = createMockReq({ params: { id: 'test' } })
      const res = createMockRes()

      await approveRequestHandler(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('should return approved request on success', async () => {
      const approved = { id: 'test', status: 'approved', linearIssueId: 'lin-123' }
      mockApproveRequest.mockResolvedValueOnce(approved as never)

      const req = createMockReq({ params: { id: 'test' } })
      const res = createMockRes()

      await approveRequestHandler(req as never, res as never, next)

      expect(res.json).toHaveBeenCalledWith(approved)
    })
  })

  describe('rejectRequestHandler', () => {
    it('should return 400 when rejection reason is missing', async () => {
      const req = createMockReq({ params: { id: 'test' }, body: {} })
      const res = createMockRes()

      await rejectRequestHandler(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when rejection reason is too short', async () => {
      const req = createMockReq({ params: { id: 'test' }, body: { rejectionReason: 'No' } })
      const res = createMockRes()

      await rejectRequestHandler(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return rejected request on success', async () => {
      const rejected = { id: 'test', status: 'rejected', rejectionReason: 'Duplicate request' }
      mockRejectRequest.mockResolvedValueOnce(rejected as never)

      const req = createMockReq({
        params: { id: 'test' },
        body: { rejectionReason: 'Duplicate request' },
      })
      const res = createMockRes()

      await rejectRequestHandler(req as never, res as never, next)

      expect(res.json).toHaveBeenCalledWith(rejected)
    })
  })

  describe('mergeRequestHandler', () => {
    it('should return 400 when linearIssueIdentifier is missing', async () => {
      const req = createMockReq({ params: { id: 'test' }, body: {} })
      const res = createMockRes()

      await mergeRequestHandler(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 for nonexistent request', async () => {
      mockMergeRequest.mockRejectedValueOnce(
        Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' }),
      )

      const req = createMockReq({ params: { id: 'nonexistent' }, body: { linearIssueIdentifier: 'VIX-999' } })
      const res = createMockRes()

      await mergeRequestHandler(req as never, res as never, next)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return merged request on success', async () => {
      const merged = { id: 'test', status: 'merged', linearIssueIdentifier: 'VIX-123' }
      mockMergeRequest.mockResolvedValueOnce(merged as never)

      const req = createMockReq({ params: { id: 'test' }, body: { linearIssueIdentifier: 'VIX-123' } })
      const res = createMockRes()

      await mergeRequestHandler(req as never, res as never, next)

      expect(res.json).toHaveBeenCalledWith(merged)
    })
  })
})
