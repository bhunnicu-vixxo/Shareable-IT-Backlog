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

import { requireAuth, requireApproved } from './auth.middleware.js'

function createMockReqResNext(session: Record<string, unknown> = {}): {
  req: Request
  res: Response
  next: NextFunction
} {
  const req = {
    path: '/test',
    session: { ...session },
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('auth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should call next when session has userId', () => {
      const { req, res, next } = createMockReqResNext({ userId: '1' })

      requireAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 401 when no session userId', () => {
      const { req, res, next } = createMockReqResNext()

      requireAuth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
        }),
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requireApproved', () => {
    it('should call next using cached session values when fresh', async () => {
      const { req, res, next } = createMockReqResNext({
        userId: '1',
        isApproved: true,
        isDisabled: false,
        approvalCheckedAt: Date.now(), // fresh cache
      })

      await requireApproved(req, res, next)

      expect(next).toHaveBeenCalled()
      // Should NOT query database when cache is fresh
      expect(mockGetUserById).not.toHaveBeenCalled()
    })

    it('should query database and refresh cache when cache is stale', async () => {
      const { req, res, next } = createMockReqResNext({
        userId: '1',
        isApproved: true,
        isDisabled: false,
        approvalCheckedAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago — stale
      })
      mockGetUserById.mockResolvedValue({
        id: 1,
        isApproved: true,
        isDisabled: false,
      })

      await requireApproved(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(mockGetUserById).toHaveBeenCalledWith(1)
      // Session cache should be refreshed
      expect(req.session.approvalCheckedAt).toBeGreaterThan(0)
    })

    it('should query database when session has no cached approval status', async () => {
      const { req, res, next } = createMockReqResNext({ userId: '1' })
      mockGetUserById.mockResolvedValue({
        id: 1,
        isApproved: true,
        isDisabled: false,
      })

      await requireApproved(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(mockGetUserById).toHaveBeenCalledWith(1)
    })

    it('should return 403 USER_NOT_APPROVED for unapproved user (cached)', async () => {
      const { req, res, next } = createMockReqResNext({
        userId: '1',
        isApproved: false,
        isDisabled: false,
        approvalCheckedAt: Date.now(),
      })

      await requireApproved(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'USER_NOT_APPROVED' }),
        }),
      )
    })

    it('should return 403 USER_DISABLED for disabled user (cached)', async () => {
      const { req, res, next } = createMockReqResNext({
        userId: '1',
        isApproved: true,
        isDisabled: true,
        approvalCheckedAt: Date.now(),
      })

      await requireApproved(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'USER_DISABLED' }),
        }),
      )
    })

    it('should return 401 when user not found in database (stale cache)', async () => {
      const { req, res, next } = createMockReqResNext({ userId: '999' })
      mockGetUserById.mockResolvedValue(null)

      await requireApproved(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
        }),
      )
    })
  })
})
