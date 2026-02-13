import type http from 'node:http'
import type pg from 'pg'
import { logger } from './logger.js'

/** Maximum time (ms) to wait for graceful shutdown before forcing exit. */
const SHUTDOWN_TIMEOUT_MS = 10_000

/** Guard against multiple shutdown attempts (e.g., SIGTERM + uncaughtException). */
let isShuttingDown = false

/** Guard against accumulating duplicate listeners on repeated calls. */
let handlersRegistered = false

/**
 * Graceful shutdown sequence:
 * 1. Stop accepting new HTTP connections
 * 2. Close the HTTP server (drain existing connections)
 * 3. Drain the database connection pool
 * 4. Exit the process
 *
 * If shutdown hangs beyond SHUTDOWN_TIMEOUT_MS, force-exit with code 1.
 */
async function gracefulShutdown(
  server: http.Server,
  pool: pg.Pool,
  exitCode: number,
): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress — ignoring duplicate signal')
    return
  }
  isShuttingDown = true

  logger.info({ exitCode }, 'Initiating graceful shutdown')

  // Safety timeout: force exit if graceful shutdown hangs
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  // Unref so this timer doesn't keep the event loop alive if shutdown completes
  forceExitTimer.unref()

  try {
    // 1. Close HTTP server (stop accepting new connections, drain existing)
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          logger.error({ err }, 'Error closing HTTP server')
          reject(err)
        } else {
          logger.info('HTTP server closed')
          resolve()
        }
      })
    })
  } catch {
    // Already logged — continue with pool cleanup
  }

  try {
    // 2. Drain database connection pool
    await pool.end()
    logger.info('Database pool drained')
  } catch (err) {
    logger.error({ err }, 'Error draining database pool')
  }

  process.exit(exitCode)
}

/**
 * Register process-level error handlers for uncaught exceptions,
 * unhandled rejections, and termination signals.
 *
 * Must be called after the HTTP server starts listening and the DB pool
 * is available. Provides crash-safe behavior: log, clean up, exit.
 */
export function setupProcessErrorHandlers(
  server: http.Server,
  pool: pg.Pool,
): void {
  // Reset shutdown flag (supports testing scenarios where handlers are re-registered)
  isShuttingDown = false

  // Prevent accumulating duplicate listeners on repeated calls (e.g., hot reload)
  if (handlersRegistered) {
    logger.warn('Process error handlers already registered — skipping duplicate registration')
    return
  }
  handlersRegistered = true

  process.on('uncaughtException', (error: Error) => {
    logger.fatal(
      { err: error, context: 'uncaughtException' },
      'Uncaught exception — initiating shutdown',
    )
    gracefulShutdown(server, pool, 1).catch(() => process.exit(1))
  })

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(
      { err: reason, context: 'unhandledRejection' },
      'Unhandled promise rejection — initiating shutdown',
    )
    gracefulShutdown(server, pool, 1).catch(() => process.exit(1))
  })

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM — initiating graceful shutdown')
    gracefulShutdown(server, pool, 0).catch(() => process.exit(1))
  })

  process.on('SIGINT', () => {
    logger.info('Received SIGINT — initiating graceful shutdown')
    gracefulShutdown(server, pool, 0).catch(() => process.exit(1))
  })

  logger.info('Process error handlers registered')
}

/**
 * Reset internal state flags. Useful for testing only.
 */
export function resetProcessErrorHandlers(): void {
  isShuttingDown = false
  handlersRegistered = false
}
