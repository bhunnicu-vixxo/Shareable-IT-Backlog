/**
 * Frontend types for backlog data consumption.
 *
 * These are lean mirrors of the backend DTOs — they contain only
 * the fields the frontend needs. Internal IDs (assigneeId, projectId,
 * teamId) are omitted; the backend sends resolved names instead.
 */

/** Backlog item as returned by GET /api/backlog-items. */
export interface BacklogItem {
  id: string
  /** Linear identifier, e.g. "VIX-338" */
  identifier: string
  title: string
  description: string | null
  /** 0 = None, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low */
  priority: number
  /** Human-readable priority label */
  priorityLabel: string
  /** Workflow state name, e.g. "In Progress" */
  status: string
  /** Lifecycle classification: "backlog" | "unstarted" | "started" | "completed" | "cancelled" */
  statusType: string
  assigneeName: string | null
  projectName: string | null
  teamName: string
  labels: Label[]
  /** ISO 8601 datetime */
  createdAt: string
  /** ISO 8601 datetime */
  updatedAt: string
  /** ISO 8601 datetime or null */
  completedAt: string | null
  /** ISO 8601 date string or null */
  dueDate: string | null
  /** Linear's sort order for priority display */
  sortOrder: number
  /** Deep-link URL to the issue in Linear */
  url: string
}

export interface Label {
  id: string
  name: string
  color: string
}

/** Comment on a backlog item. */
export interface BacklogItemComment {
  id: string
  /** Markdown content */
  body: string
  /** ISO 8601 datetime */
  createdAt: string
  /** ISO 8601 datetime */
  updatedAt: string
  userName: string | null
}

/** Cursor-based pagination info matching Linear's model. */
export interface PaginationInfo {
  hasNextPage: boolean
  endCursor: string | null
}

/** Response from GET /api/backlog-items (paginated list). */
export interface BacklogListResponse {
  items: BacklogItem[]
  pageInfo: PaginationInfo
  totalCount: number
}

/** Response from GET /api/backlog-items/:id (detail view). */
export interface BacklogDetailResponse {
  item: BacklogItem
  comments: BacklogItemComment[]
}

/** Sync status as returned by the API. */
export interface SyncStatus {
  lastSyncedAt: string | null
  status: 'idle' | 'syncing' | 'success' | 'error'
  itemCount: number | null
  errorMessage: string | null
}
