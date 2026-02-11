import type { Request, Response, NextFunction } from 'express'
import { getUserById } from '../services/auth/auth.service.js'
import { logger } from '../utils/logger.js'

/** Re-verify approval status from the DB at most every 5 minutes. */
const APPROVAL_CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Middleware: requireAuth
 * Checks that a valid session with userId exists.
 * Returns 401 AUTH_REQUIRED if no session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    logger.warn({ path: req.path }, 'Unauthenticated request to protected route')
    res.status(401).json({
      error: {
        message: 'Authentication required. Please identify yourself.',
        code: 'AUTH_REQUIRED',
      },
    })
    return
  }
  next()
}

/**
 * Middleware: requireApproved
 * Checks that the authenticated user is approved and not disabled.
 * Must run AFTER requireAuth.
 *
 * Uses cached approval status from the session when available and fresh
 * (within APPROVAL_CACHE_TTL_MS). Falls back to a DB lookup when the
 * cache is stale or missing, and refreshes the session cache.
 *
 * Returns 403 USER_NOT_APPROVED if not approved.
 * Returns 403 USER_DISABLED if disabled.
 */
export async function requireApproved(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.session.userId)

    // Use cached session values when fresh
    const cachedAt = req.session.approvalCheckedAt ?? 0
    const cacheIsFresh = Date.now() - cachedAt < APPROVAL_CACHE_TTL_MS
    let isApproved = req.session.isApproved
    let isDisabled = req.session.isDisabled

    if (!cacheIsFresh || isApproved === undefined || isDisabled === undefined) {
      // Cache is stale or missing — verify from database
      const user = await getUserById(userId)

      if (!user) {
        logger.warn({ userId }, 'Session references non-existent user')
        req.session.destroy?.(() => {
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

      // Refresh session cache
      isApproved = user.isApproved
      isDisabled = user.isDisabled
      req.session.isApproved = isApproved
      req.session.isDisabled = isDisabled
      req.session.approvalCheckedAt = Date.now()
    }

    if (isDisabled) {
      logger.warn({ userId }, 'Disabled user attempted access')
      res.status(403).json({
        error: {
          message: 'Account has been disabled. Contact admin.',
          code: 'USER_DISABLED',
        },
      })
      return
    }

    if (!isApproved) {
      logger.warn({ userId }, 'Unapproved user attempted access')
      res.status(403).json({
        error: {
          message: 'Access pending admin approval.',
          code: 'USER_NOT_APPROVED',
        },
      })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}
