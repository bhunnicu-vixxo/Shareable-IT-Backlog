import type { Request, Response, NextFunction } from 'express'
import { testConnection } from '../utils/database.js'
import { logger } from '../utils/logger.js'

/**
 * Cached DB health status to avoid hammering the database with health checks
 * on every request. Cache is valid for 5 seconds.
 */
let cachedHealth: { connected: boolean; checkedAt: number } = {
  connected: true,
  checkedAt: 0,
}

const CACHE_TTL_MS = 5_000

/**
 * Middleware that pre-checks database connectivity before allowing requests
 * to proceed to route handlers.
 *
 * Returns 503 immediately when the database is down, preventing requests
 * from failing deeper in the stack with less informative errors.
 *
 * Health check results are cached for 5 seconds to avoid excessive probing.
 *
 * This middleware should NOT be applied to health/live/ready endpoints,
 * as those have their own dedicated health check logic.
 */
export async function databaseHealthMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const now = Date.now()

  // Use cached result if still fresh
  if (now - cachedHealth.checkedAt < CACHE_TTL_MS) {
    if (!cachedHealth.connected) {
      res
        .status(503)
        .set('Retry-After', '30')
        .json({
          error: {
            message: 'Service temporarily unavailable. Please try again.',
            code: 'DATABASE_UNAVAILABLE',
            retryAfter: 30,
          },
        })
      return
    }
    next()
    return
  }

  // Cache expired — perform a fresh health check
  const result = await testConnection()
  cachedHealth = { connected: result.connected, checkedAt: now }

  if (!result.connected) {
    logger.warn('Database health check failed — returning 503 to client')
    res
      .status(503)
      .set('Retry-After', '30')
      .json({
        error: {
          message: 'Service temporarily unavailable. Please try again.',
          code: 'DATABASE_UNAVAILABLE',
          retryAfter: 30,
        },
      })
    return
  }

  next()
}

/**
 * Reset the cached health status. Useful for testing.
 */
export function resetDatabaseHealthCache(): void {
  cachedHealth = { connected: true, checkedAt: 0 }
}
