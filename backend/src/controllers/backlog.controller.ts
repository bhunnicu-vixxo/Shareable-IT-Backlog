import type { Request, Response, NextFunction } from 'express'
import { backlogService } from '../services/backlog/backlog.service.js'
import { logger } from '../utils/logger.js'

/**
 * Handle GET /api/backlog-items
 *
 * Query parameters:
 *  - projectId (optional): Override the default Linear project ID
 *  - first (optional): Page size (default 50)
 *  - after (optional): Pagination cursor
 */
export const getBacklogItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projectId = req.query.projectId as string | undefined
    const first = req.query.first ? Number(req.query.first) : undefined
    const after = req.query.after as string | undefined

    // Validate 'first' if provided
    if (first !== undefined && (isNaN(first) || first < 1 || first > 250)) {
      res.status(400).json({
        error: {
          message: 'Parameter "first" must be a number between 1 and 250.',
          code: 'INVALID_PARAMETER',
        },
      })
      return
    }

    logger.debug(
      { controller: 'backlog', handler: 'getBacklogItems', projectId, first, after },
      'Handling GET /api/backlog-items',
    )

    const result = await backlogService.getBacklogItems({
      projectId,
      first,
      after,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
}
