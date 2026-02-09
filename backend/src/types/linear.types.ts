/**
 * Rate-limit information for request limits returned alongside every Linear API call.
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
 * Complexity-based rate-limit information from Linear API.
 * Linear charges different "complexity points" per query based on
 * the fields and connections requested.
 */
export interface ComplexityLimitInfo {
  /** Complexity score of the query just executed. */
  complexity: number
  /** Maximum complexity points allowed per hour (typically 3 000 000). */
  limit: number
  /** Remaining complexity points in the current window. */
  remaining: number
  /** Unix-epoch millisecond timestamp when the window resets. */
  reset: number
}

/**
 * Endpoint-specific rate-limit information from Linear API.
 * Certain endpoints may have stricter per-endpoint limits.
 */
export interface EndpointLimitInfo {
  /** Name of the rate-limited endpoint. */
  name: string
  /** Maximum requests for this specific endpoint. */
  limit: number
  /** Remaining requests for this endpoint. */
  remaining: number
  /** Unix-epoch millisecond timestamp when the endpoint window resets. */
  reset: number
}

/**
 * Full rate-limit state combining all three dimensions tracked by Linear:
 * request limits, complexity limits, and endpoint-specific limits.
 */
export interface FullRateLimitInfo {
  /** Request-based rate limits (X-RateLimit-Requests-*). */
  requests: RateLimitInfo | null
  /** Complexity-based rate limits (X-RateLimit-Complexity-*). */
  complexity: ComplexityLimitInfo | null
  /** Endpoint-specific rate limits (X-RateLimit-Endpoint-*). */
  endpoint: EndpointLimitInfo | null
}

/**
 * Wraps a Linear query result together with the most recent rate-limit
 * snapshot so downstream consumers can react to throttling.
 */
export interface LinearQueryResult<T> {
  data: T
  rateLimit: FullRateLimitInfo | null
  /** Pagination info from Linear connection (if available). */
  pageInfo?: {
    hasNextPage: boolean
    endCursor: string | null
  }
}
