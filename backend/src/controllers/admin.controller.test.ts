import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { mockGetPendingUsers, mockApproveUser, mockGetAllUsers, mockDisableUser, mockEnableUser } = vi.hoisted(() => ({
  mockGetPendingUsers: vi.fn(),
  mockApproveUser: vi.fn(),
  mockGetAllUsers: vi.fn(),
  mockDisableUser: vi.fn(),
  mockEnableUser: vi.fn(),
}))

vi.mock('../services/users/user.service.js', () => ({
  getPendingUsers: mockGetPendingUsers,
  approveUser: mockApproveUser,
  getAllUsers: mockGetAllUsers,
  disableUser: mockDisableUser,
  enableUser: mockEnableUser,
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { listPendingUsers, approveUserHandler, listAllUsers, disableUserHandler, enableUserHandler } from './admin.controller.js'

function createMockReqResNext(
  overrides: { params?: Record<string, string>; session?: Record<string, unknown> } = {},
): {
  req: Request
  res: Response
  next: NextFunction
} {
  const req = {
    params: overrides.params ?? {},
    ip: '127.0.0.1',
    session: { userId: '1', isAdmin: true, ...overrides.session },
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('admin.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPendingUsers', () => {
    it('should return pending users list', async () => {
      const pendingUsers = [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00.000Z' },
      ]
      mockGetPendingUsers.mockResolvedValue(pendingUsers)
      const { req, res, next } = createMockReqResNext()

      await listPendingUsers(req, res, next)

      expect(res.json).toHaveBeenCalledWith(pendingUsers)
    })
  })

  describe('approveUserHandler', () => {
    it('should approve user and return 200', async () => {
      const approvedUser = {
        id: 2,
        email: 'user@vixxo.com',
        isApproved: true,
        approvedBy: 1,
      }
      mockApproveUser.mockResolvedValue(approvedUser)
      const { req, res, next } = createMockReqResNext({ params: { id: '2' } })

      await approveUserHandler(req, res, next)

      expect(mockApproveUser).toHaveBeenCalledWith(2, 1, '127.0.0.1')
      expect(res.json).toHaveBeenCalledWith(approvedUser)
    })

    it('should return 400 for invalid user ID', async () => {
      const { req, res, next } = createMockReqResNext({ params: { id: 'abc' } })

      await approveUserHandler(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        }),
      )
    })

    it('should pass errors to next for service failures', async () => {
      const error = new Error('User not found')
      mockApproveUser.mockRejectedValue(error)
      const { req, res, next } = createMockReqResNext({ params: { id: '999' } })

      await approveUserHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('listAllUsers', () => {
    it('should return all users list', async () => {
      const allUsers = [
        { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false, approvedAt: '2026-02-10T10:00:00.000Z', lastAccessAt: null, createdAt: '2026-02-10T10:00:00.000Z' },
        { id: 2, email: 'user@vixxo.com', displayName: 'User', isAdmin: false, isApproved: true, isDisabled: false, approvedAt: null, lastAccessAt: null, createdAt: '2026-02-10T10:00:00.000Z' },
      ]
      mockGetAllUsers.mockResolvedValue(allUsers)
      const { req, res, next } = createMockReqResNext()

      await listAllUsers(req, res, next)

      expect(res.json).toHaveBeenCalledWith(allUsers)
    })

    it('should pass errors to next', async () => {
      const error = new Error('Database error')
      mockGetAllUsers.mockRejectedValue(error)
      const { req, res, next } = createMockReqResNext()

      await listAllUsers(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('disableUserHandler', () => {
    it('should disable user and return updated user', async () => {
      const disabledUser = {
        id: 2,
        email: 'user@vixxo.com',
        isDisabled: true,
      }
      mockDisableUser.mockResolvedValue(disabledUser)
      const { req, res, next } = createMockReqResNext({ params: { id: '2' } })

      await disableUserHandler(req, res, next)

      expect(mockDisableUser).toHaveBeenCalledWith(2, 1, '127.0.0.1')
      expect(res.json).toHaveBeenCalledWith(disabledUser)
    })

    it('should return 400 for invalid user ID', async () => {
      const { req, res, next } = createMockReqResNext({ params: { id: 'abc' } })

      await disableUserHandler(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        }),
      )
    })

    it('should pass errors to next for service failures', async () => {
      const error = new Error('Cannot disable your own account')
      mockDisableUser.mockRejectedValue(error)
      const { req, res, next } = createMockReqResNext({ params: { id: '2' } })

      await disableUserHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('enableUserHandler', () => {
    it('should enable user and return updated user', async () => {
      const enabledUser = {
        id: 3,
        email: 'disabled@vixxo.com',
        isDisabled: false,
      }
      mockEnableUser.mockResolvedValue(enabledUser)
      const { req, res, next } = createMockReqResNext({ params: { id: '3' } })

      await enableUserHandler(req, res, next)

      expect(mockEnableUser).toHaveBeenCalledWith(3, 1, '127.0.0.1')
      expect(res.json).toHaveBeenCalledWith(enabledUser)
    })

    it('should return 400 for invalid user ID', async () => {
      const { req, res, next } = createMockReqResNext({ params: { id: '0' } })

      await enableUserHandler(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        }),
      )
    })

    it('should pass errors to next for service failures', async () => {
      const error = new Error('User not disabled')
      mockEnableUser.mockRejectedValue(error)
      const { req, res, next } = createMockReqResNext({ params: { id: '3' } })

      await enableUserHandler(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
