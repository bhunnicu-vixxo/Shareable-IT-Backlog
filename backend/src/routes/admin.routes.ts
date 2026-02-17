import { Router } from 'express'
import { requireAuth, requireApproved } from '../middleware/auth.middleware.js'
import { requireAdmin } from '../middleware/admin.middleware.js'
import { listPendingUsers, approveUserHandler, listAllUsers, disableUserHandler, enableUserHandler, updateUserITRoleHandler, rejectUserHandler, removeUserHandler, updateUserAdminRoleHandler, adminTriggerSync, getSyncHistory, getSyncSchedule, updateSyncSchedule, getLabels, updateLabel, bulkUpdateLabels } from '../controllers/admin.controller.js'

const router = Router()

// Admin routes — require authenticated, approved, and admin users
router.get('/admin/users/pending', requireAuth, requireApproved, requireAdmin, listPendingUsers)
router.get('/admin/users', requireAuth, requireApproved, requireAdmin, listAllUsers)
router.post('/admin/users/:id/approve', requireAuth, requireApproved, requireAdmin, approveUserHandler)
router.post('/admin/users/:id/disable', requireAuth, requireApproved, requireAdmin, disableUserHandler)
router.post('/admin/users/:id/enable', requireAuth, requireApproved, requireAdmin, enableUserHandler)
router.put('/admin/users/:id/it-role', requireAuth, requireApproved, requireAdmin, updateUserITRoleHandler)
router.post('/admin/users/:id/reject', requireAuth, requireApproved, requireAdmin, rejectUserHandler)
router.delete('/admin/users/:id', requireAuth, requireApproved, requireAdmin, removeUserHandler)
router.put('/admin/users/:id/admin-role', requireAuth, requireApproved, requireAdmin, updateUserAdminRoleHandler)

// Admin sync routes
router.post('/admin/sync/trigger', requireAuth, requireApproved, requireAdmin, adminTriggerSync)
router.get('/admin/sync/history', requireAuth, requireApproved, requireAdmin, getSyncHistory)

// Admin settings routes
router.get('/admin/settings/sync-schedule', requireAuth, requireApproved, requireAdmin, getSyncSchedule)
router.put('/admin/settings/sync-schedule', requireAuth, requireApproved, requireAdmin, updateSyncSchedule)

// Admin label visibility routes
// IMPORTANT: /bulk MUST come before /:labelName to avoid "bulk" being matched as a label name
router.get('/admin/settings/labels', requireAuth, requireApproved, requireAdmin, getLabels)
router.patch('/admin/settings/labels/bulk', requireAuth, requireApproved, requireAdmin, bulkUpdateLabels)
router.patch('/admin/settings/labels/:labelName', requireAuth, requireApproved, requireAdmin, updateLabel)

export default router
