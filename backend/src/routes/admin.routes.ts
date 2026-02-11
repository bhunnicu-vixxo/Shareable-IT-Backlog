import { Router } from 'express'
import { requireAuth, requireApproved } from '../middleware/auth.middleware.js'
import { requireAdmin } from '../middleware/admin.middleware.js'
import { listPendingUsers, approveUserHandler, listAllUsers, disableUserHandler, enableUserHandler } from '../controllers/admin.controller.js'

const router = Router()

// Admin routes — require authenticated, approved, and admin users
router.get('/admin/users/pending', requireAuth, requireApproved, requireAdmin, listPendingUsers)
router.get('/admin/users', requireAuth, requireApproved, requireAdmin, listAllUsers)
router.post('/admin/users/:id/approve', requireAuth, requireApproved, requireAdmin, approveUserHandler)
router.post('/admin/users/:id/disable', requireAuth, requireApproved, requireAdmin, disableUserHandler)
router.post('/admin/users/:id/enable', requireAuth, requireApproved, requireAdmin, enableUserHandler)

export default router
