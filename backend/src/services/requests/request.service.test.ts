import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the module under test
vi.mock('../../utils/database.js', () => ({
  query: vi.fn(),
  pool: {
    connect: vi.fn(),
  },
}))

vi.mock('../../config/linear.config.js', () => ({
  getLinearConfig: vi.fn(() => ({
    apiKey: 'test-api-key',
    apiUrl: 'https://api.linear.app/graphql',
  })),
}))

vi.mock('@linear/sdk', () => ({
  LinearClient: vi.fn(),
}))

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('../sync/sync.service.js', () => ({
  syncService: {
    runSync: vi.fn().mockResolvedValue(undefined),
  },
}))

import { query, pool } from '../../utils/database.js'
import {
  createRequest,
  getRequestsByUser,
  getTriageQueue,
  getRequestById,
  approveRequest,
  rejectRequest,
  findSimilarItems,
} from './request.service.js'

const mockQuery = vi.mocked(query)
const mockPool = vi.mocked(pool)

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-uuid-123',
    user_id: 1,
    title: 'Test Request Title',
    description: 'A detailed description that is long enough for validation purposes',
    business_impact: 'medium',
    category: null,
    urgency: null,
    status: 'submitted',
    admin_notes: null,
    rejection_reason: null,
    reviewed_by: null,
    linear_issue_id: null,
    created_at: new Date('2026-02-17T10:00:00Z'),
    updated_at: new Date('2026-02-17T10:00:00Z'),
    ...overrides,
  }
}

describe('request.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRequest', () => {
    it('should insert a new request and return mapped result', async () => {
      const row = makeRow()
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)

      const result = await createRequest({
        userId: 1,
        title: 'Test Request Title',
        description: 'A detailed description',
        businessImpact: 'medium',
      })

      expect(result.id).toBe('test-uuid-123')
      expect(result.userId).toBe(1)
      expect(result.title).toBe('Test Request Title')
      expect(result.businessImpact).toBe('medium')
      expect(result.status).toBe('submitted')
      expect(mockQuery).toHaveBeenCalledOnce()
    })

    it('should pass category and urgency when provided', async () => {
      const row = makeRow({ category: 'Infrastructure', urgency: 'asap' })
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)

      await createRequest({
        userId: 1,
        title: 'Test Request',
        description: 'Description',
        businessImpact: 'high',
        category: 'Infrastructure',
        urgency: 'asap',
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO requests'),
        expect.arrayContaining([1, 'Test Request', 'Description', 'high', 'Infrastructure', 'asap']),
      )
    })
  })

  describe('getRequestsByUser', () => {
    it('should return requests for a specific user', async () => {
      const rows = [makeRow(), makeRow({ id: 'test-uuid-456' })]
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 } as never)

      const result = await getRequestsByUser(1)

      expect(result).toHaveLength(2)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [1],
      )
    })
  })

  describe('getTriageQueue', () => {
    it('should return all requests with submitter info', async () => {
      const rows = [
        makeRow({ submitter_email: 'user@vixxo.com', submitter_name: 'Test User' }),
      ]
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 } as never)

      const result = await getTriageQueue()

      expect(result).toHaveLength(1)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users'),
      )
    })
  })

  describe('getRequestById', () => {
    it('should return a request with submitter info', async () => {
      const row = makeRow({ submitter_email: 'user@vixxo.com', submitter_name: 'Test User' })
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)

      const result = await getRequestById('test-uuid-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('test-uuid-123')
    })

    it('should return null when request not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      const result = await getRequestById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('rejectRequest', () => {
    it('should reject a submitted request with a reason', async () => {
      const row = makeRow({ status: 'rejected', rejection_reason: 'Duplicate', reviewed_by: 2 })
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)

      const result = await rejectRequest('test-uuid-123', {
        adminId: 2,
        rejectionReason: 'Duplicate',
      })

      expect(result.status).toBe('rejected')
      expect(result.rejectionReason).toBe('Duplicate')
    })

    it('should throw NOT_FOUND when request does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      await expect(
        rejectRequest('nonexistent', { adminId: 2, rejectionReason: 'Not needed' }),
      ).rejects.toThrow('Request not found')
    })

    it('should throw INVALID_STATUS when request is already approved', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'test', status: 'approved' }],
        rowCount: 1,
      } as never)

      await expect(
        rejectRequest('test', { adminId: 2, rejectionReason: 'Too late' }),
      ).rejects.toThrow('Cannot reject request')
    })
  })

  describe('findSimilarItems', () => {
    it('should return matching backlog items', async () => {
      const rows = [
        { identifier: 'VIX-100', title: 'Login page', status: 'Unknown' },
        { identifier: 'VIX-101', title: 'Login flow', status: 'Unknown' },
      ]
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 } as never)

      const result = await findSimilarItems('login')

      expect(result).toHaveLength(2)
      expect(result[0].identifier).toBe('VIX-100')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%login%'],
      )
    })

    it('should return empty array when no matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      const result = await findSimilarItems('xyznonexistent')

      expect(result).toHaveLength(0)
    })
  })

  describe('approveRequest', () => {
    it('should approve a request using transactional flow', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      }

      // BEGIN
      mockClient.query.mockResolvedValueOnce({})
      // SELECT FOR UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [makeRow({
          submitter_email: 'user@vixxo.com',
          submitter_name: 'Test User',
        })],
      })
      // UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [makeRow({ status: 'approved', reviewed_by: 2 })],
      })
      // COMMIT
      mockClient.query.mockResolvedValueOnce({})

      mockPool.connect.mockResolvedValueOnce(mockClient as never)

      // Mock LinearClient to throw (best-effort)
      const { LinearClient } = await import('@linear/sdk')
      vi.mocked(LinearClient).mockImplementation(() => {
        throw new Error('Linear unavailable')
      })

      const result = await approveRequest('test-uuid-123', { adminId: 2 })

      expect(result.status).toBe('approved')
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
      expect(mockClient.release).toHaveBeenCalled()
    })
  })
})
