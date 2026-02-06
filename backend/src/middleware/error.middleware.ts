import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

interface AppError extends Error {
  statusCode?: number
  code?: string
  details?: unknown
}

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
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
