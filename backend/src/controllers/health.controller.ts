import type { Request, Response } from 'express'

import { testConnection } from '../utils/database.js'
import { logger } from '../utils/logger.js'

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  logger.debug('Health check requested')

  const database = await testConnection()

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database,
  })
}
