import type { Request, Response } from 'express'

import packageJson from '../../package.json'
import { testConnection } from '../utils/database.js'
import { linearClient } from '../services/sync/linear-client.service.js'
import { healthMonitor } from '../services/health/health-monitor.service.js'
import { logger } from '../utils/logger.js'

/** Default timeout for the Linear API health check (ms). Read at call time so tests can override. */
function getLinearHealthTimeoutMs(): number {
  return parseInt(process.env.HEALTH_CHECK_LINEAR_TIMEOUT_MS ?? '5000', 10)
}

/** Application version from package.json or env var. */
const APP_VERSION = process.env.APP_VERSION ?? packageJson.version ?? '0.0.0'

/* ------------------------------------------------------------------ */
/*  Helper: check Linear API connectivity with timeout                 */
/* ------------------------------------------------------------------ */

interface LinearCheckResult {
  status: 'ok' | 'error' | 'not_configured'
  connected: boolean
  reason?: 'not_configured'
  latencyMs?: number
}

/**
 * Track in-flight Linear health check to prevent accumulating concurrent requests.
 * When timeout wins the race, the underlying verifyAuth() keeps running. By reusing
 * the same in-flight promise, we avoid spawning additional requests while one is pending.
 */
let inFlightLinearCheck: Promise<LinearCheckResult> | null = null

async function checkLinearHealth(timeoutMs: number): Promise<LinearCheckResult> {
  // If the API key is not configured, avoid calling the Linear client entirely.
  // This keeps health checks fast and avoids noise in logs.
  if (!process.env.LINEAR_API_KEY) {
    return { status: 'not_configured', connected: false, reason: 'not_configured' }
  }

  // Reuse in-flight check to prevent accumulating concurrent requests during Linear slowness
  if (inFlightLinearCheck) {
    return inFlightLinearCheck
  }

  const start = Date.now()

  const doCheck = async (): Promise<LinearCheckResult> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Linear health check timed out')), timeoutMs)
      })

      const result = await Promise.race([
        linearClient.verifyAuth(),
        timeoutPromise,
      ])

      // verifyAuth succeeded
      if (result?.data) {
        return {
          status: 'ok',
          connected: true,
          latencyMs: Date.now() - start,
        }
      }

      return { status: 'error', connected: false, latencyMs: Date.now() - start }
    } catch (err: unknown) {
      // Check if this is a config error (LINEAR_API_KEY not set)
      if (
        err instanceof Error &&
        (err.name === 'LinearConfigError' || err.message.includes('LINEAR_API_KEY'))
      ) {
        return { status: 'not_configured', connected: false, reason: 'not_configured' }
      }

      return { status: 'error', connected: false, latencyMs: Date.now() - start }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      inFlightLinearCheck = null
    }
  }

  inFlightLinearCheck = doCheck()
  return inFlightLinearCheck
}

/* ------------------------------------------------------------------ */
/*  Helper: determine overall health status                            */
/* ------------------------------------------------------------------ */

type OverallStatus = 'ok' | 'degraded' | 'unhealthy'

function determineOverallStatus(
  dbConnected: boolean,
  linearResult: LinearCheckResult,
): OverallStatus {
  // Database down = unhealthy (critical dependency)
  if (!dbConnected) return 'unhealthy'

  // Linear down but DB up = degraded (application can serve cached data)
  if (linearResult.status === 'error') return 'degraded'

  // Linear not configured is fine — not a failure
  return 'ok'
}

/* ------------------------------------------------------------------ */
/*  GET /api/health — full health status                               */
/* ------------------------------------------------------------------ */

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  logger.debug('Health check requested')

  const [database, linear] = await Promise.all([
    testConnection(),
    checkLinearHealth(getLinearHealthTimeoutMs()),
  ])

  const dbCheck = {
    status: database.connected ? ('ok' as const) : ('error' as const),
    connected: database.connected,
    latencyMs: database.latencyMs,
  }

  const overallStatus = determineOverallStatus(database.connected, linear)

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: APP_VERSION,
    // Legacy field for backward compatibility — consumers may still read response.database
    database,
    checks: {
      database: dbCheck,
      linear,
    },
    metrics: healthMonitor.getMetrics(),
  }

  // Log health check result with appropriate level
  const healthLogger = logger.child({ component: 'health-check' })
  if (overallStatus === 'ok') {
    healthLogger.info({ health: response }, 'Health check: ok')
  } else if (overallStatus === 'degraded') {
    healthLogger.warn({ health: response }, 'Health check: degraded')
  } else {
    healthLogger.error({ health: response }, 'Health check: unhealthy')
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200
  res.status(statusCode).json(response)
}

/* ------------------------------------------------------------------ */
/*  GET /api/health/db — database-only check                           */
/* ------------------------------------------------------------------ */

export const getDbHealth = async (_req: Request, res: Response): Promise<void> => {
  const database = await testConnection()

  const statusCode = database.connected ? 200 : 503
  res.status(statusCode).json({
    status: database.connected ? 'ok' : 'error',
    database,
  })
}

/* ------------------------------------------------------------------ */
/*  GET /api/health/linear — Linear API-only check                     */
/* ------------------------------------------------------------------ */

export const getLinearHealth = async (_req: Request, res: Response): Promise<void> => {
  const linear = await checkLinearHealth(getLinearHealthTimeoutMs())

  const statusCode = linear.status === 'ok' ? 200 : linear.status === 'not_configured' ? 200 : 503
  res.status(statusCode).json({
    status: linear.status === 'ok' ? 'ok' : linear.status === 'not_configured' ? 'not_configured' : 'error',
    linear,
  })
}

/* ------------------------------------------------------------------ */
/*  GET /api/health/ready — readiness probe                            */
/* ------------------------------------------------------------------ */

export const getReady = async (_req: Request, res: Response): Promise<void> => {
  // Only check critical dependencies (database) for readiness.
  // Linear is optional and should not block or delay the readiness probe.
  const database = await testConnection()

  if (!database.connected) {
    res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' })
    return
  }

  res.status(200).json({
    status: 'ready',
    checks: {
      database: {
        status: 'ok' as const,
        connected: database.connected,
        latencyMs: database.latencyMs,
      },
    },
  })
}

/* ------------------------------------------------------------------ */
/*  GET /api/health/live — liveness probe (lightweight)                */
/* ------------------------------------------------------------------ */

export const getLive = async (_req: Request, res: Response): Promise<void> => {
  // Liveness probe — process is running, no dependency checks
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() })
}
