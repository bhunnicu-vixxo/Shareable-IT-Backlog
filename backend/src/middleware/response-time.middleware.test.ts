import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { responseTimeMiddleware } from './response-time.middleware.js'
import { logger } from '../utils/logger.js'

const mockLogger = vi.mocked(logger)

function createMockReqRes(): { req: Request; res: Response; next: NextFunction } {
  const finishListeners: Array<() => void> = []

  const req = {
    method: 'GET',
    originalUrl: '/api/backlog-items',
  } as unknown as Request

  const headers = new Map<string, string | number | undefined>()

  const res = {
    statusCode: 200,
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value)
    }),
    getHeader: vi.fn((name: string) => headers.get(name.toLowerCase())),
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'finish') finishListeners.push(handler)
    }),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return {
    req,
    res: Object.assign(res, {
      _triggerFinish: () => finishListeners.forEach((fn) => fn()),
      _getHeaders: () => headers,
    }),
    next,
  }
}

describe('responseTimeMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call next() to pass control to the next middleware', () => {
    const { req, res, next } = createMockReqRes()
    responseTimeMiddleware(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should set X-Response-Time header when res.json() is called', () => {
    const { req, res, next } = createMockReqRes()
    responseTimeMiddleware(req, res, next)

    // Simulate controller calling res.json()
    res.json({ data: 'test' })

    const headers = (res as unknown as { _getHeaders: () => Map<string, string> })._getHeaders()
    const responseTime = headers.get('x-response-time')
    expect(responseTime).toBeDefined()
    expect(responseTime).toMatch(/^\d+\.\d{2}ms$/)
  })

  it('should set X-Response-Time header when res.send() is called', () => {
    const { req, res, next } = createMockReqRes()
    responseTimeMiddleware(req, res, next)

    // Simulate calling res.send() directly (e.g., health check)
    res.send('OK')

    const headers = (res as unknown as { _getHeaders: () => Map<string, string> })._getHeaders()
    const responseTime = headers.get('x-response-time')
    expect(responseTime).toBeDefined()
    expect(responseTime).toMatch(/^\d+\.\d{2}ms$/)
  })

  it('should set X-Response-Time header when res.end() is called', () => {
    const { req, res, next } = createMockReqRes()
    responseTimeMiddleware(req, res, next)

    res.end()

    const headers = (res as unknown as { _getHeaders: () => Map<string, string> })._getHeaders()
    const responseTime = headers.get('x-response-time')
    expect(responseTime).toBeDefined()
    expect(responseTime).toMatch(/^\d+\.\d{2}ms$/)
  })

  it('should log at debug level for normal responses on finish event', () => {
    const { req, res, next } = createMockReqRes()
    responseTimeMiddleware(req, res, next)

    // Trigger finish event
    const triggerFinish = (res as unknown as { _triggerFinish: () => void })._triggerFinish
    triggerFinish()

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/api/backlog-items',
        statusCode: 200,
        durationMs: expect.any(Number),
      }),
      'API response',
    )
  })

  it('should log response time as a numeric value', () => {
    const { req, res, next } = createMockReqRes()
    responseTimeMiddleware(req, res, next)

    const triggerFinish = (res as unknown as { _triggerFinish: () => void })._triggerFinish
    triggerFinish()

    const logData = mockLogger.debug.mock.calls[0]?.[0] as { durationMs?: number } | undefined
    expect(typeof logData?.durationMs).toBe('number')
    expect(logData!.durationMs).toBeGreaterThanOrEqual(0)
  })
})
