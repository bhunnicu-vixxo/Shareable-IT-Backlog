import type { Request, Response, NextFunction } from 'express'
import {
  createRequest,
  getRequestsByUser,
  getTriageQueue,
  getRequestById,
  approveRequest,
  rejectRequest,
  findSimilarItems,
  mergeRequest,
} from '../services/requests/request.service.js'
import { logger } from '../utils/logger.js'

/* ------------------------------------------------------------------ */
/*  User endpoints                                                     */
/* ------------------------------------------------------------------ */

/**
 * POST /api/requests
 * Submit a new IT request. Requires authenticated, approved user.
 */
export async function submitRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.session.userId)
    const { title, description, businessImpact, category, urgency } = req.body as {
      title?: string
      description?: string
      businessImpact?: string
      category?: string
      urgency?: string
    }

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length < 10) {
      res.status(400).json({
        error: {
          message: 'Title is required and must be at least 10 characters',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    if (!description || typeof description !== 'string' || description.trim().length < 50) {
      res.status(400).json({
        error: {
          message: 'Description is required and must be at least 50 characters',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const validImpacts = ['critical', 'high', 'medium', 'low']
    if (!businessImpact || !validImpacts.includes(businessImpact)) {
      res.status(400).json({
        error: {
          message: 'Business impact is required and must be one of: critical, high, medium, low',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const validUrgencies = ['asap', 'this_quarter', 'this_year', 'no_rush']
    if (urgency && !validUrgencies.includes(urgency)) {
      res.status(400).json({
        error: {
          message: 'Urgency must be one of: asap, this_quarter, this_year, no_rush',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const request = await createRequest({
      userId,
      title: title.trim(),
      description: description.trim(),
      businessImpact: businessImpact as 'critical' | 'high' | 'medium' | 'low',
      category: category?.trim() || null,
      urgency: urgency || null,
    })

    logger.info({ userId, requestId: request.id }, 'User submitted IT request')
    res.status(201).json(request)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/requests/mine
 * Get the current user's submitted requests.
 */
export async function getMyRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.session.userId)
    const requests = await getRequestsByUser(userId)
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/requests/similar
 * Find similar existing backlog items by title search text.
 */
export async function getSimilarItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const title = req.query.title as string | undefined
    if (!title || title.trim().length < 3) {
      res.json([])
      return
    }

    const similar = await findSimilarItems(title.trim())
    res.json(similar)
  } catch (err) {
    next(err)
  }
}

/* ------------------------------------------------------------------ */
/*  Admin endpoints                                                    */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/requests
 * Get all requests for triage (admin only).
 */
export async function listTriageQueue(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requests = await getTriageQueue()
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/requests/:id
 * Get a single request by ID (admin only).
 */
export async function getAdminRequestDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params
    if (!id) {
      res.status(400).json({
        error: { message: 'Request ID is required', code: 'VALIDATION_ERROR' },
      })
      return
    }

    const request = await getRequestById(id)
    if (!request) {
      res.status(404).json({
        error: { message: 'Request not found', code: 'NOT_FOUND' },
      })
      return
    }

    res.json(request)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/admin/requests/:id/approve
 * Approve a request and create a Linear issue (admin only).
 */
export async function approveRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params
    const adminId = Number(req.session.userId)
    const { adminNotes } = req.body as { adminNotes?: string }

    const approved = await approveRequest(id, { adminId, adminNotes })

    logger.info({ requestId: id, adminId }, 'Admin approved request')
    res.json(approved)
  } catch (err) {
    const error = err as Error & { code?: string }
    if (error.code === 'NOT_FOUND') {
      res.status(404).json({
        error: { message: error.message, code: 'NOT_FOUND' },
      })
      return
    }
    if (error.code === 'INVALID_STATUS') {
      res.status(409).json({
        error: { message: error.message, code: 'INVALID_STATUS' },
      })
      return
    }
    next(err)
  }
}

/**
 * PUT /api/admin/requests/:id/reject
 * Reject a request with a reason (admin only).
 */
export async function rejectRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params
    const adminId = Number(req.session.userId)
    const { rejectionReason } = req.body as { rejectionReason?: string }

    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length < 5) {
      res.status(400).json({
        error: {
          message: 'Rejection reason is required and must be at least 5 characters',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const rejected = await rejectRequest(id, {
      adminId,
      rejectionReason: rejectionReason.trim(),
    })

    logger.info({ requestId: id, adminId }, 'Admin rejected request')
    res.json(rejected)
  } catch (err) {
    const error = err as Error & { code?: string }
    if (error.code === 'NOT_FOUND') {
      res.status(404).json({
        error: { message: error.message, code: 'NOT_FOUND' },
      })
      return
    }
    if (error.code === 'INVALID_STATUS') {
      res.status(409).json({
        error: { message: error.message, code: 'INVALID_STATUS' },
      })
      return
    }
    next(err)
  }
}

/**
 * PUT /api/admin/requests/:id/merge
 * Mark a request as merged into an existing Linear issue (admin only).
 */
export async function mergeRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params
    const adminId = Number(req.session.userId)
    const {
      linearIssueId,
      linearIssueIdentifier,
      linearIssueUrl,
      adminNotes,
    } = req.body as {
      linearIssueId?: string
      linearIssueIdentifier?: string
      linearIssueUrl?: string
      adminNotes?: string
    }

    if (!linearIssueIdentifier || typeof linearIssueIdentifier !== 'string' || linearIssueIdentifier.trim().length < 3) {
      res.status(400).json({
        error: {
          message: 'linearIssueIdentifier is required and must be at least 3 characters',
          code: 'VALIDATION_ERROR',
        },
      })
      return
    }

    const merged = await mergeRequest(id, {
      adminId,
      linearIssueId: linearIssueId?.trim() || null,
      linearIssueIdentifier: linearIssueIdentifier.trim(),
      linearIssueUrl: linearIssueUrl?.trim() || null,
      adminNotes: adminNotes?.trim() || null,
    })

    logger.info({ requestId: id, adminId }, 'Admin merged request')
    res.json(merged)
  } catch (err) {
    const error = err as Error & { code?: string }
    if (error.code === 'NOT_FOUND') {
      res.status(404).json({
        error: { message: error.message, code: 'NOT_FOUND' },
      })
      return
    }
    if (error.code === 'INVALID_STATUS') {
      res.status(409).json({
        error: { message: error.message, code: 'INVALID_STATUS' },
      })
      return
    }
    next(err)
  }
}
