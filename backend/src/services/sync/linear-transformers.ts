/**
 * SDK-to-DTO transformer module.
 *
 * Converts `@linear/sdk` lazy-loading class instances into flat, JSON-safe
 * DTO objects suitable for API responses. All lazy SDK relations are resolved
 * once here so downstream consumers work with plain data.
 */

import type {
  Comment,
  Issue,
  IssueHistory,
  Project,
  Team,
  User,
  WorkflowState,
} from '@linear/sdk'

import type {
  BacklogItemDto,
  CommentDto,
  IssueActivityDto,
  IssueActivityType,
  LabelDto,
  PriorityLabel,
  ProjectDto,
  TeamDto,
  UserDto,
  WorkflowStateType,
  WorkflowStateDto,
} from '../../types/linear-entities.types.js'

import { logger } from '../../utils/logger.js'

/** Describes a single item that failed to transform from SDK Issue to DTO. */
export interface TransformFailure {
  issueId: string
  identifier: string
  error: string
}

/** Result of a resilient batch transformation — successful items + failures. */
export interface TransformResult {
  items: BacklogItemDto[]
  failures: TransformFailure[]
}

/**
 * Maps Linear SDK priority number (0-4) to human-readable label.
 *
 * | SDK value | Label   |
 * |-----------|---------|
 * | 0         | None    |
 * | 1         | Urgent  |
 * | 2         | High    |
 * | 3         | Normal  |
 * | 4         | Low     |
 */
const PRIORITY_LABELS: Record<number, PriorityLabel> = {
  0: 'None',
  1: 'Urgent',
  2: 'High',
  3: 'Normal',
  4: 'Low',
}

/** Number of days within which an item is considered "new". */
const raw = parseInt(process.env.NEW_ITEM_DAYS_THRESHOLD ?? '7', 10)
const NEW_ITEM_DAYS = Number.isFinite(raw) && raw >= 0 ? raw : 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Determine whether an item is "new" based on its creation date.
 * Items created within the last N days (configurable via NEW_ITEM_DAYS_THRESHOLD
 * env var, default 7) are considered new.
 * Boundary: items created exactly N days ago are not new (strict < comparison).
 */
function isItemNew(createdAt: Date): boolean {
  return (Date.now() - createdAt.getTime()) < NEW_ITEM_DAYS * MS_PER_DAY
}

const VALID_WORKFLOW_STATE_TYPES: WorkflowStateType[] = [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled',
]

function getPriorityLabel(priority: number): PriorityLabel {
  return PRIORITY_LABELS[priority] ?? 'None'
}

function normalizeWorkflowStateType(value: unknown): WorkflowStateType {
  if (VALID_WORKFLOW_STATE_TYPES.includes(value as WorkflowStateType)) {
    return value as WorkflowStateType
  }
  return 'backlog'
}

/**
 * Derive a short display name for assignee. Prefers name when it doesn't look
 * like an email. When name is an email (e.g. robert.hunnicutt@vixxo.com),
 * formats the local part as "Robert Hunnicutt" to avoid wrapping and improve readability.
 */
function formatAssigneeDisplayName(name: string | null, email: string | null): string | null {
  const raw = name ?? email
  if (!raw) return null
  // If it doesn't look like an email, use as-is (proper name from Linear)
  if (!raw.includes('@')) return raw
  // Format email: "robert.hunnicutt@vixxo.com" → "Robert Hunnicutt"
  const localPart = raw.split('@')[0] ?? ''
  const withSpaces = localPart.replace(/[._]/g, ' ')
  const titleCase = withSpaces
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ')
  return titleCase || raw
}

/**
 * Convert a single SDK Issue to a BacklogItemDto.
 *
 * Resolves all lazy-loading SDK relations (state, assignee, project, team, labels).
 * Dates are serialised to ISO 8601 strings. Missing optional values become `null`.
 */
export async function toBacklogItemDto(issue: Issue): Promise<BacklogItemDto> {
  // Resolve lazy-loading SDK relations in parallel where possible
  const [state, assignee, project, team, labelsConnection] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.project,
    issue.team,
    issue.labels(),
  ])

  const labels: LabelDto[] = labelsConnection.nodes.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
  }))

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? null,
    priority: issue.priority,
    priorityLabel: getPriorityLabel(issue.priority),
    status: state?.name ?? 'Unknown',
    statusType: normalizeWorkflowStateType(state?.type),
    assigneeId: assignee?.id ?? null,
    assigneeName: formatAssigneeDisplayName(
      assignee?.name ?? null,
      assignee?.email ?? null,
    ),
    projectId: project?.id ?? null,
    projectName: project?.name ?? null,
    teamId: team?.id ?? '',
    teamName: team?.name ?? '',
    labels,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    completedAt: issue.completedAt ? issue.completedAt.toISOString() : null,
    dueDate: issue.dueDate ?? null,
    sortOrder: issue.sortOrder,
    prioritySortOrder: issue.prioritySortOrder,
    url: issue.url,
    isNew: isItemNew(issue.createdAt),
  }
}

/**
 * Convert a single SDK Comment to a CommentDto.
 *
 * Resolves the lazy `comment.user` and `comment.parent` relations in parallel.
 * Parent resolution supports threaded comment display (parentId).
 * Avatar URL is extracted from the user relation.
 */
export async function toCommentDto(comment: Comment): Promise<CommentDto> {
  // Resolve user and parent in parallel — catch for deleted parent/user
  const [user, parent] = await Promise.all([
    Promise.resolve(comment.user).catch(() => undefined),
    Promise.resolve(comment.parent).catch(() => undefined),
  ])

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    userId: user?.id ?? null,
    userName: user?.name ?? null,
    userAvatarUrl: user?.avatarUrl ?? null,
    parentId: parent?.id ?? null,
  }
}

/**
 * Convert an SDK Project to a ProjectDto.
 * No lazy fields need resolving.
 */
export function toProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    state: project.state,
    url: project.url,
  }
}

/**
 * Convert an SDK Team to a TeamDto.
 * No lazy fields need resolving.
 */
export function toTeamDto(team: Team): TeamDto {
  return {
    id: team.id,
    name: team.name,
    key: team.key,
  }
}

/**
 * Convert an SDK User to a UserDto.
 * No lazy fields need resolving.
 */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    active: user.active,
  }
}

/**
 * Convert an SDK WorkflowState to a WorkflowStateDto.
 * No lazy fields need resolving.
 */
export function toWorkflowStateDto(state: WorkflowState): WorkflowStateDto {
  return {
    id: state.id,
    name: state.name,
    type: normalizeWorkflowStateType(state.type),
    position: state.position,
    color: state.color,
    description: state.description ?? null,
  }
}

/* ------------------------------------------------------------------ */
/*  Issue history → IssueActivityDto transformers                      */
/* ------------------------------------------------------------------ */

/** Resolved lazy-loading relations for an IssueHistory entry. */
interface ResolvedHistoryRelations {
  actor: User | null | undefined
  fromState: WorkflowState | null | undefined
  toState: WorkflowState | null | undefined
  fromAssignee: User | null | undefined
  toAssignee: User | null | undefined
  addedLabels: Array<{ name: string }> | null | undefined
  removedLabels: Array<{ name: string }> | null | undefined
}

function isCreatedHistoryEntry(entry: IssueHistory): boolean {
  const e = entry as unknown as Record<string, unknown>
  const action = e.action
  const type = e.type
  const created = e.created
  return (
    created === true ||
    action === 'create' ||
    action === 'created' ||
    type === 'create' ||
    type === 'created'
  )
}

function normalizeLabelList(value: unknown): Array<{ name: string }> {
  if (!value) return []
  // Some SDK shapes may expose `nodes` (connection)
  if (typeof value === 'object' && value !== null && 'nodes' in value) {
    const nodes = (value as { nodes?: unknown }).nodes
    if (Array.isArray(nodes)) {
      return nodes.filter((n): n is { name: string } => !!n && typeof (n as { name?: unknown }).name === 'string')
    }
  }
  // Or it may already be an array of label-like objects
  if (Array.isArray(value)) {
    return value.filter((n): n is { name: string } => !!n && typeof (n as { name?: unknown }).name === 'string')
  }
  return []
}

/**
 * Determine whether a history entry represents a change relevant to
 * business users.  Internal / noisy changes (sort order, subscriber
 * changes, metadata-only) are filtered out.
 */
function isRelevantActivity(
  entry: IssueHistory,
  resolved: ResolvedHistoryRelations,
): boolean {
  // Issue creation
  if (isCreatedHistoryEntry(entry)) return true
  // State changes
  if (resolved.fromState || resolved.toState) return true
  // Assignment changes
  if (resolved.fromAssignee || resolved.toAssignee) return true
  // Priority changes
  if (entry.fromPriority !== undefined && entry.fromPriority !== null) return true
  if (entry.toPriority !== undefined && entry.toPriority !== null) return true
  // Label changes
  if (entry.addedLabelIds?.length) return true
  if (entry.removedLabelIds?.length) return true
  if (resolved.addedLabels?.length) return true
  if (resolved.removedLabels?.length) return true
  // Archival
  if (entry.archived !== undefined && entry.archived !== null) return true
  // Everything else is internal noise
  return false
}

/**
 * Classify the type of activity change for categorisation and display.
 */
function classifyActivityType(
  entry: IssueHistory,
  resolved: ResolvedHistoryRelations,
): IssueActivityType {
  if (isCreatedHistoryEntry(entry)) return 'created'
  if (resolved.fromState || resolved.toState) return 'state_change'
  if (resolved.fromAssignee || resolved.toAssignee) return 'assignment'
  if (
    (entry.fromPriority !== undefined && entry.fromPriority !== null) ||
    (entry.toPriority !== undefined && entry.toPriority !== null)
  ) return 'priority_change'
  if (entry.addedLabelIds?.length || resolved.addedLabels?.length) return 'label_added'
  if (entry.removedLabelIds?.length || resolved.removedLabels?.length) return 'label_removed'
  if (entry.archived !== undefined && entry.archived !== null) return 'archived'
  return 'other'
}

/**
 * Build a human-readable description of a history change.
 *
 * Uses resolved relation names instead of raw IDs to provide
 * business-friendly language.
 */
function buildActivityDescription(
  entry: IssueHistory,
  resolved: ResolvedHistoryRelations,
): string {
  const actorName = resolved.actor?.name ?? 'System'

  // Creation
  if (isCreatedHistoryEntry(entry)) return 'Issue created'

  // State changes
  if (resolved.fromState || resolved.toState) {
    const from = resolved.fromState?.name ?? 'Unknown'
    const to = resolved.toState?.name ?? 'Unknown'
    return `Status changed from ${from} to ${to}`
  }

  // Assignment changes
  if (resolved.toAssignee) {
    return `Assigned to ${resolved.toAssignee.name}`
  }
  if (resolved.fromAssignee && !resolved.toAssignee) {
    return `Unassigned from ${resolved.fromAssignee.name}`
  }

  // Priority changes
  if (
    (entry.fromPriority !== undefined && entry.fromPriority !== null) ||
    (entry.toPriority !== undefined && entry.toPriority !== null)
  ) {
    const from = getPriorityLabel(entry.fromPriority ?? 0)
    const to = getPriorityLabel(entry.toPriority ?? 0)
    return `Priority changed from ${from} to ${to}`
  }

  // Label changes
  if (resolved.addedLabels?.length) {
    const names = resolved.addedLabels.map((l) => l.name).join(', ')
    return `Label added: ${names}`
  }
  if (resolved.removedLabels?.length) {
    const names = resolved.removedLabels.map((l) => l.name).join(', ')
    return `Label removed: ${names}`
  }
  if (entry.addedLabelIds?.length) return 'Label added'
  if (entry.removedLabelIds?.length) return 'Label removed'

  // Archival
  if (entry.archived === true) return 'Item archived'
  if (entry.archived === false) return 'Item unarchived'

  // Fallback
  return `Updated by ${actorName}`
}

/**
 * Convert a single SDK IssueHistory entry to an IssueActivityDto.
 *
 * Resolves all lazy-loading SDK relations in parallel, then builds
 * a human-readable description of the change.
 */
export async function toIssueActivityDto(
  entry: IssueHistory,
): Promise<IssueActivityDto | null> {
  // Resolve lazy relations in parallel — catch errors to avoid breaking
  // on deleted users or states
  const [
    actor,
    fromState,
    toState,
    fromAssignee,
    toAssignee,
    addedLabelsRaw,
    removedLabelsRaw,
  ] = await Promise.all([
    Promise.resolve(entry.actor as unknown).catch(() => null),
    Promise.resolve(entry.fromState as unknown).catch(() => null),
    Promise.resolve(entry.toState as unknown).catch(() => null),
    Promise.resolve(entry.fromAssignee as unknown).catch(() => null),
    Promise.resolve(entry.toAssignee as unknown).catch(() => null),
    Promise.resolve((entry as unknown as { addedLabels?: unknown }).addedLabels).catch(() => null),
    Promise.resolve((entry as unknown as { removedLabels?: unknown }).removedLabels).catch(() => null),
  ])

  const resolved: ResolvedHistoryRelations = {
    actor: actor as User | null,
    fromState: fromState as WorkflowState | null,
    toState: toState as WorkflowState | null,
    fromAssignee: fromAssignee as User | null,
    toAssignee: toAssignee as User | null,
    addedLabels: normalizeLabelList(addedLabelsRaw),
    removedLabels: normalizeLabelList(removedLabelsRaw),
  }

  // Filter out noisy / irrelevant entries
  if (!isRelevantActivity(entry, resolved)) return null

  const actorName = resolved.actor?.name ?? 'System'
  const type = classifyActivityType(entry, resolved)
  const description = buildActivityDescription(entry, resolved)

  return {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    actorName,
    type,
    description,
  }
}

/**
 * Batch-convert multiple SDK IssueHistory entries to IssueActivityDtos.
 *
 * Filters out irrelevant entries (returns only meaningful activity).
 * Results are sorted in reverse-chronological order (newest first).
 */
export async function toIssueActivityDtos(
  entries: IssueHistory[],
  concurrency = 10,
): Promise<IssueActivityDto[]> {
  const results: IssueActivityDto[] = []
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(toIssueActivityDto))
    results.push(...batchResults.filter((dto): dto is IssueActivityDto => dto !== null))
  }

  // Sort by createdAt descending (newest first)
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return results
}

/**
 * Batch-convert multiple SDK Issues to BacklogItemDtos.
 *
 * Uses controlled concurrency to avoid overwhelming the Linear API
 * with parallel lazy-loading requests. Each issue resolves ~5 SDK
 * relations, so processing 50 issues in parallel would fire 250
 * concurrent API calls.
 */
export async function toBacklogItemDtos(
  issues: Issue[],
  concurrency = 5,
): Promise<BacklogItemDto[]> {
  const results: BacklogItemDto[] = []

  for (let i = 0; i < issues.length; i += concurrency) {
    const batch = issues.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(toBacklogItemDto))
    results.push(...batchResults)
  }

  return results
}

/**
 * Resilient batch-convert of SDK Issues to BacklogItemDtos.
 *
 * Uses `Promise.allSettled` instead of `Promise.all` so that individual
 * item transform failures don't reject the entire batch. Successfully
 * transformed items are collected alongside failure details.
 *
 * Each failure is logged at `warn` level with the issue identifier.
 */
export async function toBacklogItemDtosResilient(
  issues: Issue[],
  concurrency = 5,
): Promise<TransformResult> {
  const items: BacklogItemDto[] = []
  const failures: TransformFailure[] = []

  for (let i = 0; i < issues.length; i += concurrency) {
    const batch = issues.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map(toBacklogItemDto))

    settled.forEach((result, idx) => {
      const issue = batch[idx]
      if (result.status === 'fulfilled') {
        items.push(result.value)
      } else {
        const errorMessage =
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        failures.push({
          issueId: issue.id,
          identifier: issue.identifier,
          error: errorMessage,
        })
        logger.warn(
          { service: 'sync', issueId: issue.id, identifier: issue.identifier, error: errorMessage },
          `Transform failed for issue ${issue.identifier}`,
        )
      }
    })
  }

  return { items, failures }
}

/**
 * Batch-convert multiple SDK Comments to CommentDtos.
 *
 * Results are sorted by createdAt ascending (oldest first) for natural
 * conversation reading order.
 */
export async function toCommentDtos(
  comments: Comment[],
  concurrency = 10,
): Promise<CommentDto[]> {
  const dtos: CommentDto[] = []
  for (let i = 0; i < comments.length; i += concurrency) {
    const batch = comments.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(toCommentDto))
    dtos.push(...batchResults)
  }

  // Sort ascending by createdAt (oldest first) for natural reading order
  dtos.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return dtos
}
