/**
 * Admin-only routes for querying audit logs.
 *
 * GET /api/admin/audit-logs — Paginated, filterable audit log query.
 */

import { Router } from 'express'
import { requireAuth, requireApproved } from '../middleware/auth.middleware.js'
import { requireAdmin } from '../middleware/admin.middleware.js'
import { getAuditLogs } from '../controllers/audit.controller.js'

const router = Router()

router.get(
  '/admin/audit-logs',
  requireAuth,
  requireApproved,
  requireAdmin,
  getAuditLogs,
)

export default router
