/**
 * Audit logging types for tracking user access events.
 *
 * These types model the audit_logs table (migration 003) and provide
 * compile-time safety for audit service, middleware, and route layers.
 */

/** Actions captured by the audit logging middleware. */
export type AuditAction =
  | 'VIEW_BACKLOG'
  | 'VIEW_ITEM'
  | 'VIEW_ITEM_COMMENTS'
  | 'VIEW_ITEM_UPDATES'
  | 'SEARCH_BACKLOG'
  | 'FILTER_BACKLOG'
  | 'VIEW_ADMIN_DASHBOARD'
  | 'VIEW_SYNC_STATUS'
  | 'VIEW_USERS'
  | 'TRIGGER_SYNC'
  | 'API_ACCESS'

/** Resource categories targeted by audited actions. */
export type AuditResource =
  | 'backlog'
  | 'backlog_item'
  | 'user'
  | 'sync'
  | 'admin'
  | 'api'

/** A single audit log entry as stored in the database. */
export interface AuditLogEntry {
  id: number
  userId: number | null
  action: string
  resource: string | null
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  isAdminAction: boolean
  createdAt: string
}

/** Input for creating a new audit log entry. */
export interface CreateAuditLogInput {
  userId: number
  action: AuditAction | string
  resource: AuditResource | string
  resourceId: string | null
  ipAddress: string
  isAdminAction: boolean
  details: Record<string, unknown> | null
}

/** Query parameters for filtering and paginating audit logs. */
export interface AuditLogQueryParams {
  userId?: number
  action?: string
  resource?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}
