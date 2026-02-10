import { Router } from 'express'
import healthRoutes from './health.routes.js'
import backlogRoutes from './backlog.routes.js'
import syncRoutes from './sync.routes.js'

const router = Router()

router.use(healthRoutes)
router.use(backlogRoutes)
router.use(syncRoutes)

export default router
