import { describe, it, expect } from 'vitest'

import {
  LinearApiError,
  LinearNetworkError,
  LinearConfigError,
} from '../../utils/linear-errors.js'

import { classifySyncError, SYNC_ERROR_CODES } from './sync-error-classifier.js'

describe('classifySyncError', () => {
  it('should classify LinearNetworkError as SYNC_API_UNAVAILABLE', () => {
    const error = new LinearNetworkError({
      message: 'Network failure',
      code: 'NETWORK_ERROR',
    })
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.API_UNAVAILABLE)
    expect(result.message).toBe('Network failure')
  })

  it('should classify LinearConfigError as SYNC_CONFIG_ERROR', () => {
    const error = new LinearConfigError('Missing API key')
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.CONFIG_ERROR)
    expect(result.message).toBe('Missing API key')
  })

  it('should classify LinearApiError with AUTHENTICATION_ERROR type as SYNC_AUTH_FAILED', () => {
    const error = new LinearApiError({
      message: 'Unauthorized',
      code: '401',
      type: 'AUTHENTICATION_ERROR',
    })
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.AUTH_FAILED)
    expect(result.message).toBe('Linear API authentication failed')
  })

  it('should classify LinearApiError with PERMISSION_ERROR type as SYNC_AUTH_FAILED', () => {
    const error = new LinearApiError({
      message: 'Forbidden',
      code: '403',
      type: 'PERMISSION_ERROR',
    })
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.AUTH_FAILED)
    expect(result.message).toBe('Linear API authentication failed')
  })

  it('should classify LinearApiError with RATE_LIMITED type as SYNC_RATE_LIMITED', () => {
    const error = new LinearApiError({
      message: 'Rate limit exceeded',
      code: '429',
      type: 'RATE_LIMITED',
    })
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.RATE_LIMITED)
    expect(result.message).toBe('Linear API rate limit exceeded')
  })

  it('should classify LinearApiError with GRAPHQL_ERROR type as SYNC_API_UNAVAILABLE', () => {
    const error = new LinearApiError({
      message: 'Internal server error',
      code: '500',
      type: 'GRAPHQL_ERROR',
    })
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.API_UNAVAILABLE)
    expect(result.message).toBe('Internal server error')
  })

  it('should classify LinearApiError with NOT_FOUND type as SYNC_CONFIG_ERROR', () => {
    const error = new LinearApiError({
      message: 'Not found',
      code: '404',
      type: 'NOT_FOUND',
    })
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.CONFIG_ERROR)
    expect(result.message).toBe('Linear project not found — check LINEAR_PROJECT_ID configuration')
  })

  it('should classify Error with "timeout" in message as SYNC_TIMEOUT', () => {
    const error = new Error('Request timeout after 30000ms')
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.TIMEOUT)
    expect(result.message).toBe('Sync operation timed out')
  })

  it('should classify Error with "etimedout" in message as SYNC_TIMEOUT', () => {
    const error = new Error('connect ETIMEDOUT 1.2.3.4:443')
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.TIMEOUT)
    expect(result.message).toBe('Sync operation timed out')
  })

  it('should classify Error with "aborted" in message as SYNC_TIMEOUT', () => {
    const error = new Error('The operation was aborted')
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.TIMEOUT)
    expect(result.message).toBe('Sync operation timed out')
  })

  it('should classify generic Error as SYNC_UNKNOWN_ERROR', () => {
    const error = new Error('Something unexpected happened')
    const result = classifySyncError(error)
    expect(result.code).toBe(SYNC_ERROR_CODES.UNKNOWN)
    expect(result.message).toBe('Something unexpected happened')
  })

  it('should classify non-Error value as SYNC_UNKNOWN_ERROR', () => {
    const result = classifySyncError('a string error')
    expect(result.code).toBe(SYNC_ERROR_CODES.UNKNOWN)
    expect(result.message).toBe('Unknown sync error')
  })

  it('should classify null as SYNC_UNKNOWN_ERROR', () => {
    const result = classifySyncError(null)
    expect(result.code).toBe(SYNC_ERROR_CODES.UNKNOWN)
    expect(result.message).toBe('Unknown sync error')
  })
})
