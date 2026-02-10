import { Router } from 'express'
import { getBacklogItems, getBacklogItemById } from '../controllers/backlog.controller.js'

const backlogRoutes = Router()

backlogRoutes.get('/backlog-items', getBacklogItems)
backlogRoutes.get('/backlog-items/:id', getBacklogItemById)

export default backlogRoutes
