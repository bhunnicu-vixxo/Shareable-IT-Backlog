/**
 * Zod schemas for Linear entity DTOs.
 *
 * These schemas enable runtime validation of data entering the API layer.
 * Import path uses 'zod/v4' to match the project convention (see linear.config.ts).
 */

import { z } from 'zod/v4'

const priorityLabelSchema = z.enum(['None', 'Urgent', 'High', 'Normal', 'Low'])
const workflowStateTypeSchema = z.enum([
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled',
])

// ─── Label ──────────────────────────────────────────────────────────────────

export const labelDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
})

export type LabelDtoValidated = z.infer<typeof labelDtoSchema>

// ─── BacklogItem (Issue) ────────────────────────────────────────────────────

export const backlogItemDtoSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.number().int().min(0).max(4),
  priorityLabel: priorityLabelSchema,
  status: z.string(),
  statusType: workflowStateTypeSchema,
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  teamId: z.string(),
  teamName: z.string(),
  labels: z.array(labelDtoSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  dueDate: z.iso.date().nullable(),
  sortOrder: z.number(),
  url: z.url(),
  isNew: z.boolean(),
})

export type BacklogItemDtoValidated = z.infer<typeof backlogItemDtoSchema>

// ─── Comment ────────────────────────────────────────────────────────────────

export const commentDtoSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
})

export type CommentDtoValidated = z.infer<typeof commentDtoSchema>

// ─── Project ────────────────────────────────────────────────────────────────

export const projectDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  url: z.string().url(),
})

export type ProjectDtoValidated = z.infer<typeof projectDtoSchema>

// ─── Team ───────────────────────────────────────────────────────────────────

export const teamDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
})

export type TeamDtoValidated = z.infer<typeof teamDtoSchema>

// ─── User ───────────────────────────────────────────────────────────────────

export const userDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().nullable(),
  active: z.boolean(),
})

export type UserDtoValidated = z.infer<typeof userDtoSchema>

// ─── WorkflowState ───────────────────────────────────────────────────────────

export const workflowStateDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: workflowStateTypeSchema,
  position: z.number(),
  color: z.string(),
  description: z.string().nullable(),
})

export type WorkflowStateDtoValidated = z.infer<typeof workflowStateDtoSchema>
