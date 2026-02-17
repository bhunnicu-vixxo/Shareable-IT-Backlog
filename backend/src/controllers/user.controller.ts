import type { Request, Response, NextFunction } from 'express'
import { getUnseenCount, markSeen } from '../services/users/user.service.js'
import { logger } from '../utils/logger.js'

/**
 * Handle GET /api/user/unseen-count
 *
 * Returns the count of backlog items the authenticated user has not yet seen.
 * Requires authentication (session userId).
 */
export const getUserUnseenCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = Number(req.session.userId)

    logger.debug(
      { controller: 'user', handler: 'getUserUnseenCount', userId },
      'Handling GET /api/user/unseen-count',
    )

    const result = await getUnseenCount(userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Handle POST /api/user/mark-seen
 *
 * Updates the authenticated user's last_seen_at to the current timestamp,
 * marking all current backlog items as "seen."
 */
export const postMarkSeen = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = Number(req.session.userId)

    logger.debug(
      { controller: 'user', handler: 'postMarkSeen', userId },
      'Handling POST /api/user/mark-seen',
    )

    const result = await markSeen(userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
}
