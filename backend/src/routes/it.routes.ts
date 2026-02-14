import { Router } from 'express'
import { requireIT } from '../middleware/it.middleware.js'

const router = Router()

/**
 * IT-only routes.
 *
 * Note: Auth + approval checks are applied by the protected router in `routes/index.ts`.
 */
router.get('/it/ping', requireIT, (_req, res) => {
  res.json({ ok: true })
})

export default router

