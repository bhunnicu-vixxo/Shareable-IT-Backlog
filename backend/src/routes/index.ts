import { Router } from 'express'
import authRoutes from './auth.routes.js'
import adminRoutes from './admin.routes.js'
import auditRoutes from './audit.routes.js'
import backlogRoutes from './backlog.routes.js'
import syncRoutes from './sync.routes.js'
import { requireAuth, requireApproved } from '../middleware/auth.middleware.js'

const router = Router()

// Note: Health routes are mounted directly in app.ts BEFORE network verification
// middleware so they remain accessible to load balancers and monitoring tools.

// Auth routes — no auth middleware (they handle auth internally)
router.use(authRoutes)

// Admin routes — auth + admin middleware applied inside admin.routes.ts and audit.routes.ts
router.use(adminRoutes)
router.use(auditRoutes)

// Protected routes — require authenticated + approved user
const protectedRouter = Router()
protectedRouter.use(requireAuth, requireApproved)
protectedRouter.use(backlogRoutes)
protectedRouter.use(syncRoutes)
router.use(protectedRouter)

export default router
