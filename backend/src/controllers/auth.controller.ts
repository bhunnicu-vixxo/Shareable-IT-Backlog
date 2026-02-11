import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod/v4'
import { lookupOrCreateUser, getUserById, updateLastAccess } from '../services/auth/auth.service.js'
import { logger } from '../utils/logger.js'

const identifySchema = z.object({
  email: z.string().email('A valid email address is required'),
})

/**
 * POST /api/auth/identify
 * Submit email to identify user. Creates user if not found, creates session.
 */
export async function identify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = identifySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          message: parsed.error.issues[0]?.message ?? 'Invalid email address',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const user = await lookupOrCreateUser(parsed.data.email)

    // Create session with cached approval status
    req.session.userId = String(user.id)
    req.session.isAdmin = user.isAdmin
    req.session.isApproved = user.isApproved
    req.session.isDisabled = user.isDisabled
    req.session.approvalCheckedAt = Date.now()

    // Update last access for approved users
    if (user.isApproved && !user.isDisabled) {
      await updateLastAccess(user.id)
    }

    logger.info({ userId: user.id, email: user.email }, 'User identified and session created')

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      isDisabled: user.isDisabled,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 * Returns the current user's profile from their session.
 * Also updates last_access_at for approved users (AC2).
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.session.userId) {
      res.status(401).json({
        error: {
          message: 'Authentication required. Please identify yourself.',
          code: 'AUTH_REQUIRED',
        },
      })
      return
    }

    const user = await getUserById(Number(req.session.userId))
    if (!user) {
      // Session references a user that no longer exists — destroy session
      req.session.destroy(() => {
        /* no-op */
      })
      res.status(401).json({
        error: {
          message: 'Authentication required. Please identify yourself.',
          code: 'AUTH_REQUIRED',
        },
      })
      return
    }

    // Update last access timestamp for approved, non-disabled users (AC2)
    if (user.isApproved && !user.isDisabled) {
      updateLastAccess(user.id).catch((err) => {
        logger.warn({ err, userId: user.id }, 'Failed to update last_access_at (non-blocking)')
      })
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
      isDisabled: user.isDisabled,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/logout
 * Destroys the session and clears the cookie.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.session.destroy((err) => {
      if (err) {
        logger.warn({ err }, 'Failed to destroy session during logout')
        next(err)
        return
      }
      res.clearCookie('slb.sid')
      res.json({ message: 'Logged out successfully' })
    })
  } catch (err) {
    next(err)
  }
}
