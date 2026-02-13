/**
 * Database access layer for the audit_logs table.
 *
 * Uses parameterized queries via the shared database utility.
 * The audit_logs table and indexes already exist (migration 003, 005, 008).
 */

import { query } from '../utils/database.js'
import type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogQueryParams,
} from '../types/audit.types.js'

/**
 * Insert a new audit log entry.
 *
 * Maps camelCase input to snake_case database columns.
 */
export async function insertAuditLog(
  entry: CreateAuditLogInput,
): Promise<AuditLogEntry> {
  const result = await query(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, action, resource, resource_id, details, ip_address, is_admin_action, created_at`,
    [
      entry.userId,
      entry.action,
      entry.resource,
      entry.resourceId,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress,
      entry.isAdminAction,
    ],
  )

  return mapRowToEntry(result.rows[0])
}

/**
 * Query audit logs with optional filtering and pagination.
 *
 * Supports filtering by userId, action, resource, and date range.
 * Returns paginated results with total count.
 */
export async function queryAuditLogs(
  params: AuditLogQueryParams,
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (params.userId !== undefined) {
    conditions.push(`user_id = $${paramIndex}`)
    values.push(params.userId)
    paramIndex++
  }

  if (params.action !== undefined) {
    conditions.push(`action = $${paramIndex}`)
    values.push(params.action)
    paramIndex++
  }

  if (params.resource !== undefined) {
    conditions.push(`resource = $${paramIndex}`)
    values.push(params.resource)
    paramIndex++
  }

  if (params.startDate !== undefined) {
    conditions.push(`created_at >= $${paramIndex}`)
    values.push(params.startDate)
    paramIndex++
  }

  if (params.endDate !== undefined) {
    conditions.push(`created_at <= $${paramIndex}`)
    values.push(params.endDate)
    paramIndex++
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`,
    values,
  )
  const total = Number(countResult.rows[0].total)

  // Get paginated results
  const page = params.page ?? 1
  const limit = params.limit ?? 50
  const offset = (page - 1) * limit

  const dataResult = await query(
    `SELECT id, user_id, action, resource, resource_id, details, ip_address, is_admin_action, created_at
     FROM audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset],
  )

  return {
    logs: dataResult.rows.map(mapRowToEntry),
    total,
  }
}

/**
 * Delete audit log entries older than the specified retention period.
 *
 * @returns Number of rows deleted.
 */
export async function deleteOldAuditLogs(
  retentionDays: number,
): Promise<number> {
  const result = await query(
    `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
    [retentionDays],
  )

  return result.rowCount ?? 0
}

/** Map a database row (snake_case) to an AuditLogEntry (camelCase). */
function mapRowToEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as number,
    userId: row.user_id as number | null,
    action: row.action as string,
    resource: row.resource as string | null,
    resourceId: row.resource_id as string | null,
    details: row.details as Record<string, unknown> | null,
    ipAddress: row.ip_address as string | null,
    isAdminAction: row.is_admin_action as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  }
}
