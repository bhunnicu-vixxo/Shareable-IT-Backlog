/**
 * Backend DTO interfaces for Linear entity data.
 *
 * These are flat, JSON-safe types used for API responses.
 * All fields use camelCase naming and JSON-safe primitives
 * (string, number, boolean, null). No Date objects — always ISO 8601 strings.
 *
 * SDK class instances (with lazy-loading getters) are converted to these
 * DTOs via the transformer module (linear-transformers.ts).
 */

/** Flattened, API-safe representation of a Linear label. */
export interface LabelDto {
  id: string
  name: string
  color: string
}

export type PriorityLabel = 'None' | 'Urgent' | 'High' | 'Normal' | 'Low'

export type WorkflowStateType =
  | 'backlog'
  | 'unstarted'
  | 'started'
  | 'completed'
  | 'cancelled'

/** Flattened, API-safe representation of a Linear Issue (backlog item). */
export interface BacklogItemDto {
  id: string
  /** Linear identifier, e.g. "VIX-338" */
  identifier: string
  title: string
  description: string | null
  /** 0 = None, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low */
  priority: number
  /** Human-readable priority label: "Urgent" | "High" | "Normal" | "Low" | "None" */
  priorityLabel: PriorityLabel
  /** Workflow state name, e.g. "In Progress" */
  status: string
  /** WorkflowState type: "backlog" | "unstarted" | "started" | "completed" | "cancelled" */
  statusType: WorkflowStateType
  assigneeId: string | null
  assigneeName: string | null
  projectId: string | null
  projectName: string | null
  teamId: string
  teamName: string
  labels: LabelDto[]
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
  /** Whether the item is considered "new" (created within configurable threshold) */
  isNew: boolean
}

/** Flattened, API-safe representation of a Linear Comment. */
export interface CommentDto {
  id: string
  /** Markdown content */
  body: string
  /** ISO 8601 datetime */
  createdAt: string
  /** ISO 8601 datetime */
  updatedAt: string
  userId: string | null
  userName: string | null
  /** URL of the comment author's avatar, or null if unavailable */
  userAvatarUrl: string | null
  /** ID of the parent comment for threaded replies, or null for top-level comments */
  parentId: string | null
}

/** Flattened, API-safe representation of a Linear Project. */
export interface ProjectDto {
  id: string
  name: string
  description: string | null
  state: string
  url: string
}

/** Flattened, API-safe representation of a Linear Team. */
export interface TeamDto {
  id: string
  name: string
  /** Team key, e.g. "VIX" */
  key: string
}

/** Flattened, API-safe representation of a Linear User. */
export interface UserDto {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  active: boolean
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

/** Flattened, API-safe representation of a Linear Issue history entry. */
export interface IssueActivityDto {
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

/** Flattened, API-safe representation of a Linear WorkflowState. */
export interface WorkflowStateDto {
  id: string
  name: string
  type: WorkflowStateType
  position: number
  color: string
  description: string | null
}
