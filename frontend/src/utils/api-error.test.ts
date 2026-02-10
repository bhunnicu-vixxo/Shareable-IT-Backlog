import { describe, it, expect } from 'vitest'
import { ApiError } from './api-error'

describe('ApiError', () => {
  it('creates an error with message, status, and code', () => {
    const err = new ApiError('Not found', 404, 'NOT_FOUND')

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('Not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.name).toBe('ApiError')
  })

  it('defaults code to UNKNOWN_ERROR when not provided', () => {
    const err = new ApiError('Server error', 500)

    expect(err.code).toBe('UNKNOWN_ERROR')
  })

  it('isNotFound returns true for 404 status', () => {
    const err = new ApiError('Not found', 404, 'NOT_FOUND')

    expect(err.isNotFound).toBe(true)
    expect(err.isServerError).toBe(false)
  })

  it('isNotFound returns false for non-404 status', () => {
    const err = new ApiError('Server error', 500, 'INTERNAL_ERROR')

    expect(err.isNotFound).toBe(false)
  })

  it('isServerError returns true for 500+ status', () => {
    expect(new ApiError('Error', 500).isServerError).toBe(true)
    expect(new ApiError('Error', 502).isServerError).toBe(true)
    expect(new ApiError('Error', 503).isServerError).toBe(true)
  })

  it('isServerError returns false for status below 500', () => {
    expect(new ApiError('Error', 404).isServerError).toBe(false)
    expect(new ApiError('Error', 400).isServerError).toBe(false)
    expect(new ApiError('Error', 200).isServerError).toBe(false)
  })

  it('extends Error properly for stack traces', () => {
    const err = new ApiError('Test', 404)

    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('ApiError')
  })
})
