import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { httpsRedirectMiddleware } from './https-redirect.middleware.js'

function createMockReqRes(overrides: Partial<{
  secure: boolean
  host: string
  path: string
  originalUrl: string
  nodeEnv: string
}> = {}): { req: Request; res: Response; next: NextFunction } {
  const {
    secure = false,
    host = 'app.vixxo.com',
    path = '/api/backlog-items',
    originalUrl = '/api/backlog-items?page=1',
    nodeEnv = 'production',
  } = overrides

  // Set NODE_ENV for the test
  process.env.NODE_ENV = nodeEnv

  const req = {
    secure,
    path,
    originalUrl,
    headers: { host },
  } as unknown as Request

  const res = {
    redirect: vi.fn(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('httpsRedirectMiddleware', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should redirect HTTP to HTTPS with 301 in production', () => {
    const { req, res, next } = createMockReqRes({
      secure: false,
      nodeEnv: 'production',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith(
      301,
      'https://app.vixxo.com/api/backlog-items?page=1',
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should pass through HTTPS requests in production', () => {
    const { req, res, next } = createMockReqRes({
      secure: true,
      nodeEnv: 'production',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should skip redirect for health check endpoints', () => {
    const { req, res, next } = createMockReqRes({
      secure: false,
      path: '/api/health',
      originalUrl: '/api/health',
      nodeEnv: 'production',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should skip redirect for health sub-paths', () => {
    const { req, res, next } = createMockReqRes({
      secure: false,
      path: '/api/health/db',
      originalUrl: '/api/health/db',
      nodeEnv: 'production',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should always pass through in development mode', () => {
    const { req, res, next } = createMockReqRes({
      secure: false,
      nodeEnv: 'development',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should always pass through in test mode', () => {
    const { req, res, next } = createMockReqRes({
      secure: false,
      nodeEnv: 'test',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should preserve the full original URL including query string', () => {
    const { req, res, next } = createMockReqRes({
      secure: false,
      originalUrl: '/api/backlog-items?sort=priority&filter=active',
      nodeEnv: 'production',
    })

    httpsRedirectMiddleware(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith(
      301,
      'https://app.vixxo.com/api/backlog-items?sort=priority&filter=active',
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should use localhost as fallback when host header is missing', () => {
    process.env.NODE_ENV = 'production'

    const req = {
      secure: false,
      path: '/api/sync/status',
      originalUrl: '/api/sync/status',
      headers: {},
    } as unknown as Request

    const res = { redirect: vi.fn() } as unknown as Response
    const next = vi.fn() as NextFunction

    httpsRedirectMiddleware(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith(
      301,
      'https://localhost/api/sync/status',
    )
  })
})
