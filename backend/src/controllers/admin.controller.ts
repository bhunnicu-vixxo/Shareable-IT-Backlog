import type { Request, Response, NextFunction } from 'express'
import cron from 'node-cron'
import { getPendingUsers, approveUser, getAllUsers, disableUser, enableUser } from '../services/users/user.service.js'
import { syncService } from '../services/sync/sync.service.js'
import { syncScheduler } from '../services/sync/sync-scheduler.service.js'
import { listSyncHistory } from '../services/sync/sync-history.service.js'
import { getSyncCronSchedule, setSyncCronSchedule } from '../services/settings/app-settings.service.js'
import { auditService } from '../services/audit/audit.service.js'
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

    // Record admin action audit log (required compliance record).
    // statusCode is the intended response code (202 Accepted); if this audit insert
    // throws, the response won't be sent and the sync won't trigger.
    await auditService.logAdminAction({
      userId: adminId,
      action: 'TRIGGER_SYNC',
      resource: 'sync',
      resourceId: null,
      ipAddress: req.ip ?? '',
      isAdminAction: true,
      details: {
        triggerType: 'manual',
        statusCode: 202,
      },
    })

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

/**
 * GET /api/admin/settings/sync-schedule
 * Returns the current sync cron schedule and whether the scheduler is running.
 */
export async function getSyncSchedule(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await getSyncCronSchedule()
    res.json({
      schedule,
      isRunning: syncScheduler.isRunning(),
      activeSchedule: syncScheduler.getSchedule(),
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/settings/sync-schedule
 * Updates the sync cron schedule in the database and restarts the scheduler.
 *
 * Request body: `{ "schedule": "<cron expression>" }` (e.g. every 15 min)
 */
export async function updateSyncSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { schedule } = req.body as { schedule?: string }

    if (!schedule || typeof schedule !== 'string' || !schedule.trim()) {
      res.status(400).json({
        error: {
          message: 'Missing required field: schedule (cron expression)',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const trimmed = schedule.trim()

    if (trimmed.length > 200) {
      res.status(400).json({
        error: {
          message: 'Cron expression is too long (max 200 characters)',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    if (!cron.validate(trimmed)) {
      res.status(400).json({
        error: {
          message: `Invalid cron expression: "${trimmed}"`,
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const beforeSchedule = await getSyncCronSchedule()
    const adminId = Number(req.session.userId)

    // Write audit log BEFORE persisting — if audit fails the change must not proceed.
    // This satisfies the guardrail: "Admin action audit logs should be transactional
    // for state-changing admin operations."
    await auditService.logAdminAction({
      userId: adminId,
      action: 'SYNC_SCHEDULE_UPDATED',
      resource: 'admin',
      resourceId: 'sync_cron_schedule',
      ipAddress: req.ip ?? '',
      isAdminAction: true,
      details: {
        before: { schedule: beforeSchedule },
        after: { schedule: trimmed },
        validated: true,
      },
    })

    // Persist to database
    await setSyncCronSchedule(trimmed)

    // Restart the scheduler to pick up the new schedule
    await syncScheduler.restart()

    logger.info({ adminId, schedule: trimmed }, 'Admin updated sync schedule')

    res.json({
      schedule: trimmed,
      isRunning: syncScheduler.isRunning(),
      activeSchedule: syncScheduler.getSchedule(),
    })
  } catch (err) {
    next(err)
  }
}
