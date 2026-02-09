import { Router } from 'express'
import healthRoutes from './health.routes.js'
import backlogRoutes from './backlog.routes.js'

const router = Router()

router.use(healthRoutes)
router.use(backlogRoutes)

export default router
