import type { Request, Response, NextFunction } from 'express'
import { backlogService } from '../services/backlog/backlog.service.js'
import { logger } from '../utils/logger.js'
import { setCacheHeaders } from '../middleware/cache-control.middleware.js'
import type { BacklogItemDto } from '../types/linear-entities.types.js'

/** Linear IDs are UUIDs (v4). Validate before sending to the API. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Allowed fields for the `?fields=` query parameter on GET /api/backlog-items.
 *
 * Whitelist approach: unknown fields are rejected with 400.
 * `id` is always included even if not explicitly requested (needed for keying).
 */
const ALLOWED_FIELDS: ReadonlySet<string> = new Set<string>([
  'id',
  'identifier',
  'title',
  'description',
  'priority',
  'priorityLabel',
  'status',
  'statusType',
  'assigneeId',
  'assigneeName',
  'projectId',
  'projectName',
  'teamId',
  'teamName',
  'labels',
  'createdAt',
  'updatedAt',
  'completedAt',
  'dueDate',
  'sortOrder',
  'prioritySortOrder',
  'url',
  'isNew',
])

/**
 * Pick only the requested fields from each backlog item.
 * Always includes `id` even if not explicitly requested.
 */
function pickFields(
  items: BacklogItemDto[],
  fields: string[],
): Partial<BacklogItemDto>[] {
  const fieldSet = new Set(fields)
  fieldSet.add('id') // Always include id for keying
  return items.map((item) =>
    Object.fromEntries(
      Object.entries(item).filter(([key]) => fieldSet.has(key)),
    ) as Partial<BacklogItemDto>,
  )
}

/**
 * Handle GET /api/backlog-items/:id
 *
 * Returns a single backlog item with its comments.
 * Returns 400 when the id is missing or malformed.
 * Returns 404 when the item does not exist.
 *
 * Cache-Control: no-cache (detail data may change frequently).
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

    // Detail endpoints use no-cache — data may change on next sync
    res.setHeader('Cache-Control', 'no-cache')
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
 *  - fields (optional): Comma-separated field names to include in response items
 *
 * When serving from sync cache:
 *  - Cache-Control: private, max-age=60, stale-while-revalidate=300
 *  - ETag header for conditional requests (If-None-Match → 304)
 *
 * When serving live (non-cached) data:
 *  - Cache-Control: no-cache
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
    const fieldsParam = req.query.fields as string | undefined

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

    // Validate 'fields' if provided — whitelist approach
    let requestedFields: string[] | undefined
    if (fieldsParam) {
      requestedFields = fieldsParam.split(',').map((f) => f.trim()).filter(Boolean)
      const unknownFields = requestedFields.filter((f) => !ALLOWED_FIELDS.has(f))
      if (unknownFields.length > 0) {
        res.status(400).json({
          error: {
            message: `Unknown field(s): ${unknownFields.join(', ')}. Allowed fields: ${[...ALLOWED_FIELDS].join(', ')}`,
            code: 'INVALID_PARAMETER',
          },
        })
        return
      }
    }

    logger.debug(
      { controller: 'backlog', handler: 'getBacklogItems', projectId, first, after, fields: fieldsParam },
      'Handling GET /api/backlog-items',
    )

    const result = await backlogService.getBacklogItems({
      projectId,
      first,
      after,
    })

    // Apply field selection if requested
    const responseItems = requestedFields
      ? pickFields(result.items, requestedFields)
      : result.items

    const responseBody = {
      items: responseItems,
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    }

    // Determine cache source: the service sets _servedFromCache on the result
    const servedFromCache = result._servedFromCache === true

    if (servedFromCache) {
      // Sync cache data — safe to cache at HTTP level
      const bodyJson = JSON.stringify(responseBody)
      const sent304 = setCacheHeaders(req, res, bodyJson, {
        cacheControl: 'private, max-age=60, stale-while-revalidate=300',
        etag: true,
      })
      if (sent304) {
        return
      }

      // Send pre-serialized JSON to avoid double serialization
      res.setHeader('Content-Type', 'application/json')
      res.send(bodyJson)
    } else {
      // Live data — do not cache (data may change on next sync)
      res.setHeader('Cache-Control', 'no-cache')
      res.json(responseBody)
    }
  } catch (error) {
    next(error)
  }
}
