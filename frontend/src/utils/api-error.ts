/**
 * Custom error class for API responses that carries HTTP status code and
 * error code from the backend's standard error format.
 *
 * Allows consumers (hooks, components) to differentiate between
 * 404 (deleted/missing) vs 500 (server) vs network errors.
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly code: string

  constructor(message: string, status: number, code: string = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}
