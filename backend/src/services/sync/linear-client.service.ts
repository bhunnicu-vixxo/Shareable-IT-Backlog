import {
  LinearClient,
  LinearErrorType,
  parseLinearError,
  type Comment,
  type Issue,
} from '@linear/sdk'

import { getLinearConfig } from '../../config/linear.config.js'
import type { RateLimitInfo, LinearQueryResult } from '../../types/linear.types.js'
import {
  LinearApiError,
  LinearNetworkError,
  LinearConfigError,
  type LinearApiErrorType,
} from '../../utils/linear-errors.js'
import { logger } from '../../utils/logger.js'

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
  private lastRateLimitInfo: RateLimitInfo | null = null

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

  private parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
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

  private updateRateLimitFromHeaders(headers: Headers | null | undefined): void {
    if (!headers) return
    this.lastRateLimitInfo = this.parseRateLimitHeaders(headers)
  }

  /**
   * The Linear SDK does not reliably expose response headers for high-level model
   * methods (e.g. `client.issues()`).
   *
   * To meet Story 2.2 requirements, we perform a lightweight probe request after
   * each SDK operation using the SDK's underlying GraphQL client `rawRequest`,
   * which *does* return headers in its raw response.
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
      this.updateRateLimitFromHeaders(raw.headers)
    } catch (err: unknown) {
      // Do not fail the primary operation due to probe failure.
      logger.debug(
        { service: 'linear-client', operation: 'rateLimitProbe', error: err },
        'Rate limit probe failed',
      )
      this.lastRateLimitInfo = null
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

    try {
      const data = await fn()
      await this.refreshRateLimitInfo()
      const durationMs = Math.round(performance.now() - start)

      logger.debug({ service: 'linear-client', operation, durationMs })

      return { data, rateLimit: this.lastRateLimitInfo }
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
    this.updateRateLimitFromHeaders(parsed.headers)

    // Network-level errors
    if (parsed.linearType === LinearErrorType.NetworkError || this.isNetworkError(error)) {
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

    return this.executeWithRateTracking('getIssuesByProject', async () => {
      const connection = await client.issues({
        filter: { project: { id: { eq: projectId } } },
        first,
        after,
      })
      return connection.nodes
    })
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
        return { data: null, rateLimit: this.lastRateLimitInfo }
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
   * Return the most recent rate-limit info captured from response headers.
   * Returns `null` if no API calls have been made yet.
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.lastRateLimitInfo
  }
}

/** Singleton instance for application-wide use. */
export const linearClient = new LinearClientService()
