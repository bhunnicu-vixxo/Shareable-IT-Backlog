/**
 * HTTP handler for querying audit logs.
 *
 * Admin-only: protected by requireAuth + requireApproved + requireAdmin
 * in the route definition.
 */

import type { Request, Response, NextFunction } from 'express'
import { auditService } from '../services/audit/audit.service.js'

/**
 * GET /api/admin/audit-logs
 *
 * Query params:
 *   - userId    (number)  — filter by user ID
 *   - action    (string)  — filter by action type
 *   - resource  (string)  — filter by resource type
 *   - isAdminAction (boolean) — filter by admin action logs
 *   - startDate (ISO string) — filter logs created on or after
 *   - endDate   (ISO string) — filter logs created on or before
 *   - page      (number, default 1)
 *   - limit     (number, default 50, max 200)
 */
export async function getAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Parse and validate query params
    const userId = parseOptionalInt(req.query.userId)
    const action = parseOptionalString(req.query.action)
    const resource = parseOptionalString(req.query.resource)
    const isAdminActionResult = parseOptionalBoolean(req.query.isAdminAction)
    const startDate = parseOptionalString(req.query.startDate)
    const endDate = parseOptionalString(req.query.endDate)

    let page = parseOptionalInt(req.query.page) ?? 1
    let limit = parseOptionalInt(req.query.limit) ?? 50

    // Validate numeric params
    if (userId !== undefined && (isNaN(userId) || userId <= 0)) {
      res.status(400).json({
        error: { message: 'Invalid userId parameter', code: 'VALIDATION_ERROR' },
      })
      return
    }

    if (isAdminActionResult.valid === false) {
      res.status(400).json({
        error: {
          message: 'Invalid isAdminAction parameter — use true or false',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const isAdminAction = isAdminActionResult.value

    if (isNaN(page)) {
      res.status(400).json({
        error: { message: 'Invalid page parameter', code: 'VALIDATION_ERROR' },
      })
      return
    }

    if (isNaN(limit)) {
      res.status(400).json({
        error: { message: 'Invalid limit parameter', code: 'VALIDATION_ERROR' },
      })
      return
    }

    if (page < 1) page = 1
    if (limit < 1) limit = 1
    if (limit > 200) limit = 200

    // Validate date params (basic ISO 8601 check)
    if (startDate !== undefined && isNaN(Date.parse(startDate))) {
      res.status(400).json({
        error: { message: 'Invalid startDate parameter — use ISO 8601 format', code: 'VALIDATION_ERROR' },
      })
      return
    }

    if (endDate !== undefined && isNaN(Date.parse(endDate))) {
      res.status(400).json({
        error: { message: 'Invalid endDate parameter — use ISO 8601 format', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const result = await auditService.getAuditLogs({
      userId,
      action,
      resource,
      isAdminAction,
      startDate,
      endDate,
      page,
      limit,
    })

    res.json({
      logs: result.logs,
      total: result.total,
      page,
      limit,
    })
  } catch (err) {
    next(err)
  }
}

/** Parse an optional query param as an integer, returning undefined if absent. */
function parseOptionalInt(
  value: unknown,
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return NaN
  return parsed
}

/** Parse an optional query param as a trimmed string, returning undefined if absent. */
function parseOptionalString(
  value: unknown,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return String(value).trim()
}

/**
 * Parse an optional query param as a boolean.
 *
 * Returns a result object:
 * - `{ valid: true, value: boolean | undefined }` for absent, "true", or "false"
 * - `{ valid: false }` when present but not a recognized boolean string
 */
function parseOptionalBoolean(
  value: unknown,
): { valid: true; value: boolean | undefined } | { valid: false } {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined }
  }
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true') return { valid: true, value: true }
  if (normalized === 'false') return { valid: true, value: false }
  return { valid: false }
}
