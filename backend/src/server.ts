import './config/env.js'

import app from './app.js'
import { logger } from './utils/logger.js'
import { syncScheduler } from './services/sync/sync-scheduler.service.js'

const portFromEnv = process.env.PORT ? Number(process.env.PORT) : 3000
const PORT = Number.isFinite(portFromEnv) ? portFromEnv : 3000

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started')
  syncScheduler.start()
})
