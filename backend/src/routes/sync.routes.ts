import { Router } from 'express'

import { getSyncStatus, triggerSync } from '../controllers/sync.controller.js'

const syncRoutes = Router()

syncRoutes.get('/sync/status', getSyncStatus)
syncRoutes.post('/sync/trigger', triggerSync)

export default syncRoutes
