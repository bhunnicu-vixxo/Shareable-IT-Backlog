/**
 * Audit logging business logic.
 *
 * - `logUserAccess` is NON-BLOCKING: errors are logged but never thrown,
 *   so audit failures never degrade user-facing requests.
 * - `getAuditLogs` delegates to the model for filtered, paginated queries.
 * - `cleanupExpiredLogs` removes entries older than the retention period.
 */

import {
  insertAuditLog,
  queryAuditLogs,
  deleteOldAuditLogs,
} from '../../models/audit-log.model.js'
import { logger } from '../../utils/logger.js'
import type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogQueryParams,
} from '../../types/audit.types.js'

const DEFAULT_RETENTION_DAYS = 365

export const auditService = {
  /**
   * Log a user access event. Non-blocking: catches and logs errors
   * but never throws, so the caller's request flow is unaffected.
   */
  async logUserAccess(entry: CreateAuditLogInput): Promise<void> {
    try {
      await insertAuditLog(entry)
    } catch (error) {
      // NON-BLOCKING: log error but never throw
      logger.error(
        { error, entry: { ...entry, details: undefined } },
        'Failed to write audit log',
      )
    }
  },

  /**
   * Log an admin action event.
   *
   * Unlike user access logging, admin action logging is treated as a required
   * compliance record. Failures should be surfaced to the caller so the
   * admin action can decide whether to proceed.
   */
  async logAdminAction(entry: CreateAuditLogInput): Promise<void> {
    await insertAuditLog(entry)
  },

  /**
   * Query audit logs with optional filtering and pagination.
   */
  async getAuditLogs(
    params: AuditLogQueryParams,
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    return queryAuditLogs(params)
  },

  /**
   * Delete audit log entries older than the retention period.
   * Defaults to 365 days if no custom value provided.
   *
   * @returns Number of deleted entries.
   */
  async cleanupExpiredLogs(
    retentionDays: number = DEFAULT_RETENTION_DAYS,
  ): Promise<number> {
    const count = await deleteOldAuditLogs(retentionDays)
    logger.info(
      { retentionDays, deletedCount: count },
      'Audit log cleanup completed',
    )
    return count
  },
}
