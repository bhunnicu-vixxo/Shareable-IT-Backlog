import {
  LinearClient,
  LinearErrorType,
  parseLinearError,
  type Comment,
  type Issue,
} from '@linear/sdk'

import { getLinearConfig } from '../../config/linear.config.js'
import type { FullRateLimitInfo, LinearQueryResult } from '../../types/linear.types.js'
import {
  LinearApiError,
  LinearNetworkError,
  LinearConfigError,
  type LinearApiErrorType,
} from '../../utils/linear-errors.js'
import { logger } from '../../utils/logger.js'
import { rateLimiter } from './rate-limiter.js'
import { retryHandler } from './retry-handler.js'

/**
 * Abstraction over the Linear GraphQL API.
 *
 * Uses the official `@linear/sdk` for strongly-typed queries and wraps
 * every call with structured logging, error classification, and
 * rate-limit header tracking.
 *
 * **Design notes**
 * - Lazy initialisation: the SDK client is created on first use so that
 *   importing this module in tests / other modules that don't need Linear
 *   won't crash when `LINEAR_API_KEY` is absent.
 * - Rate-limit tracking: a patched `globalThis.fetch` is installed for the
 *   duration of each SDK call to capture `X-RateLimit-*` response headers.
 * - Error classification: SDK / network errors are re-thrown as
 *   `LinearApiError` or `LinearNetworkError` for typed handling upstream.
 */
export class LinearClientService {
  private client: LinearClient | null = null

  /* ------------------------------------------------------------------ */
  /*  Initialisation helpers                                             */
  /* ------------------------------------------------------------------ */

  private getClient(): LinearClient {
    if (this.client) return this.client

    try {
      const config = getLinearConfig()
      this.client = new LinearClient({ apiKey: config.apiKey, apiUrl: config.apiUrl })
      return this.client
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to initialise Linear client'
      throw new LinearConfigError(message)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Rate-limit header parsing                                          */
  /* ------------------------------------------------------------------ */

  /**
   * The Linear SDK does not reliably expose response headers for high-level model
   * methods (e.g. `client.issues()`).
   *
   * We perform a lightweight probe request after each SDK operation using the
   * SDK's underlying GraphQL client `rawRequest`, which *does* return headers.
   * All three rate-limit dimensions (request, complexity, endpoint) are now
   * parsed by the shared `rateLimiter` instance.
   */
  private async refreshRateLimitInfo(): Promise<void> {
    const client = this.getClient()

    try {
      const raw = await client.client.rawRequest<
        { viewer: { id: string } },
        Record<string, never>
      >(
        /* GraphQL */ 'query RateLimitProbe { viewer { id } }',
      )
      if (raw.headers) {
        rateLimiter.updateFromHeaders(raw.headers)
      }
    } catch (err: unknown) {
      // Do not fail the primary operation due to probe failure.
      logger.debug(
        { service: 'linear-client', operation: 'rateLimitProbe', error: err },
        'Rate limit probe failed',
      )
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Core execution wrapper                                             */
  /* ------------------------------------------------------------------ */

  private async executeWithRateTracking<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<LinearQueryResult<T>> {
    const start = performance.now()

    // Pre-flight throttle: delay if approaching rate limits
    await rateLimiter.waitIfNeeded()

    try {
      // Two-layer retry: outer = transient (network/5xx), inner = rate-limit
      const result = await retryHandler.executeWithRetry(operation, async () => {
        return await rateLimiter.executeWithRetry(async () => {
          const fnResult = await fn()
          await this.refreshRateLimitInfo()
          return fnResult
        })
      })
      const durationMs = Math.round(performance.now() - start)

      // Post-call observability logging
      const state = rateLimiter.getState()
      if (state?.requests) {
        const pctRemaining = state.requests.remaining / state.requests.limit
        if (pctRemaining < 0.20) {
          logger.warn(
            { service: 'linear-client', operation, rateLimit: state.requests },
            'Approaching rate limit',
          )
        }
      }

      logger.debug({ service: 'linear-client', operation, durationMs })

      // Handle results that may include pageInfo (for paginated queries)
      if (
        result &&
        typeof result === 'object' &&
        'nodes' in result &&
        'pageInfo' in result
      ) {
        const paginatedResult = result as {
          nodes: unknown[]
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
        }
        return {
          data: paginatedResult.nodes as T,
          rateLimit: rateLimiter.getState(),
          pageInfo: paginatedResult.pageInfo
            ? {
                hasNextPage: paginatedResult.pageInfo.hasNextPage ?? false,
                endCursor: paginatedResult.pageInfo.endCursor ?? null,
              }
            : undefined,
        }
      }

      return { data: result as T, rateLimit: rateLimiter.getState() }
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - start)
      throw this.classifyError(operation, error, durationMs)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Error classification                                               */
  /* ------------------------------------------------------------------ */

  private classifyError(
    operation: string,
    error: unknown,
    durationMs: number,
  ): LinearApiError | LinearNetworkError {
    const message = error instanceof Error ? error.message : String(error)
    const parsed = this.parseSdkError(error)

    // If the SDK provided headers on an error response, capture them.
    if (parsed.headers) {
      rateLimiter.updateFromHeaders(parsed.headers)
    }

    // Rate-limit errors (Linear returns HTTP 400 with RATELIMITED GraphQL code)
    if (rateLimiter.isRateLimited(error) || this.hasRateLimitedCode(parsed.raw)) {
      const apiError = new LinearApiError({
        message,
        code: 'RATE_LIMITED',
        type: 'RATE_LIMITED',
        raw: parsed.raw ?? error,
      })
      logger.error({
        service: 'linear-client',
        operation,
        error: apiError.message,
        type: apiError.type,
        durationMs,
      })
      return apiError
    }

    const isServerError = parsed.status !== undefined && parsed.status >= 500

    // Network-level errors (including transient 5xx server errors)
    if (
      parsed.linearType === LinearErrorType.NetworkError ||
      this.isNetworkError(error) ||
      isServerError
    ) {
      const networkError = this.buildNetworkError(message, error)
      logger.error({
        service: 'linear-client',
        operation,
        error: networkError.message,
        code: networkError.code,
        durationMs,
      })
      return networkError
    }

    // API-level errors
    const apiErrorType = this.resolveApiErrorType(message, parsed.status, parsed.linearType)
    const apiError = new LinearApiError({
      message,
      code: apiErrorType,
      type: apiErrorType,
      raw: parsed.raw ?? error,
    })
    logger.error({
      service: 'linear-client',
      operation,
      error: apiError.message,
      type: apiError.type,
      status: parsed.status,
      durationMs,
    })
    return apiError
  }

  private parseSdkError(error: unknown): {
    status: number | undefined
    linearType: LinearErrorType | undefined
    headers: Headers | undefined
    raw: unknown
  } {
    if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
      return { status: undefined, linearType: undefined, headers: undefined, raw: undefined }
    }

    try {
      const parsed = parseLinearError(error as never)
      const headers = parsed.raw?.response?.headers
      return {
        status: parsed.status,
        linearType: parsed.type,
        headers: headers ?? undefined,
        raw: parsed,
      }
    } catch {
      return { status: undefined, linearType: undefined, headers: undefined, raw: undefined }
    }
  }

  /**
   * Check if a parsed SDK error contains the RATELIMITED GraphQL error code.
   */
  private hasRateLimitedCode(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false

    try {
      const parsed = raw as { raw?: { response?: { errors?: Array<{ extensions?: { code?: string } }> } } }
      const errors = parsed.raw?.response?.errors
      if (Array.isArray(errors)) {
        return errors.some(
          (e) => e.extensions?.code === 'RATELIMITED',
        )
      }
    } catch {
      // Swallow extraction errors
    }

    return false
  }

  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message.toLowerCase()
    const code =
      'code' in error ? String((error as Record<string, unknown>).code) : ''
    return (
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('enotfound') ||
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('dns') ||
      code === 'ECONNREFUSED' ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'UND_ERR_CONNECT_TIMEOUT'
    )
  }

  private buildNetworkError(
    message: string,
    cause: unknown,
  ): LinearNetworkError {
    const lower = message.toLowerCase()
    if (lower.includes('timeout') || lower.includes('etimedout')) {
      return new LinearNetworkError({ message, code: 'TIMEOUT', cause })
    }
    if (
      lower.includes('enotfound') ||
      lower.includes('dns') ||
      lower.includes('getaddrinfo')
    ) {
      return new LinearNetworkError({ message, code: 'DNS_FAILURE', cause })
    }
    return new LinearNetworkError({ message, code: 'NETWORK_ERROR', cause })
  }

  private resolveApiErrorType(
    message: string,
    status: number | undefined,
    linearType: LinearErrorType | undefined,
  ): LinearApiErrorType {
    const lower = message.toLowerCase()

    if (status === 404 || lower.includes('not found')) {
      return 'NOT_FOUND'
    }

    if (status === 401 || linearType === LinearErrorType.AuthenticationError) {
      return 'AUTHENTICATION_ERROR'
    }

    if (status === 403 || linearType === LinearErrorType.Forbidden) {
      return 'PERMISSION_ERROR'
    }

    if (
      lower.includes('authentication') ||
      lower.includes('unauthorized') ||
      lower.includes('invalid api key')
    ) {
      return 'AUTHENTICATION_ERROR'
    }
    if (
      lower.includes('permission') ||
      lower.includes('forbidden')
    ) {
      return 'PERMISSION_ERROR'
    }
    return 'GRAPHQL_ERROR'
  }

  /* ------------------------------------------------------------------ */
  /*  Public query methods                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Verify authentication by fetching the current viewer's info.
   * Useful as a health-check for Linear connectivity.
   */
  async verifyAuth(): Promise<
    LinearQueryResult<{ id: string; name: string; email: string }>
  > {
    const client = this.getClient()
    return this.executeWithRateTracking('verifyAuth', async () => {
      const viewer = await client.viewer
      return { id: viewer.id, name: viewer.name, email: viewer.email ?? '' }
    })
  }

  /**
   * Fetch issues belonging to a Linear project.
   *
   * @param projectId - UUID of the Linear project.
   * @param options   - Pagination options (`first` defaults to 50).
   */
  async getIssuesByProject(
    projectId: string,
    options?: { first?: number; after?: string },
  ): Promise<LinearQueryResult<Issue[]>> {
    const client = this.getClient()
    const first = options?.first ?? 50
    const after = options?.after

    // We need both nodes and pageInfo, so we'll execute the query manually
    // to extract pageInfo while still using rate limiting
    const start = performance.now()
    await rateLimiter.waitIfNeeded()

    try {
      const connection = await retryHandler.executeWithRetry('getIssuesByProject', async () => {
        return await rateLimiter.executeWithRetry(async () => {
          const result = await client.issues({
            filter: { project: { id: { eq: projectId } } },
            first,
            after,
          })
          await this.refreshRateLimitInfo()
          return result
        })
      })
      const durationMs = Math.round(performance.now() - start)

      // Post-call observability logging
      const state = rateLimiter.getState()
      if (state?.requests) {
        const pctRemaining = state.requests.remaining / state.requests.limit
        if (pctRemaining < 0.20) {
          logger.warn(
            { service: 'linear-client', operation: 'getIssuesByProject', rateLimit: state.requests },
            'Approaching rate limit',
          )
        }
      }

      logger.debug({ service: 'linear-client', operation: 'getIssuesByProject', durationMs })

      return {
        data: connection.nodes,
        rateLimit: rateLimiter.getState(),
        pageInfo: connection.pageInfo
          ? {
              hasNextPage: connection.pageInfo.hasNextPage ?? false,
              endCursor: connection.pageInfo.endCursor ?? null,
            }
          : undefined,
      }
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - start)
      throw this.classifyError('getIssuesByProject', error, durationMs)
    }
  }

  /**
   * Fetch a single issue by ID.
   *
   * Returns `null` when the issue does not exist — does **not** throw.
   */
  async getIssueById(
    issueId: string,
  ): Promise<LinearQueryResult<Issue | null>> {
    const client = this.getClient()

    try {
      return await this.executeWithRateTracking('getIssueById', async () => {
        return await client.issue(issueId)
      })
    } catch (error: unknown) {
      if (
        error instanceof LinearApiError &&
        error.type === 'NOT_FOUND'
      ) {
        return { data: null, rateLimit: rateLimiter.getState() }
      }
      throw error
    }
  }

  /**
   * Fetch all comments for a given issue.
   */
  async getIssueComments(
    issueId: string,
  ): Promise<LinearQueryResult<Comment[]>> {
    const client = this.getClient()

    return this.executeWithRateTracking('getIssueComments', async () => {
      const issue = await client.issue(issueId)
      const comments = await issue.comments()
      return comments.nodes
    })
  }

  /**
   * Return the most recent full rate-limit info (all three dimensions)
   * captured from response headers.  Returns `null` if no API calls have
   * been made yet.
   */
  getRateLimitInfo(): FullRateLimitInfo | null {
    return rateLimiter.getState()
  }
}

/** Singleton instance for application-wide use. */
export const linearClient = new LinearClientService()
