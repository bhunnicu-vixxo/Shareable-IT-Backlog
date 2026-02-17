import { Router } from 'express'
import { requireAdmin } from '../middleware/admin.middleware.js'
import {
  submitRequest,
  getMyRequests,
  getSimilarItems,
  listTriageQueue,
  getAdminRequestDetail,
  approveRequestHandler,
  rejectRequestHandler,
  mergeRequestHandler,
} from '../controllers/requests.controller.js'

const router = Router()

// NOTE: Auth + approval is enforced by the parent protected router in routes/index.ts

// Admin triage endpoints — require admin
router.post('/requests', submitRequest)
router.get('/requests/mine', getMyRequests)
router.get('/requests/similar', getSimilarItems)

router.get('/admin/requests', requireAdmin, listTriageQueue)
router.get('/admin/requests/:id', requireAdmin, getAdminRequestDetail)
router.put('/admin/requests/:id/approve', requireAdmin, approveRequestHandler)
router.put('/admin/requests/:id/reject', requireAdmin, rejectRequestHandler)
router.put('/admin/requests/:id/merge', requireAdmin, mergeRequestHandler)

export default router
