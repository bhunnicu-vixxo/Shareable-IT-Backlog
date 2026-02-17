import { randomUUID } from 'node:crypto'
import { LinearClient } from '@linear/sdk'

import { query, pool } from '../../utils/database.js'
import { getLinearConfig } from '../../config/linear.config.js'
import { logger } from '../../utils/logger.js'
import { syncService } from '../sync/sync.service.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RequestBusinessImpact = 'critical' | 'high' | 'medium' | 'low'
export type RequestStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'merged'

export interface ITRequest {
  id: string
  userId: number
  title: string
  description: string
  businessImpact: RequestBusinessImpact
  category: string | null
  urgency: string | null
  status: RequestStatus
  adminNotes: string | null
  rejectionReason: string | null
  reviewedBy: number | null
  linearIssueId: string | null
  linearIssueIdentifier: string | null
  linearIssueUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRequestInput {
  userId: number
  title: string
  description: string
  businessImpact: RequestBusinessImpact
  category?: string | null
  urgency?: string | null
}

export interface ApproveRequestInput {
  adminId: number
  adminNotes?: string | null
}

export interface RejectRequestInput {
  adminId: number
  rejectionReason: string
}

/* ------------------------------------------------------------------ */
/*  Row mapping                                                        */
/* ------------------------------------------------------------------ */

function mapRowToRequest(row: Record<string, unknown>): ITRequest {
  return {
    id: row.id as string,
    userId: row.user_id as number,
    title: row.title as string,
    description: row.description as string,
    businessImpact: row.business_impact as RequestBusinessImpact,
    category: (row.category as string) ?? null,
    urgency: (row.urgency as string) ?? null,
    status: row.status as RequestStatus,
    adminNotes: (row.admin_notes as string) ?? null,
    rejectionReason: (row.rejection_reason as string) ?? null,
    reviewedBy: (row.reviewed_by as number) ?? null,
    linearIssueId: (row.linear_issue_id as string) ?? null,
    linearIssueIdentifier: (row.linear_issue_identifier as string) ?? null,
    linearIssueUrl: (row.linear_issue_url as string) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/*  CRUD operations                                                    */
/* ------------------------------------------------------------------ */

/**
 * Submit a new IT request.
 */
export async function createRequest(input: CreateRequestInput): Promise<ITRequest> {
  const id = randomUUID()
  const result = await query(
    `INSERT INTO requests (id, user_id, title, description, business_impact, category, urgency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted')
     RETURNING *`,
    [
      id,
      input.userId,
      input.title,
      input.description,
      input.businessImpact,
      input.category ?? null,
      input.urgency ?? null,
    ],
  )

  logger.info({ userId: input.userId, requestId: result.rows[0].id }, 'New IT request submitted')
  return mapRowToRequest(result.rows[0])
}

/**
 * Get all requests submitted by a specific user, newest first.
 */
export async function getRequestsByUser(userId: number): Promise<ITRequest[]> {
  const result = await query(
    `SELECT * FROM requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows.map(mapRowToRequest)
}

/**
 * Get all pending/submitted requests for admin triage, oldest first.
 */
export async function getTriageQueue(): Promise<ITRequest[]> {
  const result = await query(
    `SELECT r.*, u.email as submitter_email, u.display_name as submitter_name
     FROM requests r
     JOIN users u ON r.user_id = u.id
     ORDER BY r.created_at DESC`,
  )
  return result.rows.map((row: Record<string, unknown>) => ({
    ...mapRowToRequest(row),
    submitterEmail: row.submitter_email as string,
    submitterName: (row.submitter_name as string) ?? null,
  }))
}

/**
 * Get a single request by ID.
 */
export async function getRequestById(requestId: string): Promise<ITRequest | null> {
  const result = await query(
    `SELECT r.*, u.email as submitter_email, u.display_name as submitter_name
     FROM requests r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = $1`,
    [requestId],
  )
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return {
    ...mapRowToRequest(row),
    submitterEmail: row.submitter_email as string,
    submitterName: (row.submitter_name as string) ?? null,
  } as ITRequest & { submitterEmail: string; submitterName: string | null }
}

/* ------------------------------------------------------------------ */
/*  Admin actions                                                      */
/* ------------------------------------------------------------------ */

/** Map business impact to Linear priority number. */
const IMPACT_TO_PRIORITY: Record<RequestBusinessImpact, number> = {
  critical: 1, // Urgent
  high: 2,     // High
  medium: 3,   // Normal
  low: 4,      // Low
}

/**
 * Approve a request and create a corresponding Linear issue.
 */
export async function approveRequest(
  requestId: string,
  input: ApproveRequestInput,
): Promise<ITRequest> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock and fetch the request
    const lockResult = await client.query(
      `SELECT r.*, u.email as submitter_email, u.display_name as submitter_name
       FROM requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1
       FOR UPDATE`,
      [requestId],
    )

    if (lockResult.rows.length === 0) {
      throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' })
    }

    const request = lockResult.rows[0]

    if (request.status !== 'submitted' && request.status !== 'reviewing') {
      throw Object.assign(
        new Error(`Cannot approve request in "${request.status}" status`),
        { code: 'INVALID_STATUS' },
      )
    }

    // Create Linear issue
    let linearIssueId: string | null = null
    let linearIssueIdentifier: string | null = null
    let linearIssueUrl: string | null = null
    try {
      const config = getLinearConfig()
      const linearSdk = new LinearClient({ apiKey: config.apiKey })

      // Resolve team ID from environment or use first team
      const projectId = process.env.LINEAR_PROJECT_ID
      let teamId: string | undefined

      if (projectId) {
        const project = await linearSdk.project(projectId)
        const teams = await project.teams()
        if (teams.nodes.length > 0) {
          teamId = teams.nodes[0].id
        }
      }

      if (!teamId) {
        const teams = await linearSdk.teams()
        teamId = teams.nodes[0]?.id
      }

      if (!teamId) {
        throw new Error('No Linear team found')
      }

      const submitterName = request.submitter_name ?? request.submitter_email
      const description = [
        request.description,
        '',
        '---',
        `**Submitted by:** ${submitterName} via Shareable IT Backlog`,
        `**Business Impact:** ${request.business_impact}`,
        request.urgency ? `**Urgency:** ${request.urgency}` : null,
        request.category ? `**Category:** ${request.category}` : null,
      ].filter(Boolean).join('\n')

      const issuePayload: {
        teamId: string
        title: string
        description: string
        priority: number
        projectId?: string
        labelIds?: string[]
      } = {
        teamId,
        title: request.title,
        description,
        priority: IMPACT_TO_PRIORITY[request.business_impact as RequestBusinessImpact],
      }

      if (projectId) {
        issuePayload.projectId = projectId
      }

      // Add label based on category if available
      if (request.category) {
        const labelsConn = await linearSdk.issueLabels({
          filter: { name: { eq: request.category } },
        })
        if (labelsConn.nodes.length > 0) {
          issuePayload.labelIds = [labelsConn.nodes[0].id]
        }
      }

      const issueResult = await linearSdk.createIssue(issuePayload)
      const createdIssue = await issueResult.issue
      linearIssueId = createdIssue?.id ?? null
      linearIssueIdentifier = createdIssue?.identifier ?? null
      linearIssueUrl = createdIssue?.url ?? null

      logger.info(
        { requestId, linearIssueId, identifier: linearIssueIdentifier },
        'Created Linear issue from approved request',
      )
    } catch (err) {
      logger.error({ requestId, err }, 'Failed to create Linear issue on approval')
      // Still approve the request — Linear issue creation is best-effort
    }

    // Update request status to approved
    const updateResult = await client.query(
      `UPDATE requests
       SET status = 'approved',
           reviewed_by = $2,
           admin_notes = $3,
           linear_issue_id = $4,
           linear_issue_identifier = $5,
           linear_issue_url = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        requestId,
        input.adminId,
        input.adminNotes ?? null,
        linearIssueId,
        linearIssueIdentifier,
        linearIssueUrl,
      ],
    )

    await client.query('COMMIT')

    // Trigger a background sync so the newly-created issue appears in the backlog.
    // Best-effort: approval should succeed even if sync fails.
    if (linearIssueId) {
      syncService
        .runSync({ triggerType: 'manual', triggeredBy: input.adminId })
        .catch((err) => logger.warn({ requestId, err }, 'Failed to trigger sync after request approval'))
    }

    logger.info({ requestId, adminId: input.adminId, linearIssueId }, 'Request approved')
    return mapRowToRequest(updateResult.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Reject a request with a reason.
 */
export async function rejectRequest(
  requestId: string,
  input: RejectRequestInput,
): Promise<ITRequest> {
  const result = await query(
    `UPDATE requests
     SET status = 'rejected',
         reviewed_by = $2,
         rejection_reason = $3,
         updated_at = NOW()
     WHERE id = $1
       AND status IN ('submitted', 'reviewing')
     RETURNING *`,
    [requestId, input.adminId, input.rejectionReason],
  )

  if (result.rows.length === 0) {
    // Check if request exists
    const exists = await query('SELECT id, status FROM requests WHERE id = $1', [requestId])
    if (exists.rows.length === 0) {
      throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' })
    }
    throw Object.assign(
      new Error(`Cannot reject request in "${exists.rows[0].status}" status`),
      { code: 'INVALID_STATUS' },
    )
  }

  logger.info({ requestId, adminId: input.adminId }, 'Request rejected')
  return mapRowToRequest(result.rows[0])
}

/* ------------------------------------------------------------------ */
/*  Duplicate detection                                                */
/* ------------------------------------------------------------------ */

export interface SimilarItem {
  identifier: string
  title: string
  status: string
}

/**
 * Find backlog items with similar titles (simple ILIKE search).
 */
export async function findSimilarItems(searchText: string): Promise<SimilarItem[]> {
  const result = await query(
    `SELECT identifier, title, status
     FROM backlog_items
     WHERE title ILIKE $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [`%${searchText}%`],
  )
  return result.rows.map((row: Record<string, unknown>) => ({
    identifier: row.identifier as string,
    title: row.title as string,
    status: (row.status as string) ?? 'Unknown',
  }))
}

/**
 * Mark a request as merged into an existing Linear issue (admin action).
 *
 * This is used when the request duplicates an existing backlog item and should
 * be linked rather than creating a brand-new issue.
 */
export async function mergeRequest(
  requestId: string,
  input: {
    adminId: number
    linearIssueId?: string | null
    linearIssueIdentifier: string
    linearIssueUrl?: string | null
    adminNotes?: string | null
  },
): Promise<ITRequest> {
  const result = await query(
    `UPDATE requests
     SET status = 'merged',
         reviewed_by = $2,
         admin_notes = $3,
         linear_issue_id = $4,
         linear_issue_identifier = $5,
         linear_issue_url = $6,
         updated_at = NOW()
     WHERE id = $1
       AND status IN ('submitted', 'reviewing')
     RETURNING *`,
    [
      requestId,
      input.adminId,
      input.adminNotes ?? null,
      input.linearIssueId ?? null,
      input.linearIssueIdentifier,
      input.linearIssueUrl ?? null,
    ],
  )

  if (result.rows.length === 0) {
    const exists = await query('SELECT id, status FROM requests WHERE id = $1', [requestId])
    if (exists.rows.length === 0) {
      throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' })
    }
    throw Object.assign(
      new Error(`Cannot merge request in "${exists.rows[0].status}" status`),
      { code: 'INVALID_STATUS' },
    )
  }

  logger.info(
    { requestId, adminId: input.adminId, linearIssueIdentifier: input.linearIssueIdentifier },
    'Request merged into existing Linear issue',
  )
  return mapRowToRequest(result.rows[0])
}
