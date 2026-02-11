import { Router } from 'express'
import backlogRoutes from './backlog.routes.js'
import syncRoutes from './sync.routes.js'

const router = Router()

// Note: Health routes are mounted directly in app.ts BEFORE network verification
// middleware so they remain accessible to load balancers and monitoring tools.
router.use(backlogRoutes)
router.use(syncRoutes)

export default router
