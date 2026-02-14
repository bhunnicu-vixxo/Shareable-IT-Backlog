import type { Request, Response, NextFunction } from 'express'
import { getUserById } from '../services/auth/auth.service.js'
import { logger } from '../utils/logger.js'

/** Re-verify IT/admin role from the DB at most every 5 minutes. */
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Middleware: requireIT
 * Checks that the authenticated user has IT or Admin privileges.
 * Must run AFTER requireAuth.
 *
 * Uses cached role status from the session when available and fresh
 * (within ROLE_CACHE_TTL_MS). Falls back to a DB lookup when the
 * cache is stale or missing, and refreshes the session cache.
 *
 * Returns 403 IT_OR_ADMIN_REQUIRED if neither IT nor admin.
 */
export async function requireIT(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.session.userId)

    // Use cached session values when fresh
    const cachedAt = req.session.roleCheckedAt ?? 0
    const cacheIsFresh = Date.now() - cachedAt < ROLE_CACHE_TTL_MS
    let isIT = req.session.isIT
    let isAdmin = req.session.isAdmin

    if (!cacheIsFresh || isIT === undefined || isAdmin === undefined) {
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
      isIT = user.isIT
      isAdmin = user.isAdmin
      req.session.isIT = isIT
      req.session.isAdmin = isAdmin
      req.session.roleCheckedAt = Date.now()
    }

    if (!isIT && !isAdmin) {
      logger.warn({ userId: req.session.userId, path: req.path }, 'Non-IT user attempted IT action')
      res.status(403).json({
        error: {
          message: 'IT or Admin access required.',
          code: 'IT_OR_ADMIN_REQUIRED',
        },
      })
      return
    }
    next()
  } catch (err) {
    next(err)
  }
}
