import { Router } from 'express'
import { getVisibleLabelsHandler } from '../controllers/labels.controller.js'

const labelsRoutes = Router()

labelsRoutes.get('/labels/visible', getVisibleLabelsHandler)

export default labelsRoutes
