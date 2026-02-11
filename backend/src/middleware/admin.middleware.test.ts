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

import { requireAdmin } from './admin.middleware.js'

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

describe('admin.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAdmin', () => {
    it('should call next when session has isAdmin = true', () => {
      const { req, res, next } = createMockReqResNext({ isAdmin: true })

      requireAdmin(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 403 ADMIN_REQUIRED when isAdmin is false', () => {
      const { req, res, next } = createMockReqResNext({ isAdmin: false })

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'ADMIN_REQUIRED' }),
        }),
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 403 ADMIN_REQUIRED when isAdmin is undefined', () => {
      const { req, res, next } = createMockReqResNext()

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
