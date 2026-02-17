import type { Request, Response, NextFunction } from 'express'
import cron from 'node-cron'
import {
  getPendingUsers,
  approveUser,
  getAllUsers,
  disableUser,
  enableUser,
  updateUserITRole,
  rejectUser,
  removeUser,
  updateUserAdminRole,
} from '../services/users/user.service.js'
import {
  listAllLabels,
  updateLabelVisibility,
  bulkUpdateVisibility,
} from '../services/labels/label-visibility.service.js'
import { syncService } from '../services/sync/sync.service.js'
import { syncScheduler } from '../services/sync/sync-scheduler.service.js'
import { listSyncHistory } from '../services/sync/sync-history.service.js'
import {
  getSyncCronSchedule,
  setSyncCronSchedule,
} from '../services/settings/app-settings.service.js'
import { auditService } from '../services/audit/audit.service.js'
import { logger } from '../utils/logger.js'

/**
 * GET /api/admin/users/pending
 * Returns a list of users with is_approved = false and is_disabled = false.
 */
export async function listPendingUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function approveUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function listAllUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function disableUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function enableUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
 * PUT /api/admin/users/:id/it-role
 * Toggles a user's IT role. Body: { isIT: boolean }
 */
export async function updateUserITRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    const { isIT } = req.body as { isIT?: boolean }
    if (typeof isIT !== 'boolean') {
      res.status(400).json({
        error: {
          message: 'Missing required field: isIT (boolean)',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const adminId = Number(req.session.userId)
    const updatedUser = await updateUserITRole(userId, isIT, adminId, req.ip ?? '')

    logger.info({ userId, adminId, isIT }, 'Admin updated user IT role')

    res.json(updatedUser)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/users/:id/reject
 * Rejects a pending user. Sets is_disabled = true on a non-approved user.
 */
export async function rejectUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: { message: 'Invalid user ID', code: 'VALIDATION_ERROR' } })
      return
    }

    const adminId = Number(req.session.userId)
    const result = await rejectUser(userId, adminId, req.ip ?? '')

    logger.info({ userId, adminId }, 'Admin rejected pending user')

    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently removes a disabled user from the system (hard delete).
 */
export async function removeUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: { message: 'Invalid user ID', code: 'VALIDATION_ERROR' } })
      return
    }

    const adminId = Number(req.session.userId)
    const result = await removeUser(userId, adminId, req.ip ?? '')

    logger.info({ userId, adminId }, 'Admin permanently removed user')

    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/users/:id/admin-role
 * Promotes or demotes a user's admin role. Body: { isAdmin: boolean }
 */
export async function updateUserAdminRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    const { isAdmin } = req.body as { isAdmin?: boolean }
    if (typeof isAdmin !== 'boolean') {
      res.status(400).json({
        error: {
          message: 'Missing required field: isAdmin (boolean)',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const adminId = Number(req.session.userId)
    const updatedUser = await updateUserAdminRole(userId, isAdmin, adminId, req.ip ?? '')

    logger.info({ userId, adminId, isAdmin }, 'Admin updated user admin role')

    res.json(updatedUser)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/sync/trigger
 * Admin-protected manual sync trigger that captures triggeredBy.
 * Returns 202 Accepted with current status, or 409 if sync already running.
 */
export async function adminTriggerSync(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function getSyncHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function getSyncSchedule(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
export async function updateSyncSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

// ── Label Visibility Handlers ──────────────────────────────────────────

/**
 * GET /api/admin/settings/labels
 * Returns all labels with their visibility settings, item counts, and review status.
 * Item counts are computed from the in-memory sync cache (backlog data is not stored in DB).
 */
export async function getLabels(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const labels = await listAllLabels()

    // Compute item counts from the in-memory sync cache
    const cachedItems = syncService.getCachedItems()
    if (cachedItems && cachedItems.length > 0) {
      const countMap = new Map<string, number>()
      for (const item of cachedItems) {
        for (const label of item.labels) {
          countMap.set(label.name, (countMap.get(label.name) ?? 0) + 1)
        }
      }
      for (const entry of labels) {
        entry.itemCount = countMap.get(entry.labelName) ?? 0
      }
    }

    res.json(labels)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/settings/labels/:labelName
 * Updates a single label's visibility.
 * Body: { isVisible: boolean }
 */
export async function updateLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { labelName } = req.params
    if (!labelName || !labelName.trim()) {
      res.status(400).json({
        error: {
          message: 'Missing required parameter: labelName',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const { isVisible } = req.body as { isVisible?: boolean }
    if (typeof isVisible !== 'boolean') {
      res.status(400).json({
        error: {
          message: 'Missing required field: isVisible (boolean)',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const adminId = Number(req.session.userId)

    // NOTE: Express already decodes route params, so we use labelName directly
    // (no need to call decodeURIComponent, which would break labels containing '%')

    // Perform the update first — if the label doesn't exist, this throws LABEL_NOT_FOUND
    const updatedEntry = await updateLabelVisibility(labelName, isVisible, adminId)

    // Audit log AFTER successful state change to avoid false audit entries for failed updates
    await auditService.logAdminAction({
      userId: adminId,
      action: 'LABEL_VISIBILITY_UPDATED',
      resource: 'label_visibility',
      resourceId: labelName,
      ipAddress: req.ip ?? '',
      isAdminAction: true,
      details: {
        labelName,
        isVisible,
      },
    })

    logger.info({ adminId, labelName, isVisible }, 'Admin updated label visibility')

    res.json(updatedEntry)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/settings/labels/bulk
 * Bulk updates label visibility.
 * Body: { labels: [{ labelName: string, isVisible: boolean }] }
 */
export async function bulkUpdateLabels(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { labels } = req.body as { labels?: { labelName: string; isVisible: boolean }[] }

    if (!Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({
        error: {
          message: 'Missing required field: labels (non-empty array of { labelName, isVisible })',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    // Validate each entry
    for (const entry of labels) {
      if (!entry.labelName || typeof entry.labelName !== 'string') {
        res.status(400).json({
          error: {
            message: 'Each label entry must have a labelName (string)',
            code: 'VALIDATION_ERROR',
          },
        })
        return
      }
      if (typeof entry.isVisible !== 'boolean') {
        res.status(400).json({
          error: {
            message: `Label "${entry.labelName}" must have isVisible (boolean)`,
            code: 'VALIDATION_ERROR',
          },
        })
        return
      }
    }

    const adminId = Number(req.session.userId)

    // bulkUpdateVisibility handles its own transactional audit logging internally
    const updatedEntries = await bulkUpdateVisibility(labels, adminId, req.ip ?? '')

    logger.info(
      { adminId, labelCount: updatedEntries.length },
      'Admin bulk updated label visibility',
    )

    res.json(updatedEntries)
  } catch (err) {
    next(err)
  }
}

// NOTE: Public label routes are handled in labels.controller.ts (non-admin controller).
