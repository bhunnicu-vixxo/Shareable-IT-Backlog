import { describe, it, expect } from 'vitest'
import { getUserFriendlyErrorMessage } from './sync-error-messages'

describe('getUserFriendlyErrorMessage', () => {
  it('should return correct message for SYNC_API_UNAVAILABLE', () => {
    const result = getUserFriendlyErrorMessage('SYNC_API_UNAVAILABLE')
    expect(result.title).toBe('Linear is unreachable')
    expect(result.description).toContain('Unable to connect')
    expect(result.guidance).toContain('retry automatically')
  })

  it('should return correct message for SYNC_AUTH_FAILED', () => {
    const result = getUserFriendlyErrorMessage('SYNC_AUTH_FAILED')
    expect(result.title).toBe('Authentication issue')
    expect(result.description).toContain('authenticate')
    expect(result.guidance).toContain('administrator')
  })

  it('should return correct message for SYNC_RATE_LIMITED', () => {
    const result = getUserFriendlyErrorMessage('SYNC_RATE_LIMITED')
    expect(result.title).toBe('Sync paused')
    expect(result.description).toContain('limited')
    expect(result.guidance).toContain('retry shortly')
  })

  it('should return correct message for SYNC_CONFIG_ERROR', () => {
    const result = getUserFriendlyErrorMessage('SYNC_CONFIG_ERROR')
    expect(result.title).toBe('Sync not configured')
    expect(result.description).toContain('not properly configured')
    expect(result.guidance).toContain('administrator')
  })

  it('should return correct message for SYNC_TIMEOUT', () => {
    const result = getUserFriendlyErrorMessage('SYNC_TIMEOUT')
    expect(result.title).toBe('Sync timed out')
    expect(result.description).toContain('too long')
    expect(result.guidance).toContain('retry automatically')
  })

  it('should return correct message for SYNC_UNKNOWN_ERROR', () => {
    const result = getUserFriendlyErrorMessage('SYNC_UNKNOWN_ERROR')
    expect(result.title).toBe('Sync issue')
    expect(result.description).toContain('unexpected')
    expect(result.guidance).toContain('retry automatically')
  })

  it('should return default message for null error code', () => {
    const result = getUserFriendlyErrorMessage(null)
    expect(result.title).toBe('Sync issue')
    expect(result.description).toContain('unexpected')
    expect(result.guidance).toContain('retry automatically')
  })

  it('should return default message for unknown error code', () => {
    const result = getUserFriendlyErrorMessage('SOME_FUTURE_CODE')
    expect(result.title).toBe('Sync issue')
    expect(result.description).toContain('unexpected')
  })
})
