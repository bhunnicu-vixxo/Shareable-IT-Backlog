/**
 * Admin-specific types for sync history and admin dashboard features.
 */

/** Sync history status values. */
export type SyncHistoryStatus = 'syncing' | 'success' | 'error' | 'partial'

/** How the sync was triggered. */
export type SyncTriggerType = 'scheduled' | 'manual' | 'startup'

/** A label visibility configuration entry as returned by GET /api/admin/settings/labels. */
export interface LabelVisibilityEntry {
  labelName: string
  isVisible: boolean
  showOnCards: boolean
  /** ISO 8601 datetime */
  firstSeenAt: string
  /** ISO 8601 datetime or null if unreviewed */
  reviewedAt: string | null
  /** ISO 8601 datetime */
  updatedAt: string
  updatedBy: number | null
  itemCount: number
}

/** A single sync history entry as returned by GET /api/admin/sync/history. */
export interface SyncHistoryEntry {
  id: number
  status: SyncHistoryStatus
  triggerType: SyncTriggerType
  triggeredBy: number | null
  /** ISO 8601 datetime */
  startedAt: string
  /** ISO 8601 datetime or null if still running */
  completedAt: string | null
  /** Duration in milliseconds or null if still running */
  durationMs: number | null
  itemsSynced: number
  itemsFailed: number
  errorMessage: string | null
  errorDetails: Record<string, unknown> | null
  /** ISO 8601 datetime */
  createdAt: string
}
