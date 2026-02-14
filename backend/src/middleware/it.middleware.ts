import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

/**
 * Middleware: requireIT
 * Checks that the authenticated user has IT or Admin privileges.
 * Must run AFTER requireAuth.
 * Returns 403 IT_OR_ADMIN_REQUIRED if neither IT nor admin.
 */
export function requireIT(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.isIT && !req.session.isAdmin) {
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
}
