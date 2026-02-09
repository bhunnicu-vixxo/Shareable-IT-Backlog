import type {
  RateLimitInfo,
  ComplexityLimitInfo,
  EndpointLimitInfo,
  FullRateLimitInfo,
} from '../../types/linear.types.js'
import { logger } from '../../utils/logger.js'

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

/**
 * Configuration for the rate limiter's throttling and retry behaviour.
 */
export interface RateLimiterConfig {
  /** Fraction of the limit at which to start delaying (default: 0.10 = 10%). */
  safetyThresholdPercent: number
  /** Fraction of the limit at which to log warnings (default: 0.20 = 20%). */
  warningThresholdPercent: number
  /** Maximum number of retries on rate-limit errors (default: 3). */
  maxRetries: number
  /** Initial retry delay in milliseconds (default: 1000). */
  initialRetryDelayMs: number
  /** Multiplier for exponential backoff (default: 2). */
  retryMultiplier: number
  /** Maximum retry delay in milliseconds (default: 30000). */
  maxRetryDelayMs: number
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  safetyThresholdPercent: 0.10,
  warningThresholdPercent: 0.20,
  maxRetries: 3,
  initialRetryDelayMs: 1000,
  retryMultiplier: 2,
  maxRetryDelayMs: 30_000,
}

/** Tokens refilled per second for Linear's leaky bucket (limit / 3600). */
const SECONDS_PER_HOUR = 3600

/* ------------------------------------------------------------------ */
/*  RateLimiter class                                                  */
/* ------------------------------------------------------------------ */

/**
 * Client-side rate limiter for Linear API calls.
 *
 * Tracks all three rate-limit dimensions (requests, complexity, endpoint),
 * provides pre-flight throttling based on Linear's leaky-bucket algorithm,
 * and wraps operations with exponential backoff retry on rate-limit errors.
 */
export class RateLimiter {
  private state: FullRateLimitInfo | null = null
  private lastUpdatedAt: {
    requests?: number
    complexity?: number
    endpoint?: number
  } = {}
  private readonly config: RateLimiterConfig

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /* ---------------------------------------------------------------- */
  /*  Header parsing                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Parse all rate-limit headers from a Linear API response and update
   * internal state.  Returns the parsed state.
   */
  updateFromHeaders(headers: Headers): FullRateLimitInfo {
    const now = Date.now()
    const requests = this.parseRequestHeaders(headers)
    const complexity = this.parseComplexityHeaders(headers)
    const endpoint = this.parseEndpointHeaders(headers)

    this.state = { requests, complexity, endpoint }
    this.lastUpdatedAt = {
      requests: requests ? now : undefined,
      complexity: complexity ? now : undefined,
      endpoint: endpoint ? now : undefined,
    }

    this.logRateLimitStatus()

    return this.state
  }

  private parseRequestHeaders(headers: Headers): RateLimitInfo | null {
    const limit = headers.get('X-RateLimit-Requests-Limit')
    const remaining = headers.get('X-RateLimit-Requests-Remaining')
    const reset = headers.get('X-RateLimit-Requests-Reset')

    if (!limit || !remaining || !reset) return null

    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    }
  }

  private parseComplexityHeaders(headers: Headers): ComplexityLimitInfo | null {
    const complexityHeader = headers.get('X-Complexity')
    const limit = headers.get('X-RateLimit-Complexity-Limit')
    const remaining = headers.get('X-RateLimit-Complexity-Remaining')
    const reset = headers.get('X-RateLimit-Complexity-Reset')

    if (!limit || !remaining || !reset) return null

    return {
      complexity: complexityHeader ? parseInt(complexityHeader, 10) : 0,
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    }
  }

  private parseEndpointHeaders(headers: Headers): EndpointLimitInfo | null {
    const name = headers.get('X-RateLimit-Endpoint-Name')
    const limit = headers.get('X-RateLimit-Endpoint-Requests-Limit')
    const remaining = headers.get('X-RateLimit-Endpoint-Requests-Remaining')
    const reset = headers.get('X-RateLimit-Endpoint-Requests-Reset')

    if (!name || !limit || !remaining || !reset) return null

    return {
      name,
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Pre-flight throttle                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Pre-flight check: if remaining tokens are below the safety threshold,
   * delay until enough tokens have refilled per Linear's leaky-bucket
   * algorithm (refillRate = limit / 3600 tokens per second).
   */
  async waitIfNeeded(): Promise<void> {
    if (!this.state) return

    const waitMs = this.calculateWaitMs()
    if (waitMs <= 0) return

    logger.warn(
      { service: 'rate-limiter', waitMs },
      'Throttling request — approaching rate limit',
    )

    await this.sleep(waitMs)
  }

  /**
   * Calculate the wait time in ms based on leaky-bucket refill estimation.
   * Checks request limits and complexity limits; returns the longer wait.
   */
  private calculateWaitMs(): number {
    let maxWait = 0

    if (this.state?.requests) {
      const wait = this.calculateDimensionWait(
        this.state.requests,
        this.lastUpdatedAt.requests,
      )
      if (wait > maxWait) maxWait = wait
    }

    if (this.state?.complexity) {
      const { limit, remaining, reset } = this.state.complexity
      const wait = this.calculateDimensionWait(
        { limit, remaining, reset },
        this.lastUpdatedAt.complexity,
      )
      if (wait > maxWait) maxWait = wait
    }

    if (this.state?.endpoint) {
      const { limit, remaining, reset } = this.state.endpoint
      const wait = this.calculateDimensionWait(
        { limit, remaining, reset },
        this.lastUpdatedAt.endpoint,
      )
      if (wait > maxWait) maxWait = wait
    }

    return maxWait
  }

  /**
   * For a single rate-limit dimension, calculate how long to wait (in ms)
   * for enough tokens to refill above the safety threshold.
   *
   * Uses leaky-bucket model: refillRate = limit / 3600 tokens/second.
   */
  private calculateDimensionWait(info: {
    limit: number
    remaining: number
    reset: number
  }, updatedAt?: number): number {
    if (info.limit <= 0) return 0
    const now = Date.now()

    const safetyThreshold = Math.ceil(info.limit * this.config.safetyThresholdPercent)

    // Estimate tokens that have refilled since the last header update
    const lastUpdatedAt = updatedAt ?? now
    const elapsed = Math.max(0, now - lastUpdatedAt)
    const refillRate = info.limit / SECONDS_PER_HOUR
    const refilled = Math.max(0, Math.floor((elapsed / 1000) * refillRate))
    const estimated = Math.min(info.remaining + refilled, info.limit)

    if (estimated >= safetyThreshold) return 0

    // Calculate time needed for enough tokens to refill
    const tokensNeeded = safetyThreshold - estimated
    return Math.ceil((tokensNeeded / refillRate) * 1000)
  }

  /* ---------------------------------------------------------------- */
  /*  Rate-limit error detection                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Detect whether an error is a Linear rate-limit response.
   * Linear returns HTTP 400 with `extensions.code === 'RATELIMITED'`,
   * NOT HTTP 429.
   */
  isRateLimited(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    // Check for RATELIMITED code in GraphQL error extensions
    const raw = this.extractRawResponse(error)
    const errors = raw?.response?.errors
    if (Array.isArray(errors)) {
      const found = errors.some(
        (e: { extensions?: { code?: string } }) =>
          e.extensions?.code === 'RATELIMITED',
      )
      if (found) return true
    }

    // Fallback: check message
    return error.message.toLowerCase().includes('rate limit')
  }

  private extractRawResponse(
    error: unknown,
  ): { response?: { errors?: Array<{ extensions?: { code?: string } }> } } | null {
    if (!error || typeof error !== 'object') return null

    try {
      // The SDK's parseLinearError attaches .raw with .response
      const err = error as Record<string, unknown>
      if (err.raw && typeof err.raw === 'object') {
        return err.raw as { response?: { errors?: Array<{ extensions?: { code?: string } }> } }
      }

      // Try direct access to nested response (some SDK versions)
      if (err.response && typeof err.response === 'object') {
        return { response: err.response as { errors?: Array<{ extensions?: { code?: string } }> } }
      }
    } catch {
      // Swallow extraction errors
    }

    return null
  }

  /* ---------------------------------------------------------------- */
  /*  Retry with exponential backoff                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Execute an operation with automatic retry on rate-limit errors.
   *
   * Uses exponential backoff with jitter: delay = min(initial * 2^attempt + jitter, maxDelay).
   * Non-rate-limit errors are passed through immediately.
   */
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error: unknown) {
        if (!this.isRateLimited(error)) {
          throw error
        }

        lastError = error

        if (attempt === this.config.maxRetries) {
          logger.error(
            { service: 'rate-limiter', attempt, maxRetries: this.config.maxRetries },
            'Rate limit retries exhausted',
          )
          break
        }

        const delay = this.calculateRetryDelay(attempt)
        logger.warn(
          { service: 'rate-limiter', attempt: attempt + 1, delayMs: delay },
          'Rate limited — retrying with backoff',
        )
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  /**
   * Calculate retry delay with exponential backoff and jitter.
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay =
      this.config.initialRetryDelayMs *
      Math.pow(this.config.retryMultiplier, attempt)
    const jitter = Math.random() * baseDelay * 0.1 // 10% jitter
    return Math.min(baseDelay + jitter, this.config.maxRetryDelayMs)
  }

  /* ---------------------------------------------------------------- */
  /*  State accessors                                                  */
  /* ---------------------------------------------------------------- */

  /** Returns the current full rate-limit state, or null if no API calls yet. */
  getState(): FullRateLimitInfo | null {
    return this.state
  }

  /**
   * Suggest a Retry-After delay (ms) based on current rate-limit state.
   * Returns null when no delay is needed or no state is available.
   */
  getSuggestedRetryAfterMs(): number | null {
    if (!this.state) return null
    const waitMs = this.calculateWaitMs()
    return waitMs > 0 ? waitMs : null
  }

  /* ---------------------------------------------------------------- */
  /*  Observability                                                    */
  /* ---------------------------------------------------------------- */

  private logRateLimitStatus(): void {
    if (!this.state) return

    if (this.state.requests) {
      const pctRemaining =
        this.state.requests.remaining / this.state.requests.limit
      if (pctRemaining < this.config.safetyThresholdPercent) {
        logger.error(
          {
            service: 'rate-limiter',
            dimension: 'requests',
            remaining: this.state.requests.remaining,
            limit: this.state.requests.limit,
          },
          'Rate limit critically low',
        )
      } else if (pctRemaining < this.config.warningThresholdPercent) {
        logger.warn(
          {
            service: 'rate-limiter',
            dimension: 'requests',
            remaining: this.state.requests.remaining,
            limit: this.state.requests.limit,
          },
          'Approaching rate limit',
        )
      } else {
        logger.debug(
          {
            service: 'rate-limiter',
            dimension: 'requests',
            remaining: this.state.requests.remaining,
            limit: this.state.requests.limit,
          },
          'Rate limit status',
        )
      }
    }

    if (this.state.complexity) {
      const pctRemaining =
        this.state.complexity.remaining / this.state.complexity.limit
      if (pctRemaining < this.config.safetyThresholdPercent) {
        logger.error(
          {
            service: 'rate-limiter',
            dimension: 'complexity',
            remaining: this.state.complexity.remaining,
            limit: this.state.complexity.limit,
          },
          'Complexity limit critically low',
        )
      } else if (pctRemaining < this.config.warningThresholdPercent) {
        logger.warn(
          {
            service: 'rate-limiter',
            dimension: 'complexity',
            remaining: this.state.complexity.remaining,
            limit: this.state.complexity.limit,
          },
          'Approaching complexity limit',
        )
      } else {
        logger.debug(
          {
            service: 'rate-limiter',
            dimension: 'complexity',
            remaining: this.state.complexity.remaining,
            limit: this.state.complexity.limit,
          },
          'Complexity limit status',
        )
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Utilities                                                        */
  /* ---------------------------------------------------------------- */

  /** Testable sleep wrapper. */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/** Singleton rate limiter with default configuration. */
export const rateLimiter = new RateLimiter()
