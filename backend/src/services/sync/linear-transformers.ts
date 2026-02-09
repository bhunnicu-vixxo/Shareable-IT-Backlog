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
  Project,
  Team,
  User,
  WorkflowState,
} from '@linear/sdk'

import type {
  BacklogItemDto,
  CommentDto,
  LabelDto,
  PriorityLabel,
  ProjectDto,
  TeamDto,
  UserDto,
  WorkflowStateType,
  WorkflowStateDto,
} from '../../types/linear-entities.types.js'

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
    assigneeName: assignee?.name ?? null,
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
    url: issue.url,
  }
}

/**
 * Convert a single SDK Comment to a CommentDto.
 *
 * Resolves the lazy `comment.user` relation for user info.
 */
export async function toCommentDto(comment: Comment): Promise<CommentDto> {
  const user = await comment.user

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    userId: user?.id ?? null,
    userName: user?.name ?? null,
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
 * Batch-convert multiple SDK Comments to CommentDtos.
 */
export async function toCommentDtos(comments: Comment[]): Promise<CommentDto[]> {
  return Promise.all(comments.map(toCommentDto))
}
