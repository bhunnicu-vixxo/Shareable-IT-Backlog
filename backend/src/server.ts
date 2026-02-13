import './config/env.js'

import { validateCredentials } from './config/credential-validator.js'
import { logger } from './utils/logger.js'

// Validate all required credentials BEFORE any app/service initialization.
// IMPORTANT (Node ESM): static imports are evaluated before this file's body runs,
// so we must validate first, then dynamically import modules that initialize the app.
validateCredentials()

const portFromEnv = process.env.PORT ? Number(process.env.PORT) : 3000
const PORT = Number.isFinite(portFromEnv) ? portFromEnv : 3000

const { default: app } = await import('./app.js')
const { syncScheduler } = await import('./services/sync/sync-scheduler.service.js')

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started')
  syncScheduler.start().catch((error) => {
    logger.error({ error }, 'Failed to start sync scheduler')
  })
})
