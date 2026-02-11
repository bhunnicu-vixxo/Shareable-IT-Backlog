import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

/**
 * Middleware: requireAdmin
 * Checks that the authenticated user has admin privileges.
 * Must run AFTER requireAuth.
 * Returns 403 ADMIN_REQUIRED if not admin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.isAdmin) {
    logger.warn({ userId: req.session.userId, path: req.path }, 'Non-admin attempted admin action')
    res.status(403).json({
      error: {
        message: 'Admin access required.',
        code: 'ADMIN_REQUIRED',
      },
    })
    return
  }
  next()
}
