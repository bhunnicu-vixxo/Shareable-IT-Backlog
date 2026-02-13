import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { getAuditLogs } from './audit.controller.js'

// Mock audit service
vi.mock('../services/audit/audit.service.js', () => ({
  auditService: {
    getAuditLogs: vi.fn(),
  },
}))

import { auditService } from '../services/audit/audit.service.js'

const mockGetAuditLogs = vi.mocked(auditService.getAuditLogs)

function createReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request
}

function createRes(): Response & { _statusCode: number; _body: unknown } {
  const res = {
    _statusCode: 200,
    _body: undefined as unknown,
    status(code: number) {
      res._statusCode = code
      return res
    },
    json(body: unknown) {
      res._body = body
      return res
    },
  }
  return res as unknown as Response & { _statusCode: number; _body: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/audit-logs (controller)', () => {
  it('returns paginated audit logs with defaults', async () => {
    const mockResult = {
      logs: [
        {
          id: 1,
          userId: 42,
          action: 'VIEW_BACKLOG',
          resource: 'backlog',
          resourceId: null,
          details: null,
          ipAddress: '10.0.0.1',
          isAdminAction: false,
          createdAt: '2026-02-12T10:00:00.000Z',
        },
      ],
      total: 1,
    }
    mockGetAuditLogs.mockResolvedValueOnce(mockResult)

    const req = createReq()
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(res._statusCode).toBe(200)
    expect(res._body).toEqual({
      logs: mockResult.logs,
      total: 1,
      page: 1,
      limit: 50,
    })
    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      userId: undefined,
      action: undefined,
      resource: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 1,
      limit: 50,
    })
  })

  it('passes filter params to the service', async () => {
    mockGetAuditLogs.mockResolvedValueOnce({ logs: [], total: 0 })

    const req = createReq({
      userId: '42',
      action: 'VIEW_ITEM',
      resource: 'backlog_item',
      startDate: '2026-02-01T00:00:00Z',
      endDate: '2026-02-12T23:59:59Z',
      page: '2',
      limit: '20',
    })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      userId: 42,
      action: 'VIEW_ITEM',
      resource: 'backlog_item',
      startDate: '2026-02-01T00:00:00Z',
      endDate: '2026-02-12T23:59:59Z',
      page: 2,
      limit: 20,
    })
  })

  it('clamps limit to max 200', async () => {
    mockGetAuditLogs.mockResolvedValueOnce({ logs: [], total: 0 })

    const req = createReq({ limit: '500' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(mockGetAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200 }),
    )
  })

  it('returns 400 for invalid userId', async () => {
    const req = createReq({ userId: 'abc' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(res._statusCode).toBe(400)
    expect(res._body).toEqual({
      error: { message: 'Invalid userId parameter', code: 'VALIDATION_ERROR' },
    })
    expect(mockGetAuditLogs).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid page', async () => {
    const req = createReq({ page: 'abc' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(res._statusCode).toBe(400)
    expect(res._body).toEqual({
      error: { message: 'Invalid page parameter', code: 'VALIDATION_ERROR' },
    })
    expect(mockGetAuditLogs).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid limit', async () => {
    const req = createReq({ limit: 'abc' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(res._statusCode).toBe(400)
    expect(res._body).toEqual({
      error: { message: 'Invalid limit parameter', code: 'VALIDATION_ERROR' },
    })
    expect(mockGetAuditLogs).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid startDate', async () => {
    const req = createReq({ startDate: 'not-a-date' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(res._statusCode).toBe(400)
    expect(res._body).toEqual({
      error: {
        message: 'Invalid startDate parameter — use ISO 8601 format',
        code: 'VALIDATION_ERROR',
      },
    })
  })

  it('returns 400 for invalid endDate', async () => {
    const req = createReq({ endDate: 'not-a-date' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(res._statusCode).toBe(400)
    expect(res._body).toEqual({
      error: {
        message: 'Invalid endDate parameter — use ISO 8601 format',
        code: 'VALIDATION_ERROR',
      },
    })
  })

  it('calls next on service error', async () => {
    const serviceError = new Error('DB failure')
    mockGetAuditLogs.mockRejectedValueOnce(serviceError)

    const req = createReq()
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(next).toHaveBeenCalledWith(serviceError)
  })

  it('clamps page to 1 when less than 1', async () => {
    mockGetAuditLogs.mockResolvedValueOnce({ logs: [], total: 0 })

    const req = createReq({ page: '0' })
    const res = createRes()
    const next = vi.fn()

    await getAuditLogs(req, res, next)

    expect(mockGetAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    )
  })
})

