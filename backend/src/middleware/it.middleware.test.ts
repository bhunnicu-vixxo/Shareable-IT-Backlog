import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { mockGetUserById } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
}))

vi.mock('../services/auth/auth.service.js', () => ({
  getUserById: mockGetUserById,
}))

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
    mockGetUserById.mockResolvedValue(null)
  })

  describe('requireIT', () => {
    it('should call next when session has isIT = true and cache is fresh', async () => {
      const { req, res, next } = createMockReqResNext({ isIT: true, isAdmin: false, roleCheckedAt: Date.now() })

      await requireIT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(mockGetUserById).not.toHaveBeenCalled()
    })

    it('should call next when session has isAdmin = true (admin bypasses IT check)', async () => {
      const { req, res, next } = createMockReqResNext({ isAdmin: true, isIT: false, roleCheckedAt: Date.now() })

      await requireIT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should call next when session has both isIT and isAdmin = true', async () => {
      const { req, res, next } = createMockReqResNext({ isIT: true, isAdmin: true, roleCheckedAt: Date.now() })

      await requireIT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 403 IT_OR_ADMIN_REQUIRED when neither IT nor admin', async () => {
      const { req, res, next } = createMockReqResNext({ isIT: false, isAdmin: false, roleCheckedAt: Date.now() })

      await requireIT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'IT_OR_ADMIN_REQUIRED' }),
        }),
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('should fetch from DB when cache is stale and allow if user has isIT', async () => {
      mockGetUserById.mockResolvedValue({ isIT: true, isAdmin: false })
      const { req, res, next } = createMockReqResNext({ isIT: false, isAdmin: false })

      await requireIT(req, res, next)

      expect(mockGetUserById).toHaveBeenCalledWith(1)
      expect(next).toHaveBeenCalled()
      expect(req.session.isIT).toBe(true)
      expect(req.session.roleCheckedAt).toBeDefined()
    })

    it('should fetch from DB when cache is stale and deny if user lacks IT/admin', async () => {
      mockGetUserById.mockResolvedValue({ isIT: false, isAdmin: false })
      const { req, res, next } = createMockReqResNext({ isIT: true, isAdmin: false })

      await requireIT(req, res, next)

      expect(mockGetUserById).toHaveBeenCalledWith(1)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 when user no longer exists in DB', async () => {
      mockGetUserById.mockResolvedValue(null)
      const destroyFn = vi.fn()
      const { req, res, next } = createMockReqResNext({ isIT: false })
      req.session.destroy = destroyFn

      await requireIT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
        }),
      )
      expect(destroyFn).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next(err) when DB lookup throws', async () => {
      const dbError = new Error('DB connection failed')
      mockGetUserById.mockRejectedValue(dbError)
      const { req, res, next } = createMockReqResNext({ isIT: false })

      await requireIT(req, res, next)

      expect(next).toHaveBeenCalledWith(dbError)
    })
  })
})
