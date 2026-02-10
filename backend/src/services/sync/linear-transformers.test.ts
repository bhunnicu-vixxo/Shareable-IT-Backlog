import { describe, it, expect } from 'vitest'

import {
  toBacklogItemDto,
  toCommentDto,
  toProjectDto,
  toTeamDto,
  toUserDto,
  toWorkflowStateDto,
  toBacklogItemDtos,
  toCommentDtos,
} from './linear-transformers.js'

import {
  backlogItemDtoSchema,
  commentDtoSchema,
  workflowStateDtoSchema,
} from '../../types/linear-entities.schemas.js'

import type { Issue, Comment, Project, Team, User, WorkflowState } from '@linear/sdk'

// ─── Mock helpers ───────────────────────────────────────────────────────────

/**
 * Create a mock SDK Issue that mimics lazy-loading getters.
 * SDK relations (state, assignee, project, team, labels) return Promises.
 */
function createMockIssue(overrides: Record<string, unknown> = {}): Issue {
  const base = {
    id: 'issue-1',
    identifier: 'VIX-1',
    title: 'Test Issue',
    description: 'Test description',
    priority: 2,
    sortOrder: 1.5,
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T14:30:00.000Z'),
    completedAt: undefined,
    dueDate: undefined,
    url: 'https://linear.app/vixxo/issue/VIX-1',
    // Lazy-loading getters must return Promises
    get state() {
      return Promise.resolve({ name: 'In Progress', type: 'started' })
    },
    get assignee() {
      return Promise.resolve({
        id: 'user-1',
        name: 'Jane Dev',
        email: 'jane@vixxo.com',
      })
    },
    get project() {
      return Promise.resolve({ id: 'proj-1', name: 'Shareable IT Backlog' })
    },
    get team() {
      return Promise.resolve({ id: 'team-1', name: 'Vixxo', key: 'VIX' })
    },
    labels: () =>
      Promise.resolve({
        nodes: [{ id: 'lbl-1', name: 'Backend', color: '#395389' }],
      }),
    ...overrides,
  }
  return base as unknown as Issue
}

/**
 * Create a mock SDK Comment that mimics lazy-loading getters.
 */
function createMockComment(overrides: Record<string, unknown> = {}): Comment {
  const base = {
    id: 'comment-1',
    body: 'This is a test comment in **markdown**.',
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T11:00:00.000Z'),
    get user() {
      return Promise.resolve({
        id: 'user-1',
        name: 'Jane Dev',
        email: 'jane@vixxo.com',
      })
    },
    ...overrides,
  }
  return base as unknown as Comment
}

function createMockProject(overrides: Record<string, unknown> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Shareable IT Backlog',
    description: 'A shared backlog app',
    state: 'started',
    url: 'https://linear.app/vixxo/project/shareable-it-backlog',
    ...overrides,
  } as unknown as Project
}

function createMockTeam(overrides: Record<string, unknown> = {}): Team {
  return {
    id: 'team-1',
    name: 'Vixxo',
    key: 'VIX',
    ...overrides,
  } as unknown as Team
}

function createMockUser(overrides: Record<string, unknown> = {}): User {
  return {
    id: 'user-1',
    name: 'Jane Dev',
    email: 'jane@vixxo.com',
    avatarUrl: 'https://avatars.example.com/jane.png',
    active: true,
    ...overrides,
  } as unknown as User
}

function createMockWorkflowState(
  overrides: Record<string, unknown> = {},
): WorkflowState {
  return {
    id: 'state-1',
    name: 'In Progress',
    type: 'started',
    position: 1,
    color: '#395389',
    description: 'Work has begun',
    ...overrides,
  } as unknown as WorkflowState
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('toBacklogItemDto', () => {
  it('returns correct shape from mock SDK Issue', async () => {
    const issue = createMockIssue()
    const dto = await toBacklogItemDto(issue)

    expect(dto).toEqual({
      id: 'issue-1',
      identifier: 'VIX-1',
      title: 'Test Issue',
      description: 'Test description',
      priority: 2,
      priorityLabel: 'High',
      status: 'In Progress',
      statusType: 'started',
      assigneeId: 'user-1',
      assigneeName: 'Jane Dev',
      projectId: 'proj-1',
      projectName: 'Shareable IT Backlog',
      teamId: 'team-1',
      teamName: 'Vixxo',
      labels: [{ id: 'lbl-1', name: 'Backend', color: '#395389' }],
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-02-01T14:30:00.000Z',
      completedAt: null,
      dueDate: null,
      sortOrder: 1.5,
      url: 'https://linear.app/vixxo/issue/VIX-1',
      isNew: expect.any(Boolean),
    })
  })

  it('maps priority number to correct label string', async () => {
    const priorities: Array<[number, string]> = [
      [0, 'None'],
      [1, 'Urgent'],
      [2, 'High'],
      [3, 'Normal'],
      [4, 'Low'],
    ]

    for (const [num, label] of priorities) {
      const issue = createMockIssue({ priority: num })
      const dto = await toBacklogItemDto(issue)
      expect(dto.priorityLabel).toBe(label)
    }
  })

  it('handles null assignee gracefully', async () => {
    const issue = createMockIssue({
      get assignee() {
        return Promise.resolve(undefined)
      },
    })
    const dto = await toBacklogItemDto(issue)

    expect(dto.assigneeId).toBeNull()
    expect(dto.assigneeName).toBeNull()
  })

  it('formats assignee display name when name is an email', async () => {
    const issue = createMockIssue({
      get assignee() {
        return Promise.resolve({
          id: 'user-1',
          name: 'robert.hunnicutt@vixxo.com',
          email: 'robert.hunnicutt@vixxo.com',
        })
      },
    })
    const dto = await toBacklogItemDto(issue)

    expect(dto.assigneeName).toBe('Robert Hunnicutt')
  })

  it('uses assignee name as-is when it is not an email', async () => {
    const issue = createMockIssue({
      get assignee() {
        return Promise.resolve({
          id: 'user-1',
          name: 'Jane Dev',
          email: 'jane@vixxo.com',
        })
      },
    })
    const dto = await toBacklogItemDto(issue)

    expect(dto.assigneeName).toBe('Jane Dev')
  })

  it('handles null project gracefully', async () => {
    const issue = createMockIssue({
      get project() {
        return Promise.resolve(undefined)
      },
    })
    const dto = await toBacklogItemDto(issue)

    expect(dto.projectId).toBeNull()
    expect(dto.projectName).toBeNull()
  })

  it('serialises dates to ISO 8601 strings', async () => {
    const issue = createMockIssue({
      createdAt: new Date('2026-03-10T08:15:30.000Z'),
      updatedAt: new Date('2026-03-11T16:45:00.000Z'),
      completedAt: new Date('2026-03-12T12:00:00.000Z'),
    })
    const dto = await toBacklogItemDto(issue)

    expect(dto.createdAt).toBe('2026-03-10T08:15:30.000Z')
    expect(dto.updatedAt).toBe('2026-03-11T16:45:00.000Z')
    expect(dto.completedAt).toBe('2026-03-12T12:00:00.000Z')
  })

  it('maps completedAt undefined to null', async () => {
    const issue = createMockIssue({ completedAt: undefined })
    const dto = await toBacklogItemDto(issue)
    expect(dto.completedAt).toBeNull()
  })

  it('maps dueDate undefined to null', async () => {
    const issue = createMockIssue({ dueDate: undefined })
    const dto = await toBacklogItemDto(issue)
    expect(dto.dueDate).toBeNull()
  })

  it('preserves dueDate string when present', async () => {
    const issue = createMockIssue({ dueDate: '2026-04-01' })
    const dto = await toBacklogItemDto(issue)
    expect(dto.dueDate).toBe('2026-04-01')
  })

  it('resolves labels array', async () => {
    const issue = createMockIssue({
      labels: () =>
        Promise.resolve({
          nodes: [
            { id: 'lbl-1', name: 'Backend', color: '#395389' },
            { id: 'lbl-2', name: 'Bug', color: '#eb5757' },
          ],
        }),
    })
    const dto = await toBacklogItemDto(issue)

    expect(dto.labels).toHaveLength(2)
    expect(dto.labels[0]).toEqual({ id: 'lbl-1', name: 'Backend', color: '#395389' })
    expect(dto.labels[1]).toEqual({ id: 'lbl-2', name: 'Bug', color: '#eb5757' })
  })

  it('handles empty labels array', async () => {
    const issue = createMockIssue({
      labels: () => Promise.resolve({ nodes: [] }),
    })
    const dto = await toBacklogItemDto(issue)
    expect(dto.labels).toEqual([])
  })

  it('maps description undefined to null', async () => {
    const issue = createMockIssue({ description: undefined })
    const dto = await toBacklogItemDto(issue)
    expect(dto.description).toBeNull()
  })
})

describe('toCommentDto', () => {
  it('returns correct shape from mock SDK Comment', async () => {
    const comment = createMockComment()
    const dto = await toCommentDto(comment)

    expect(dto).toEqual({
      id: 'comment-1',
      body: 'This is a test comment in **markdown**.',
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T11:00:00.000Z',
      userId: 'user-1',
      userName: 'Jane Dev',
    })
  })

  it('handles null user gracefully', async () => {
    const comment = createMockComment({
      get user() {
        return Promise.resolve(undefined)
      },
    })
    const dto = await toCommentDto(comment)

    expect(dto.userId).toBeNull()
    expect(dto.userName).toBeNull()
  })
})

describe('toProjectDto', () => {
  it('returns correct shape from mock SDK Project', () => {
    const project = createMockProject()
    const dto = toProjectDto(project)

    expect(dto).toEqual({
      id: 'proj-1',
      name: 'Shareable IT Backlog',
      description: 'A shared backlog app',
      state: 'started',
      url: 'https://linear.app/vixxo/project/shareable-it-backlog',
    })
  })

  it('maps description undefined to null', () => {
    const project = createMockProject({ description: undefined })
    const dto = toProjectDto(project)
    expect(dto.description).toBeNull()
  })
})

describe('toTeamDto', () => {
  it('returns correct shape from mock SDK Team', () => {
    const team = createMockTeam()
    const dto = toTeamDto(team)

    expect(dto).toEqual({
      id: 'team-1',
      name: 'Vixxo',
      key: 'VIX',
    })
  })
})

describe('toUserDto', () => {
  it('returns correct shape from mock SDK User', () => {
    const user = createMockUser()
    const dto = toUserDto(user)

    expect(dto).toEqual({
      id: 'user-1',
      name: 'Jane Dev',
      email: 'jane@vixxo.com',
      avatarUrl: 'https://avatars.example.com/jane.png',
      active: true,
    })
  })

  it('maps email undefined to null', () => {
    const user = createMockUser({ email: undefined })
    const dto = toUserDto(user)
    expect(dto.email).toBeNull()
  })

  it('maps avatarUrl undefined to null', () => {
    const user = createMockUser({ avatarUrl: undefined })
    const dto = toUserDto(user)
    expect(dto.avatarUrl).toBeNull()
  })
})

describe('toWorkflowStateDto', () => {
  it('returns correct shape from mock SDK WorkflowState', () => {
    const state = createMockWorkflowState()
    const dto = toWorkflowStateDto(state)

    expect(dto).toEqual({
      id: 'state-1',
      name: 'In Progress',
      type: 'started',
      position: 1,
      color: '#395389',
      description: 'Work has begun',
    })
  })

  it('maps description undefined to null', () => {
    const state = createMockWorkflowState({ description: undefined })
    const dto = toWorkflowStateDto(state)
    expect(dto.description).toBeNull()
  })
})

describe('toBacklogItemDtos', () => {
  it('batch transforms multiple issues', async () => {
    const issues = [
      createMockIssue({ id: 'issue-1', identifier: 'VIX-1' }),
      createMockIssue({ id: 'issue-2', identifier: 'VIX-2', title: 'Second Issue' }),
      createMockIssue({ id: 'issue-3', identifier: 'VIX-3', title: 'Third Issue' }),
    ]
    const dtos = await toBacklogItemDtos(issues)

    expect(dtos).toHaveLength(3)
    expect(dtos[0]!.id).toBe('issue-1')
    expect(dtos[1]!.id).toBe('issue-2')
    expect(dtos[2]!.id).toBe('issue-3')
  })

  it('returns empty array for empty input', async () => {
    const dtos = await toBacklogItemDtos([])
    expect(dtos).toEqual([])
  })
})

describe('toCommentDtos', () => {
  it('batch transforms multiple comments', async () => {
    const comments = [
      createMockComment({ id: 'comment-1' }),
      createMockComment({ id: 'comment-2', body: 'Second comment' }),
    ]
    const dtos = await toCommentDtos(comments)

    expect(dtos).toHaveLength(2)
    expect(dtos[0]!.id).toBe('comment-1')
    expect(dtos[1]!.id).toBe('comment-2')
  })
})

describe('isNew computation', () => {
  it('flags item created 1 day ago as new (within default 7-day threshold)', async () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    const issue = createMockIssue({ createdAt: oneDayAgo })
    const dto = await toBacklogItemDto(issue)
    expect(dto.isNew).toBe(true)
  })

  it('flags item created 6 days ago as new', async () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    const issue = createMockIssue({ createdAt: sixDaysAgo })
    const dto = await toBacklogItemDto(issue)
    expect(dto.isNew).toBe(true)
  })

  it('does not flag item created 8 days ago as new', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    const issue = createMockIssue({ createdAt: eightDaysAgo })
    const dto = await toBacklogItemDto(issue)
    expect(dto.isNew).toBe(false)
  })

  it('does not flag item created 30 days ago as new', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const issue = createMockIssue({ createdAt: thirtyDaysAgo })
    const dto = await toBacklogItemDto(issue)
    expect(dto.isNew).toBe(false)
  })

  it('flags item created just now as new', async () => {
    const issue = createMockIssue({ createdAt: new Date() })
    const dto = await toBacklogItemDto(issue)
    expect(dto.isNew).toBe(true)
  })
})

describe('Zod schema validation', () => {
  it('validates a valid BacklogItemDto without errors', async () => {
    const issue = createMockIssue()
    const dto = await toBacklogItemDto(issue)

    const result = backlogItemDtoSchema.safeParse(dto)
    expect(result.success).toBe(true)
  })

  it('validates a valid CommentDto without errors', async () => {
    const comment = createMockComment()
    const dto = await toCommentDto(comment)

    const result = commentDtoSchema.safeParse(dto)
    expect(result.success).toBe(true)
  })

  it('rejects invalid BacklogItemDto data (missing required fields)', () => {
    const invalidData = {
      id: 'issue-1',
      // Missing most required fields
    }

    const result = backlogItemDtoSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('rejects BacklogItemDto with invalid priority range', () => {
    const invalidData = {
      id: 'issue-1',
      identifier: 'VIX-1',
      title: 'Test',
      description: null,
      priority: 5, // Out of range (0-4)
      priorityLabel: 'Invalid',
      status: 'Backlog',
      statusType: 'backlog',
      assigneeId: null,
      assigneeName: null,
      projectId: null,
      projectName: null,
      teamId: 'team-1',
      teamName: 'Vixxo',
      labels: [],
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-02-01T14:30:00.000Z',
      completedAt: null,
      dueDate: null,
      sortOrder: 1.5,
      url: 'https://linear.app/vixxo/issue/VIX-1',
      isNew: false,
    }

    const result = backlogItemDtoSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('rejects CommentDto with missing required fields', () => {
    const invalidData = {
      id: 'comment-1',
      // Missing body, createdAt, updatedAt, etc.
    }

    const result = commentDtoSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('validates a valid WorkflowStateDto without errors', () => {
    const state = createMockWorkflowState()
    const dto = toWorkflowStateDto(state)

    const result = workflowStateDtoSchema.safeParse(dto)
    expect(result.success).toBe(true)
  })
})
