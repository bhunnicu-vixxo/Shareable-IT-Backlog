/**
 * Custom error types for Linear API interactions.
 *
 * Three categories:
 *  - LinearApiError     – GraphQL / HTTP-level API errors
 *  - LinearNetworkError – transport-level failures
 *  - LinearConfigError  – missing or invalid configuration
 */

export type LinearApiErrorType =
  | 'GRAPHQL_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'

export class LinearApiError extends Error {
  readonly code: string
  readonly type: LinearApiErrorType
  readonly raw: unknown

  constructor(opts: {
    message: string
    code: string
    type: LinearApiErrorType
    raw?: unknown
  }) {
    super(opts.message)
    this.name = 'LinearApiError'
    this.code = opts.code
    this.type = opts.type
    this.raw = opts.raw
  }
}

export type LinearNetworkErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'DNS_FAILURE'

export class LinearNetworkError extends Error {
  readonly code: LinearNetworkErrorCode

  constructor(opts: {
    message: string
    code: LinearNetworkErrorCode
    cause?: unknown
  }) {
    super(opts.message, { cause: opts.cause })
    this.name = 'LinearNetworkError'
    this.code = opts.code
  }
}

export class LinearConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinearConfigError'
  }
}
