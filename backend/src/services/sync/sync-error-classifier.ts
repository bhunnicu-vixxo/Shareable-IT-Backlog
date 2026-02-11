/**
 * Sync error classification utility.
 *
 * Inspects caught errors and maps them to standardised sync error codes.
 * The frontend then maps these codes to user-friendly messages, keeping
 * the error taxonomy in the backend (single source of truth) and the
 * user experience in the frontend.
 */

import {
  LinearApiError,
  LinearNetworkError,
  LinearConfigError,
} from '../../utils/linear-errors.js'

/** Standardized sync error codes. */
export const SYNC_ERROR_CODES = {
  API_UNAVAILABLE: 'SYNC_API_UNAVAILABLE',
  AUTH_FAILED: 'SYNC_AUTH_FAILED',
  RATE_LIMITED: 'SYNC_RATE_LIMITED',
  CONFIG_ERROR: 'SYNC_CONFIG_ERROR',
  TIMEOUT: 'SYNC_TIMEOUT',
  UNKNOWN: 'SYNC_UNKNOWN_ERROR',
  PARTIAL_SUCCESS: 'SYNC_PARTIAL_SUCCESS',
  TRANSFORM_FAILED: 'SYNC_TRANSFORM_FAILED',
} as const

export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[keyof typeof SYNC_ERROR_CODES]

export interface ClassifiedError {
  code: SyncErrorCode
  /** Sanitised message safe for API response (no stack traces) */
  message: string
}

/**
 * Classify a caught error into a standardised sync error code.
 *
 * Inspects the error type (`LinearApiError`, `LinearNetworkError`,
 * `LinearConfigError`) and message content to determine the
 * appropriate classification.
 */
export function classifySyncError(error: unknown): ClassifiedError {
  // LinearNetworkError → API unavailable
  if (error instanceof LinearNetworkError) {
    return { code: SYNC_ERROR_CODES.API_UNAVAILABLE, message: error.message }
  }

  // LinearConfigError → Config issue
  if (error instanceof LinearConfigError) {
    return { code: SYNC_ERROR_CODES.CONFIG_ERROR, message: error.message }
  }

  // LinearApiError → check type for auth/rate-limit, fallback to API unavailable
  if (error instanceof LinearApiError) {
    if (error.type === 'AUTHENTICATION_ERROR' || error.type === 'PERMISSION_ERROR') {
      return { code: SYNC_ERROR_CODES.AUTH_FAILED, message: 'Linear API authentication failed' }
    }
    if (error.type === 'RATE_LIMITED') {
      return { code: SYNC_ERROR_CODES.RATE_LIMITED, message: 'Linear API rate limit exceeded' }
    }
    if (error.type === 'NOT_FOUND') {
      return {
        code: SYNC_ERROR_CODES.CONFIG_ERROR,
        message: 'Linear project not found — check LINEAR_PROJECT_ID configuration',
      }
    }
    return { code: SYNC_ERROR_CODES.API_UNAVAILABLE, message: error.message }
  }

  // Timeout detection (Node.js fetch abort, ETIMEDOUT, etc.)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('aborted')) {
      return { code: SYNC_ERROR_CODES.TIMEOUT, message: 'Sync operation timed out' }
    }
  }

  // Fallback
  const message = error instanceof Error ? error.message : 'Unknown sync error'
  return { code: SYNC_ERROR_CODES.UNKNOWN, message }
}
