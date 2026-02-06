/**
 * Rate-limit information returned alongside every Linear API call.
 */
export interface RateLimitInfo {
  /** Maximum requests allowed per hour (typically 5 000). */
  limit: number
  /** Requests remaining in the current window. */
  remaining: number
  /** Unix-epoch millisecond timestamp when the window resets. */
  reset: number
}

/**
 * Wraps a Linear query result together with the most recent rate-limit
 * snapshot so downstream consumers (Story 2.2) can react to throttling.
 */
export interface LinearQueryResult<T> {
  data: T
  rateLimit: RateLimitInfo | null
}
