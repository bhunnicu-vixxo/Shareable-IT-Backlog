import type { Request, Response } from 'express'
import { logger } from '../utils/logger.js'

export const getHealth = (_req: Request, res: Response): void => {
  logger.debug('Health check requested')
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
