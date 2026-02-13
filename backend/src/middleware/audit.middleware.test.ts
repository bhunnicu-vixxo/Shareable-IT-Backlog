import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { auditMiddleware } from './audit.middleware.js'

// Mock audit service
vi.mock('../services/audit/audit.service.js', () => ({
  auditService: {
    logUserAccess: vi.fn(),
  },
}))

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { auditService } from '../services/audit/audit.service.js'

const mockLogUserAccess = vi.mocked(auditService.logUserAccess)

/** Helper: create a minimal mock Request */
function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/backlog-items',
    method: 'GET',
    ip: '10.0.0.1',
    query: {},
    params: {},
    session: { userId: '42' },
    ...overrides,
  } as unknown as Request
}

/** Helper: create a minimal mock Response with event emitter */
function createMockRes(): Response & { _triggerFinish: () => void } {
  const listeners: Record<string, Array<() => void>> = {}
  const res = {
    statusCode: 200,
    on(event: string, fn: () => void) {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(fn)
      return res
    },
    getHeader(name: string) {
      if (name === 'x-response-time') return '12.34ms'
      return undefined
    },
    _triggerFinish() {
      for (const fn of listeners['finish'] ?? []) {
        fn()
      }
    },
  }
  return res as unknown as Response & { _triggerFinish: () => void }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLogUserAccess.mockResolvedValue(undefined)
})

describe('auditMiddleware', () => {
  it('calls next() immediately', () => {
    const req = createMockReq()
    const res = createMockRes()
    const next = vi.fn()

    auditMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('logs VIEW_BACKLOG for GET /api/backlog-items', () => {
    const req = createMockReq({ path: '/api/backlog-items', method: 'GET' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledOnce()
    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        action: 'VIEW_BACKLOG',
        resource: 'backlog',
        resourceId: null,
        ipAddress: '10.0.0.1',
        isAdminAction: false,
      }),
    )
  })

  it('logs VIEW_ITEM with correct resource_id for GET /api/backlog-items/:id', () => {
    const req = createMockReq({
      path: '/api/backlog-items/abc-123',
      method: 'GET',
      params: { id: 'abc-123' },
    } as Partial<Request>)
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_ITEM',
        resource: 'backlog_item',
        resourceId: 'abc-123',
      }),
    )
  })

  it('logs VIEW_ITEM_COMMENTS for GET /api/backlog-items/:id/comments', () => {
    const req = createMockReq({
      path: '/api/backlog-items/abc-123/comments',
      method: 'GET',
      params: { id: 'abc-123' },
    } as Partial<Request>)
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_ITEM_COMMENTS',
        resource: 'backlog_item',
      }),
    )
  })

  it('logs VIEW_ITEM_UPDATES for GET /api/backlog-items/:id/updates', () => {
    const req = createMockReq({
      path: '/api/backlog-items/abc-123/updates',
      method: 'GET',
      params: { id: 'abc-123' },
    } as Partial<Request>)
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_ITEM_UPDATES',
        resource: 'backlog_item',
      }),
    )
  })

  it('logs VIEW_SYNC_STATUS for GET /api/sync/status', () => {
    const req = createMockReq({ path: '/api/sync/status', method: 'GET' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_SYNC_STATUS',
        resource: 'sync',
      }),
    )
  })

  it('logs TRIGGER_SYNC for POST /api/sync/trigger', () => {
    const req = createMockReq({ path: '/api/sync/trigger', method: 'POST' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIGGER_SYNC',
        resource: 'sync',
      }),
    )
  })

  it('logs VIEW_ADMIN_DASHBOARD for GET /api/admin/*', () => {
    const req = createMockReq({ path: '/api/admin/users', method: 'GET' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_ADMIN_DASHBOARD',
        resource: 'admin',
      }),
    )
  })

  it('logs VIEW_USERS for GET /api/users', () => {
    const req = createMockReq({ path: '/api/users', method: 'GET' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_USERS',
        resource: 'user',
      }),
    )
  })

  it('defaults to API_ACCESS for unmatched routes', () => {
    const req = createMockReq({ path: '/api/some-other-route', method: 'POST' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'API_ACCESS',
        resource: 'api',
      }),
    )
  })

  it('skips health check endpoints', () => {
    const req = createMockReq({ path: '/api/health', method: 'GET' })
    const res = createMockRes()
    const next = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(next).toHaveBeenCalledOnce()
    expect(mockLogUserAccess).not.toHaveBeenCalled()
  })

  it('skips OPTIONS preflight requests', () => {
    const req = createMockReq({ path: '/api/backlog-items', method: 'OPTIONS' })
    const res = createMockRes()
    const next = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(next).toHaveBeenCalledOnce()
    expect(mockLogUserAccess).not.toHaveBeenCalled()
  })

  it('skips unauthenticated requests (no session userId)', () => {
    const req = createMockReq({ session: {} } as Partial<Request>)
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).not.toHaveBeenCalled()
  })

  it('does not block response on audit log write error', async () => {
    mockLogUserAccess.mockRejectedValueOnce(new Error('DB down'))

    const req = createMockReq()
    const res = createMockRes()
    const next = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    // next was called immediately — response was not blocked
    expect(next).toHaveBeenCalledOnce()

    // Allow microtask to settle
    await new Promise((resolve) => setTimeout(resolve, 10))

    // The error was handled (caught by the .catch handler)
    // No unhandled promise rejection
  })

  it('captures query params in details', () => {
    const req = createMockReq({
      path: '/api/backlog-items',
      method: 'GET',
      query: { search: 'test', businessUnit: 'IT' },
    } as Partial<Request>)
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    const callArg = mockLogUserAccess.mock.calls[0][0]
    expect(callArg.details).toEqual(
      expect.objectContaining({
        method: 'GET',
        path: '/api/backlog-items',
        query: { search: 'test', businessUnit: 'IT' },
        statusCode: 200,
        responseTime: '12.34ms',
      }),
    )
  })

  it('captures response status code and response time', () => {
    const req = createMockReq()
    const res = createMockRes()
    res.statusCode = 404
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    const callArg = mockLogUserAccess.mock.calls[0][0]
    expect(callArg.details).toEqual(
      expect.objectContaining({
        statusCode: 404,
        responseTime: '12.34ms',
      }),
    )
  })

  it('sets isAdminAction to false for all entries', () => {
    const req = createMockReq({ path: '/api/admin/users', method: 'GET' })
    const res = createMockRes()
    const next: NextFunction = vi.fn()

    auditMiddleware(req, res, next)
    res._triggerFinish()

    expect(mockLogUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({ isAdminAction: false }),
    )
  })
})
