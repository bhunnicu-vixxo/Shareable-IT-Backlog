/**
 * Shared API response types.
 *
 * Includes cursor-based pagination (matching Linear's model),
 * standard error responses, and sync status shapes.
 */

import type {
  BacklogItemDto,
  CommentDto,
  IssueActivityDto,
} from './linear-entities.types.js'

/** Cursor-based pagination info matching Linear's model. */
export interface PaginationInfo {
  hasNextPage: boolean
  endCursor: string | null
}

/** Paginated list response wrapper. */
export interface PaginatedResponse<T> {
  items: T[]
  pageInfo: PaginationInfo
  totalCount: number
}

/** Backlog detail response shape. */
export interface BacklogDetailResponse {
  item: BacklogItemDto
  comments: CommentDto[]
  activities: IssueActivityDto[]
}

/** Standard API error response (matches error.middleware.ts). */
export interface ApiErrorResponse {
  error: {
    message: string
    code: string
    details?: unknown
  }
}

/** Sync status response shape. */
export interface SyncStatusResponse {
  /** ISO 8601 datetime or null if never synced */
  lastSyncedAt: string | null
  status: 'idle' | 'syncing' | 'success' | 'error' | 'partial'
  itemCount: number | null
  errorMessage: string | null
  /** Standardized error classification code (e.g. SYNC_API_UNAVAILABLE), or null when no error */
  errorCode: string | null
  /** Count of successfully synced items, or null when not applicable */
  itemsSynced: number | null
  /** Count of items that failed to transform, or null when not applicable */
  itemsFailed: number | null
}

/** Sync history status values stored in the sync_history table. */
export type SyncHistoryStatus = 'syncing' | 'success' | 'error' | 'partial'

/** How the sync was triggered. */
export type SyncTriggerType = 'scheduled' | 'manual' | 'startup'

/** A single sync history entry returned by the admin API. */
export interface SyncHistoryEntry {
  id: number
  status: SyncHistoryStatus
  triggerType: SyncTriggerType
  triggeredBy: number | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  itemsSynced: number
  itemsFailed: number
  errorMessage: string | null
  errorDetails: Record<string, unknown> | null
  createdAt: string
}
