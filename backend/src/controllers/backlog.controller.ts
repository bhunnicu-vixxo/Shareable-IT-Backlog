import type { Request, Response, NextFunction } from 'express'
import { backlogService } from '../services/backlog/backlog.service.js'
import { logger } from '../utils/logger.js'

/** Linear IDs are UUIDs (v4). Validate before sending to the API. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Handle GET /api/backlog-items/:id
 *
 * Returns a single backlog item with its comments.
 * Returns 400 when the id is missing or malformed.
 * Returns 404 when the item does not exist.
 */
export const getBacklogItemById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        error: {
          message: 'Invalid or missing parameter: id must be a valid UUID.',
          code: 'INVALID_PARAMETER',
        },
      })
      return
    }

    logger.debug(
      { controller: 'backlog', handler: 'getBacklogItemById', id },
      'Handling GET /api/backlog-items/:id',
    )

    const result = await backlogService.getBacklogItemById(id)

    if (!result) {
      res.status(404).json({
        error: {
          message: 'Backlog item not found',
          code: 'NOT_FOUND',
        },
      })
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
}

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
