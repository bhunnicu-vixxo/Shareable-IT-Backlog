import type { Request, Response, NextFunction } from 'express'
import { getPendingUsers, approveUser, getAllUsers, disableUser, enableUser } from '../services/users/user.service.js'
import { syncService } from '../services/sync/sync.service.js'
import { listSyncHistory } from '../services/sync/sync-history.service.js'
import { logger } from '../utils/logger.js'

/**
 * GET /api/admin/users/pending
 * Returns a list of users with is_approved = false and is_disabled = false.
 */
export async function listPendingUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pendingUsers = await getPendingUsers()
    res.json(pendingUsers)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/users/:id/approve
 * Approves a pending user. Sets is_approved = true, records approved_at and approved_by.
 */
export async function approveUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({
        error: {
          message: 'Invalid user ID',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const adminId = Number(req.session.userId)
    const approvedUser = await approveUser(userId, adminId, req.ip ?? '')

    logger.info({ userId, adminId }, 'Admin approved user')

    res.json(approvedUser)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/users
 * Returns a list of ALL users (approved, pending, disabled) for admin management.
 */
export async function listAllUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await getAllUsers()
    res.json(users)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/users/:id/disable
 * Disables a user's access. Cannot be used to disable the admin's own account.
 */
export async function disableUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: { message: 'Invalid user ID', code: 'VALIDATION_ERROR' } })
      return
    }

    const adminId = Number(req.session.userId)
    const result = await disableUser(userId, adminId, req.ip ?? '')
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/users/:id/enable
 * Re-enables a previously disabled user.
 */
export async function enableUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: { message: 'Invalid user ID', code: 'VALIDATION_ERROR' } })
      return
    }

    const adminId = Number(req.session.userId)
    const result = await enableUser(userId, adminId, req.ip ?? '')
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/sync/trigger
 * Admin-protected manual sync trigger that captures triggeredBy.
 * Returns 202 Accepted with current status, or 409 if sync already running.
 */
export async function adminTriggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentStatus = syncService.getStatus()

    if (currentStatus.status === 'syncing') {
      res.status(409).json(currentStatus)
      return
    }

    const adminId = Number(req.session.userId)

    // Fire-and-forget: start sync, don't await
    syncService.runSync({ triggerType: 'manual', triggeredBy: adminId }).catch((error) => {
      logger.error({ service: 'sync', error }, 'Admin manual sync trigger failed')
    })

    // Return 202 with status (runSync sets status synchronously at start)
    res.status(202).json(syncService.getStatus())
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/sync/history
 * Returns sync history entries (newest-first). Accepts optional ?limit= query param.
 */
export async function getSyncHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawLimit = req.query.limit
    let limit: number | undefined
    if (rawLimit !== undefined) {
      const parsed = Number(rawLimit)
      if (!isNaN(parsed) && Number.isInteger(parsed)) {
        limit = Math.max(1, Math.min(parsed, 200))
      }
    }

    const history = await listSyncHistory({ limit })
    res.json(history)
  } catch (err) {
    next(err)
  }
}
