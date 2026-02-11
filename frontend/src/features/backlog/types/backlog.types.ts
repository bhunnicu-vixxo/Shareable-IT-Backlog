/**
 * Frontend types for backlog data consumption.
 *
 * These are lean mirrors of the backend DTOs — they contain only
 * the fields the frontend needs. Internal IDs (assigneeId, projectId,
 * teamId) are omitted; the backend sends resolved names instead.
 */

/** Backlog item as returned by GET /api/backlog-items. */
export type PriorityLabel = 'None' | 'Urgent' | 'High' | 'Normal' | 'Low'

export type WorkflowStateType =
  | 'backlog'
  | 'unstarted'
  | 'started'
  | 'completed'
  | 'cancelled'

export interface BacklogItem {
  id: string
  /** Linear identifier, e.g. "VIX-338" */
  identifier: string
  title: string
  description: string | null
  /** 0 = None, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low */
  priority: number
  /** Human-readable priority label */
  priorityLabel: PriorityLabel
  /** Workflow state name, e.g. "In Progress" */
  status: string
  /** Lifecycle classification: "backlog" | "unstarted" | "started" | "completed" | "cancelled" */
  statusType: WorkflowStateType
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
  /** Linear's general sort order */
  sortOrder: number
  /** Linear's sort order within the priority view */
  prioritySortOrder: number
  /** Deep-link URL to the issue in Linear */
  url: string
  /** Whether the item is considered "new" (recently created, needs prioritization) */
  isNew: boolean
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
  /** URL of the comment author's avatar, or null if unavailable */
  userAvatarUrl: string | null
  /** ID of the parent comment for threaded replies, or null for top-level comments */
  parentId: string | null
}

/** Type of activity change tracked in issue history. */
export type IssueActivityType =
  | 'state_change'
  | 'assignment'
  | 'priority_change'
  | 'label_added'
  | 'label_removed'
  | 'created'
  | 'archived'
  | 'other'

/** Activity history entry for a backlog item. */
export interface IssueActivity {
  id: string
  /** ISO 8601 datetime */
  createdAt: string
  /** Name of the user who made the change, or "System" for automated changes */
  actorName: string
  /** Categorisation of the change */
  type: IssueActivityType
  /** Human-readable description (e.g. "Status changed from Backlog to In Progress") */
  description: string
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
  activities: IssueActivity[]
}

/** Sync status as returned by the API. */
export interface SyncStatus {
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
