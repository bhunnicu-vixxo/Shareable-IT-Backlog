import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { mockGetPendingUsers, mockApproveUser, mockGetAllUsers, mockDisableUser, mockEnableUser } = vi.hoisted(() => ({
  mockGetPendingUsers: vi.fn(),
  mockApproveUser: vi.fn(),
  mockGetAllUsers: vi.fn(),
  mockDisableUser: vi.fn(),
  mockEnableUser: vi.fn(),
}))

const { mockGetStatus, mockRunSync, mockListSyncHistory } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockRunSync: vi.fn(),
  mockListSyncHistory: vi.fn(),
}))

const { mockGetSyncCronSchedule, mockSetSyncCronSchedule } = vi.hoisted(() => ({
  mockGetSyncCronSchedule: vi.fn(),
  mockSetSyncCronSchedule: vi.fn(),
}))

const { mockAuditLogAdminAction } = vi.hoisted(() => ({
  mockAuditLogAdminAction: vi.fn(),
}))

const { mockSchedulerRestart, mockSchedulerIsRunning, mockSchedulerGetSchedule } = vi.hoisted(() => ({
  mockSchedulerRestart: vi.fn(),
  mockSchedulerIsRunning: vi.fn(),
  mockSchedulerGetSchedule: vi.fn(),
}))

vi.mock('../services/users/user.service.js', () => ({
  getPendingUsers: mockGetPendingUsers,
  approveUser: mockApproveUser,
  getAllUsers: mockGetAllUsers,
  disableUser: mockDisableUser,
  enableUser: mockEnableUser,
}))

vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: mockGetStatus,
    runSync: mockRunSync,
  },
}))

vi.mock('../services/sync/sync-history.service.js', () => ({
  listSyncHistory: mockListSyncHistory,
}))

vi.mock('../services/settings/app-settings.service.js', () => ({
  getSyncCronSchedule: mockGetSyncCronSchedule,
  setSyncCronSchedule: mockSetSyncCronSchedule,
}))

vi.mock('../services/sync/sync-scheduler.service.js', () => ({
  syncScheduler: {
    restart: mockSchedulerRestart,
    isRunning: mockSchedulerIsRunning,
    getSchedule: mockSchedulerGetSchedule,
  },
}))

vi.mock('../services/audit/audit.service.js', () => ({
  auditService: {
    logAdminAction: mockAuditLogAdminAction,
  },
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  listPendingUsers,
  approveUserHandler,
  listAllUsers,
  disableUserHandler,
  enableUserHandler,
  adminTriggerSync,
  getSyncHistory,
  updateSyncSchedule,
} from './admin.controller.js'

function createMockReqResNext(
  overrides: {
    params?: Record<string, string>
    session?: Record<string, unknown>
    body?: Record<string, unknown>
  } = {},
): {
  req: Request
  res: Response
  next: NextFunction
} {
  const req = {
    params: overrides.params ?? {},
    ip: '127.0.0.1',
    session: { userId: '1', isAdmin: true, ...overrides.session },
    body: overrides.body ?? {},
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

  describe('adminTriggerSync', () => {
    it('should return 202 and trigger sync with admin ID', async () => {
      mockGetStatus.mockReturnValue({ status: 'idle', lastSyncedAt: null, itemCount: null, errorMessage: null, errorCode: null })
      mockRunSync.mockResolvedValue(undefined)
      mockAuditLogAdminAction.mockResolvedValue(undefined)
      const { req, res, next } = createMockReqResNext()

      await adminTriggerSync(req, res, next)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(mockAuditLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'TRIGGER_SYNC',
          resource: 'sync',
          resourceId: null,
          isAdminAction: true,
        }),
      )
      expect(mockRunSync).toHaveBeenCalledWith({ triggerType: 'manual', triggeredBy: 1 })
    })

    it('should return 409 when sync is already in progress', async () => {
      const syncingStatus = { status: 'syncing', lastSyncedAt: null, itemCount: null, errorMessage: null, errorCode: null }
      mockGetStatus.mockReturnValue(syncingStatus)
      const { req, res, next } = createMockReqResNext()

      await adminTriggerSync(req, res, next)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(syncingStatus)
      expect(mockAuditLogAdminAction).not.toHaveBeenCalled()
      expect(mockRunSync).not.toHaveBeenCalled()
    })

    it('should pass errors to next', async () => {
      const error = new Error('Unexpected error')
      mockGetStatus.mockImplementation(() => { throw error })
      const { req, res, next } = createMockReqResNext()

      await adminTriggerSync(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('updateSyncSchedule', () => {
    beforeEach(() => {
      mockSchedulerRestart.mockResolvedValue(undefined)
      mockSchedulerIsRunning.mockReturnValue(true)
      mockSchedulerGetSchedule.mockReturnValue('*/5 * * * *')
    })

    it('should update schedule and write an admin audit log entry', async () => {
      mockGetSyncCronSchedule.mockResolvedValue('*/15 * * * *')
      mockSetSyncCronSchedule.mockResolvedValue(undefined)
      mockAuditLogAdminAction.mockResolvedValue(undefined)

      const { req, res, next } = createMockReqResNext({
        body: { schedule: '*/5 * * * *' },
      })

      await updateSyncSchedule(req, res, next)

      expect(mockSetSyncCronSchedule).toHaveBeenCalledWith('*/5 * * * *')
      expect(mockSchedulerRestart).toHaveBeenCalled()
      expect(mockAuditLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'SYNC_SCHEDULE_UPDATED',
          resource: 'admin',
          resourceId: 'sync_cron_schedule',
          isAdminAction: true,
          details: expect.objectContaining({
            before: { schedule: '*/15 * * * *' },
            after: { schedule: '*/5 * * * *' },
            validated: true,
          }),
        }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: '*/5 * * * *', isRunning: true }),
      )
    })

    it('should write audit log BEFORE persisting the schedule change', async () => {
      mockGetSyncCronSchedule.mockResolvedValue('*/15 * * * *')
      mockSetSyncCronSchedule.mockResolvedValue(undefined)
      mockAuditLogAdminAction.mockResolvedValue(undefined)

      const callOrder: string[] = []
      mockAuditLogAdminAction.mockImplementation(async () => { callOrder.push('audit') })
      mockSetSyncCronSchedule.mockImplementation(async () => { callOrder.push('persist') })
      mockSchedulerRestart.mockImplementation(async () => { callOrder.push('restart') })

      const { req, res, next } = createMockReqResNext({
        body: { schedule: '*/5 * * * *' },
      })

      await updateSyncSchedule(req, res, next)

      expect(callOrder).toEqual(['audit', 'persist', 'restart'])
    })

    it('should not persist schedule if audit log fails', async () => {
      mockGetSyncCronSchedule.mockResolvedValue('*/15 * * * *')
      mockAuditLogAdminAction.mockRejectedValue(new Error('Audit DB down'))

      const { req, res, next } = createMockReqResNext({
        body: { schedule: '*/5 * * * *' },
      })

      await updateSyncSchedule(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(mockSetSyncCronSchedule).not.toHaveBeenCalled()
      expect(mockSchedulerRestart).not.toHaveBeenCalled()
    })
  })

  describe('getSyncHistory', () => {
    it('should return sync history with default limit', async () => {
      const history = [{ id: 1, status: 'success', triggerType: 'scheduled' }]
      mockListSyncHistory.mockResolvedValue(history)
      const { req, res, next } = createMockReqResNext()
      ;(req as unknown as Record<string, unknown>).query = {}

      await getSyncHistory(req, res, next)

      expect(mockListSyncHistory).toHaveBeenCalledWith({ limit: undefined })
      expect(res.json).toHaveBeenCalledWith(history)
    })

    it('should respect custom limit query param', async () => {
      mockListSyncHistory.mockResolvedValue([])
      const { req, res, next } = createMockReqResNext()
      ;(req as unknown as Record<string, unknown>).query = { limit: '10' }

      await getSyncHistory(req, res, next)

      expect(mockListSyncHistory).toHaveBeenCalledWith({ limit: 10 })
    })

    it('should clamp limit to 200', async () => {
      mockListSyncHistory.mockResolvedValue([])
      const { req, res, next } = createMockReqResNext()
      ;(req as unknown as Record<string, unknown>).query = { limit: '500' }

      await getSyncHistory(req, res, next)

      expect(mockListSyncHistory).toHaveBeenCalledWith({ limit: 200 })
    })

    it('should clamp limit to 1', async () => {
      mockListSyncHistory.mockResolvedValue([])
      const { req, res, next } = createMockReqResNext()
      ;(req as unknown as Record<string, unknown>).query = { limit: '0' }

      await getSyncHistory(req, res, next)

      expect(mockListSyncHistory).toHaveBeenCalledWith({ limit: 1 })
    })

    it('should ignore non-numeric limit', async () => {
      mockListSyncHistory.mockResolvedValue([])
      const { req, res, next } = createMockReqResNext()
      ;(req as unknown as Record<string, unknown>).query = { limit: 'abc' }

      await getSyncHistory(req, res, next)

      expect(mockListSyncHistory).toHaveBeenCalledWith({ limit: undefined })
    })

    it('should pass errors to next', async () => {
      const error = new Error('Database error')
      mockListSyncHistory.mockRejectedValue(error)
      const { req, res, next } = createMockReqResNext()
      ;(req as unknown as Record<string, unknown>).query = {}

      await getSyncHistory(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
