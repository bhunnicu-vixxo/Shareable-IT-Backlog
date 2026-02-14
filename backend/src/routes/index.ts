import { type Request, type Response, type NextFunction, Router } from 'express'
import authRoutes from './auth.routes.js'
import adminRoutes from './admin.routes.js'
import auditRoutes from './audit.routes.js'
import backlogRoutes from './backlog.routes.js'
import syncRoutes from './sync.routes.js'
import itRoutes from './it.routes.js'
import { requireAuth, requireApproved } from '../middleware/auth.middleware.js'
import { databaseHealthMiddleware } from '../middleware/database-health.middleware.js'

/**
 * Wrap an async Express middleware so that rejected promises are forwarded to
 * `next(err)` instead of becoming unhandled rejections. This satisfies
 * Express 4's synchronous middleware contract without an eslint-disable.
 */
function asyncMiddleware(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}

const router = Router()

// Note: Health routes are mounted directly in app.ts BEFORE network verification
// middleware so they remain accessible to load balancers and monitoring tools.

// Auth routes — no auth middleware (they handle auth internally)
router.use(authRoutes)

// Admin routes — auth + admin middleware applied inside admin.routes.ts and audit.routes.ts
router.use(adminRoutes)
router.use(auditRoutes)

// Protected routes — require authenticated + approved user
// Database health gate applied here (not to health/auth routes above) to return 503
// early when the database is down, before requests hit route handlers.
const protectedRouter = Router()
protectedRouter.use(requireAuth, requireApproved)
protectedRouter.use(asyncMiddleware(databaseHealthMiddleware))
protectedRouter.use(backlogRoutes)
protectedRouter.use(syncRoutes)
protectedRouter.use(itRoutes)
router.use(protectedRouter)

export default router
