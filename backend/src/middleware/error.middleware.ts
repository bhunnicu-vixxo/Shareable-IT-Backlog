import type { Request, Response, NextFunction } from 'express'
import { LinearApiError, LinearConfigError } from '../utils/linear-errors.js'
import { logger } from '../utils/logger.js'
import { rateLimiter } from '../services/sync/rate-limiter.js'

interface AppError extends Error {
  statusCode?: number
  code?: string
  details?: unknown
}

/** Default Retry-After value (in seconds) when rate-limited by Linear API. */
const DEFAULT_RETRY_AFTER_SECONDS = 60

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Handle Linear API rate limit errors with HTTP 503 + Retry-After header
  if (err instanceof LinearApiError && err.type === 'RATE_LIMITED') {
    const suggestedRetryMs = rateLimiter.getSuggestedRetryAfterMs()
    const retryAfterSeconds =
      suggestedRetryMs && suggestedRetryMs > 0
        ? Math.max(1, Math.ceil(suggestedRetryMs / 1000))
        : DEFAULT_RETRY_AFTER_SECONDS
    logger.error({ err, code: err.code }, 'Rate limited by Linear API')
    res
      .status(503)
      .set('Retry-After', String(retryAfterSeconds))
      .json({
        error: {
          message: 'Service temporarily unavailable due to upstream rate limiting. Please retry later.',
          code: 'RATE_LIMITED',
          ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
        },
      })
    return
  }

  // Handle configuration errors with HTTP 400
  if (err instanceof LinearConfigError) {
    logger.error({ err, code: err.code }, 'Configuration error')
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    })
    return
  }

  const statusCode = err.statusCode ?? 500
  const code = err.code ?? 'INTERNAL_ERROR'

  logger.error({ err, statusCode, code }, 'Unhandled error')

  res.status(statusCode).json({
    error: {
      message:
        statusCode === 500
          ? 'Unexpected server error. Please try again. If the problem persists, contact IT and provide the error code.'
          : err.message,
      code,
      ...(process.env.NODE_ENV !== 'production' && { details: err.details ?? err.message }),
    },
  })
}
