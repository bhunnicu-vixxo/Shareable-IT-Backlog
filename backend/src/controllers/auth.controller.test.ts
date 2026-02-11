import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { mockLookupOrCreateUser, mockGetUserById, mockUpdateLastAccess } = vi.hoisted(() => ({
  mockLookupOrCreateUser: vi.fn(),
  mockGetUserById: vi.fn(),
  mockUpdateLastAccess: vi.fn(),
}))

vi.mock('../services/auth/auth.service.js', () => ({
  lookupOrCreateUser: mockLookupOrCreateUser,
  getUserById: mockGetUserById,
  updateLastAccess: mockUpdateLastAccess,
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { identify, me, logout } from './auth.controller.js'

function createMockReqResNext(
  overrides: { body?: unknown; session?: Record<string, unknown> } = {},
): {
  req: Request
  res: Response
  next: NextFunction
} {
  const req = {
    body: overrides.body ?? {},
    session: {
      userId: undefined,
      isAdmin: undefined,
      destroy: vi.fn((cb: (err?: Error) => void) => cb()),
      ...overrides.session,
    },
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

const mockUser = {
  id: 1,
  email: 'user@vixxo.com',
  displayName: 'User',
  isAdmin: false,
  isApproved: true,
  isDisabled: false,
  lastAccessAt: null,
  approvedAt: null,
  approvedBy: null,
  createdAt: '2026-02-10T10:00:00.000Z',
  updatedAt: '2026-02-10T10:00:00.000Z',
}

describe('auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('identify', () => {
    it('should create session with cached approval fields for valid email', async () => {
      mockLookupOrCreateUser.mockResolvedValue(mockUser)
      const { req, res, next } = createMockReqResNext({ body: { email: 'user@vixxo.com' } })

      await identify(req, res, next)

      expect(req.session.userId).toBe('1')
      expect(req.session.isAdmin).toBe(false)
      expect(req.session.isApproved).toBe(true)
      expect(req.session.isDisabled).toBe(false)
      expect(req.session.approvalCheckedAt).toBeGreaterThan(0)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          email: 'user@vixxo.com',
          isApproved: true,
        }),
      )
    })

    it('should return 400 for missing email', async () => {
      const { req, res, next } = createMockReqResNext({ body: {} })

      await identify(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        }),
      )
    })

    it('should return 400 for invalid email format', async () => {
      const { req, res, next } = createMockReqResNext({ body: { email: 'not-an-email' } })

      await identify(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should update last access for approved users', async () => {
      mockLookupOrCreateUser.mockResolvedValue(mockUser)
      mockUpdateLastAccess.mockResolvedValue(undefined)
      const { req, res, next } = createMockReqResNext({ body: { email: 'user@vixxo.com' } })

      await identify(req, res, next)

      expect(mockUpdateLastAccess).toHaveBeenCalledWith(1)
    })

    it('should not update last access for unapproved users', async () => {
      mockLookupOrCreateUser.mockResolvedValue({ ...mockUser, isApproved: false })
      const { req, res, next } = createMockReqResNext({ body: { email: 'new@vixxo.com' } })

      await identify(req, res, next)

      expect(mockUpdateLastAccess).not.toHaveBeenCalled()
    })
  })

  describe('me', () => {
    it('should return user when session is valid', async () => {
      mockGetUserById.mockResolvedValue(mockUser)
      const { req, res, next } = createMockReqResNext({ session: { userId: '1' } })

      await me(req, res, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, email: 'user@vixxo.com' }),
      )
    })

    it('should update last_access_at for approved users', async () => {
      mockGetUserById.mockResolvedValue(mockUser) // isApproved: true
      mockUpdateLastAccess.mockResolvedValue(undefined)
      const { req, res, next } = createMockReqResNext({ session: { userId: '1' } })

      await me(req, res, next)

      expect(mockUpdateLastAccess).toHaveBeenCalledWith(1)
    })

    it('should not update last_access_at for unapproved users', async () => {
      mockGetUserById.mockResolvedValue({ ...mockUser, isApproved: false })
      const { req, res, next } = createMockReqResNext({ session: { userId: '1' } })

      await me(req, res, next)

      expect(mockUpdateLastAccess).not.toHaveBeenCalled()
    })

    it('should return 401 when no session userId', async () => {
      const { req, res, next } = createMockReqResNext()

      await me(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
        }),
      )
    })

    it('should return 401 when user not found in database', async () => {
      mockGetUserById.mockResolvedValue(null)
      const { req, res, next } = createMockReqResNext({ session: { userId: '999' } })

      await me(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('logout', () => {
    it('should destroy session and clear cookie', async () => {
      const { req, res, next } = createMockReqResNext({ session: { userId: '1' } })

      await logout(req, res, next)

      expect(req.session.destroy).toHaveBeenCalled()
      expect(res.clearCookie).toHaveBeenCalledWith('slb.sid')
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' })
    })
  })
})
