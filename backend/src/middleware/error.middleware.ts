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

/**
 * Credential-like field names that must be stripped from error response details.
 * Prevents accidental leakage of credential values in API error responses.
 */
const CREDENTIAL_FIELD_PATTERNS = new Set([
  'password',
  'apikey',
  'secret',
  'token',
  'linear_api_key',
  'session_secret',
  'credential_encryption_key',
  'db_encryption_key',
  'database_url',
  'sync_trigger_token',
  'credential',
  'credentials',
  'authorization',
])

/**
 * Best-effort redaction for credential-like substrings embedded in error strings.
 * This is intentionally heuristic (we cannot perfectly detect arbitrary secrets),
 * but it prevents common accidental leaks such as connection strings, enc: blobs,
 * and Bearer tokens.
 */
function sanitizeErrorString(value: string): string {
  return (
    value
      // Common key=value / key: value patterns
      .replace(
        /\b(password|apiKey|secret|token)\b\s*[:=]\s*([^\s,;]+)/gi,
        (_m, key) => `${key}=[REDACTED]`,
      )
      .replace(
        /\b(LINEAR_API_KEY|SESSION_SECRET|CREDENTIAL_ENCRYPTION_KEY|DB_ENCRYPTION_KEY|DATABASE_URL|SYNC_TRIGGER_TOKEN)\b\s*[:=]\s*([^\s,;]+)/g,
        (_m, key) => `${key}=[REDACTED]`,
      )
      // enc:<base64...>
      .replace(/enc:[A-Za-z0-9+/=]+/g, 'enc:[REDACTED]')
      // postgres / postgresql URLs (may contain embedded credentials)
      .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, '[REDACTED]')
      // Bearer tokens
      .replace(/bearer\s+[A-Za-z0-9\-._~+/=]+/gi, 'Bearer [REDACTED]')
      // Linear API keys (common prefix)
      .replace(/lin_api_[A-Za-z0-9]+/gi, 'lin_api_[REDACTED]')
  )
}

/**
 * Recursively strip credential-like fields from an object before sending as error details.
 * Returns a shallow clone with sensitive fields replaced by '[REDACTED]'.
 */
function sanitizeErrorDetails(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return sanitizeErrorString(value)
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sanitizeErrorDetails)

  const sanitized: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (CREDENTIAL_FIELD_PATTERNS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeErrorDetails(val)
    } else {
      sanitized[key] = val
    }
  }
  return sanitized
}

/**
 * PostgreSQL error codes that indicate the database is unavailable.
 * These map to transient connection/availability issues, not application bugs.
 *
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_UNAVAILABLE_CODES = new Set([
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08006', // connection_failure
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
])

/** System-level error codes from Node.js that indicate connection failure. */
const SYSTEM_CONNECTION_ERRORS = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
])

/**
 * Check whether an error is explicitly from a non-database source.
 * This helps avoid misclassifying HTTP or other network errors as database errors.
 */
function isNonDatabaseNetworkError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as Record<string, unknown>
  // LinearNetworkError and similar wrapped errors have distinctive names
  if (typeof e.name === 'string' && e.name.includes('Linear')) return true
  // Errors with 'type' set to a Linear-specific value
  if (typeof e.type === 'string' && e.type.startsWith('LINEAR_')) return true
  // HTTP library errors (fetch, axios, etc.) often have 'cause' or 'response' properties
  if ('response' in e && typeof e.response === 'object') return true
  return false
}

/**
 * Check whether an error indicates database unavailability.
 * Handles both PostgreSQL protocol-level errors (with `code` field)
 * and system-level connection errors (ECONNREFUSED, etc.).
 *
 * Note: System-level codes (ECONNREFUSED, etc.) are generic TCP errors that
 * could theoretically come from non-database connections. We exclude known
 * non-database error types (e.g., LinearNetworkError) to reduce false positives.
 */
function isDatabaseUnavailableError(err: AppError): boolean {
  const code = err.code ?? ''
  // PostgreSQL protocol codes are always database errors
  if (PG_UNAVAILABLE_CODES.has(code)) return true
  // Skip known non-database network errors
  if (isNonDatabaseNetworkError(err)) return false
  // System-level connection errors are assumed to be database errors
  // in the absence of evidence they come from another source
  if (SYSTEM_CONNECTION_ERRORS.has(code)) return true
  // pg module sometimes sets errno on the error directly
  if ('errno' in err && typeof (err as Record<string, unknown>).errno === 'string') {
    if (SYSTEM_CONNECTION_ERRORS.has((err as Record<string, unknown>).errno as string)) return true
  }
  return false
}

/** Default Retry-After for database unavailability (seconds). */
const DB_RETRY_AFTER_SECONDS = 30

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Handle database unavailability with HTTP 503 + Retry-After header
  if (isDatabaseUnavailableError(err)) {
    logger.error({ err, code: err.code }, 'Database unavailable')
    res
      .status(503)
      .set('Retry-After', String(DB_RETRY_AFTER_SECONDS))
      .json({
        error: {
          message: 'Service temporarily unavailable. Please try again.',
          code: 'DATABASE_UNAVAILABLE',
          retryAfter: DB_RETRY_AFTER_SECONDS,
        },
      })
    return
  }

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
          ...(process.env.NODE_ENV !== 'production' && { details: sanitizeErrorDetails(err.message) }),
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
          : sanitizeErrorString(err.message),
      code,
      ...(process.env.NODE_ENV !== 'production' && {
        details: sanitizeErrorDetails(err.details ?? err.message),
      }),
    },
  })
}
