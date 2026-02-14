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

import { requireIT } from './it.middleware.js'

function createMockReqResNext(session: Record<string, unknown> = {}): {
  req: Request
  res: Response
  next: NextFunction
} {
  const req = {
    path: '/test',
    session: { userId: '1', ...session },
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('it.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireIT', () => {
    it('should call next when session has isIT = true', () => {
      const { req, res, next } = createMockReqResNext({ isIT: true })

      requireIT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should call next when session has isAdmin = true (admin bypasses IT check)', () => {
      const { req, res, next } = createMockReqResNext({ isAdmin: true })

      requireIT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should call next when session has both isIT and isAdmin = true', () => {
      const { req, res, next } = createMockReqResNext({ isIT: true, isAdmin: true })

      requireIT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 403 IT_OR_ADMIN_REQUIRED when neither IT nor admin', () => {
      const { req, res, next } = createMockReqResNext({ isIT: false, isAdmin: false })

      requireIT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'IT_OR_ADMIN_REQUIRED' }),
        }),
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 403 IT_OR_ADMIN_REQUIRED when isIT and isAdmin are undefined', () => {
      const { req, res, next } = createMockReqResNext()

      requireIT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
