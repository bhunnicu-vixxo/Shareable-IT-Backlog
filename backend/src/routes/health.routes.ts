import { Router } from 'express'
import {
  getHealth,
  getDbHealth,
  getLinearHealth,
  getReady,
  getLive,
} from '../controllers/health.controller.js'

const router = Router()

// Full health check — all components
router.get('/health', getHealth)

// Database-only check (quick check for load balancers)
router.get('/health/db', getDbHealth)

// Linear API-only check
router.get('/health/linear', getLinearHealth)

// Readiness probe — checks all dependencies, returns 200 if ready, 503 if not
router.get('/health/ready', getReady)

// Liveness probe — lightweight, confirms process is running
router.get('/health/live', getLive)

export default router
