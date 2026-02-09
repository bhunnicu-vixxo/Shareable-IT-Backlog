import { parseLinearError } from '@linear/sdk'

import { logger } from '../../utils/logger.js'
import { rateLimiter } from './rate-limiter.js'

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

/**
 * Configuration for the transient error retry handler.
 */
export interface RetryHandlerConfig {
  /** Maximum number of retries for transient errors (default: 3). */
  maxRetries: number
  /** Initial retry delay in milliseconds (default: 1000). */
  initialRetryDelayMs: number
  /** Multiplier for exponential backoff (default: 2). */
  retryMultiplier: number
  /** Maximum retry delay in milliseconds (default: 8000). */
  maxRetryDelayMs: number
}

const DEFAULT_CONFIG: RetryHandlerConfig = {
  maxRetries: 3,
  initialRetryDelayMs: 1000,
  retryMultiplier: 2,
  maxRetryDelayMs: 8000,
}

/* ------------------------------------------------------------------ */
/*  Network error detection signals                                    */
/* ------------------------------------------------------------------ */

/** Error message substrings that indicate a transient network error. */
const NETWORK_ERROR_SIGNALS = [
  'econnrefused',
  'econnreset',
  'etimedout',
  'enotfound',
  'und_err_connect_timeout',
  'fetch failed',
  'network',
  'dns',
  'getaddrinfo',
  'timeout',
] as const

/** Node error codes that indicate a transient network error. */
const NETWORK_ERROR_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
] as const

/* ------------------------------------------------------------------ */
/*  RetryHandler class                                                 */
/* ------------------------------------------------------------------ */

/**
 * Transient error retry handler with exponential backoff.
 *
 * Sits as the **outer** retry layer around the rate-limiter's inner retry.
 * Only retries on transient errors (network failures, 5xx server errors).
 * Rate-limit errors are explicitly excluded — they are handled by the
 * `RateLimiter` from Story 2.2.
 *
 * Execution flow:
 * ```
 * retryHandler.executeWithRetry(operation,
 *   () => rateLimiter.executeWithRetry(
 *     () => fn() + refreshRateLimitInfo()
 *   )
 * )
 * ```
 */
export class RetryHandler {
  private readonly config: RetryHandlerConfig

  constructor(config: Partial<RetryHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /* ---------------------------------------------------------------- */
  /*  Retryable error detection                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Determine whether an error is transient and should be retried.
   *
   * **CRITICAL:** Rate-limited errors are excluded — they are handled
   * exclusively by the `RateLimiter`.
   */
  isRetryable(error: unknown): boolean {
    // Never retry rate-limited errors — handled by rate-limiter
    if (rateLimiter.isRateLimited(error)) return false

    if (!(error instanceof Error)) return false

    // Check for network/transient error signals
    const msg = error.message.toLowerCase()
    const code = 'code' in error ? String((error as Record<string, unknown>).code) : ''

    // Network connectivity errors
    if (this.isNetworkError(msg, code)) return true

    // 5xx server errors from SDK
    if (this.isServerError(error)) return true

    return false
  }

  /* ---------------------------------------------------------------- */
  /*  Execute with retry                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Execute an operation with automatic retry on transient errors.
   *
   * Uses exponential backoff with 10% jitter.
   * Non-retryable errors (4xx, rate-limit, GraphQL) are thrown immediately.
   *
   * @param operation - Name of the operation (for structured logging)
   * @param fn        - The async operation to execute
   */
  async executeWithRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error: unknown) {
        if (!this.isRetryable(error)) {
          throw error
        }

        lastError = error

        if (attempt === this.config.maxRetries) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error(
            {
              service: 'retry-handler',
              operation,
              attempt,
              maxRetries: this.config.maxRetries,
              error: message,
            },
            'Transient retries exhausted',
          )
          break
        }

        const delayMs = this.calculateRetryDelay(attempt)
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(
          {
            service: 'retry-handler',
            operation,
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries,
            delayMs,
            error: message,
          },
          'Transient error — retrying with backoff',
        )
        await this.sleep(delayMs)
      }
    }

    throw lastError
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Detect network connectivity errors from error message and code.
   */
  private isNetworkError(msg: string, code: string): boolean {
    for (const signal of NETWORK_ERROR_SIGNALS) {
      if (msg.includes(signal)) return true
    }

    for (const errorCode of NETWORK_ERROR_CODES) {
      if (code === errorCode) return true
    }

    return false
  }

  /**
   * Detect HTTP 5xx server errors using the SDK's parseLinearError.
   */
  private isServerError(error: unknown): boolean {
    try {
      const parsed = parseLinearError(error as never)
      return parsed.status !== undefined && parsed.status >= 500
    } catch {
      return false
    }
  }

  /**
   * Calculate retry delay with exponential backoff and 10% jitter.
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay =
      this.config.initialRetryDelayMs *
      Math.pow(this.config.retryMultiplier, attempt)
    const jitter = Math.random() * baseDelay * 0.1 // 10% jitter
    return Math.min(baseDelay + jitter, this.config.maxRetryDelayMs)
  }

  /** Testable sleep wrapper (same pattern as RateLimiter). */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/** Singleton retry handler with default configuration. */
export const retryHandler = new RetryHandler()
