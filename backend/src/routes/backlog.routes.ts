import { Router } from 'express'
import { getBacklogItems } from '../controllers/backlog.controller.js'

const backlogRoutes = Router()

backlogRoutes.get('/backlog-items', getBacklogItems)

export default backlogRoutes
