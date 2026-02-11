import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api-error'
import { queryDefaults } from './query-client-defaults'

/**
 * Tests for QueryClient configuration.
 *
 * Imports the REAL production defaults from query-client-defaults.ts
 * so that config drift between main.tsx and tests is impossible.
 */

function createProductionQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: queryDefaults,
    },
  })
}

describe('QueryClient configuration', () => {
  it('has gcTime set to 10 minutes (600000ms)', () => {
    const client = createProductionQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.gcTime).toBe(10 * 60 * 1000)
  })

  it('has staleTime set to 5 minutes (300000ms)', () => {
    const client = createProductionQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000)
  })

  it('has refetchOnWindowFocus disabled', () => {
    const client = createProductionQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
  })

  describe('retry function', () => {
    // Extract the retry function for direct testing
    const client = createProductionQueryClient()
    const retryFn = client.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: Error,
    ) => boolean

    it('is a function (not a number)', () => {
      expect(typeof retryFn).toBe('function')
    })

    it('does not retry 400 Bad Request (4xx client error)', () => {
      const error = new ApiError('Bad request', 400, 'VALIDATION_ERROR')
      expect(retryFn(0, error)).toBe(false)
    })

    it('does not retry 401 Unauthorized (4xx client error)', () => {
      const error = new ApiError('Unauthorized', 401, 'AUTH_ERROR')
      expect(retryFn(0, error)).toBe(false)
    })

    it('does not retry 403 Forbidden (4xx client error)', () => {
      const error = new ApiError('Forbidden', 403, 'FORBIDDEN')
      expect(retryFn(0, error)).toBe(false)
    })

    it('does not retry 404 Not Found (4xx client error)', () => {
      const error = new ApiError('Not found', 404, 'NOT_FOUND')
      expect(retryFn(0, error)).toBe(false)
    })

    it('does not retry 409 Conflict (4xx client error)', () => {
      const error = new ApiError('Conflict', 409, 'CONFLICT')
      expect(retryFn(0, error)).toBe(false)
    })

    it('does not retry 422 Unprocessable (4xx client error)', () => {
      const error = new ApiError('Invalid', 422, 'VALIDATION_ERROR')
      expect(retryFn(0, error)).toBe(false)
    })

    it('retries 500 Internal Server Error on first attempt', () => {
      const error = new ApiError('Server error', 500, 'INTERNAL_ERROR')
      expect(retryFn(0, error)).toBe(true)
    })

    it('retries 500 Internal Server Error on second attempt', () => {
      const error = new ApiError('Server error', 500, 'INTERNAL_ERROR')
      expect(retryFn(1, error)).toBe(true)
    })

    it('does not retry 500 after 2 failures (max retries)', () => {
      const error = new ApiError('Server error', 500, 'INTERNAL_ERROR')
      expect(retryFn(2, error)).toBe(false)
    })

    it('retries 502 Bad Gateway', () => {
      const error = new ApiError('Bad gateway', 502, 'GATEWAY_ERROR')
      expect(retryFn(0, error)).toBe(true)
    })

    it('retries 503 Service Unavailable', () => {
      const error = new ApiError('Unavailable', 503, 'SERVICE_UNAVAILABLE')
      expect(retryFn(0, error)).toBe(true)
    })

    it('retries network errors (plain Error, not ApiError)', () => {
      const error = new TypeError('Failed to fetch')
      expect(retryFn(0, error)).toBe(true)
    })

    it('does not retry network errors after 2 failures', () => {
      const error = new TypeError('Failed to fetch')
      expect(retryFn(2, error)).toBe(false)
    })
  })
})
