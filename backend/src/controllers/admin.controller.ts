import type { Request, Response, NextFunction } from 'express'
import { getPendingUsers, approveUser, getAllUsers, disableUser, enableUser } from '../services/users/user.service.js'
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
