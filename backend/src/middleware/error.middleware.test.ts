import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorMiddleware } from './error.middleware.js'

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock rate limiter
vi.mock('../services/sync/rate-limiter.js', () => ({
  rateLimiter: {
    getSuggestedRetryAfterMs: vi.fn(() => null),
  },
}))

function createMockRequest(): Request {
  return {} as unknown as Request
}

function createMockResponse(): Response & {
  statusCode: number
  body: unknown
  headers: Record<string, string>
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
      return this
    },
    set(key: string, val: string) {
      this.headers[key] = val
      return this
    },
  }
  return res as unknown as Response & {
    statusCode: number
    body: unknown
    headers: Record<string, string>
  }
}

describe('errorMiddleware — credential protection', () => {
  const originalEnv = { ...process.env }
  const mockNext: NextFunction = vi.fn()

  beforeEach(() => {
    process.env.NODE_ENV = 'development' // Enable details in response
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should not include credential values in error response body', () => {
    const err = Object.assign(new Error('Something failed'), {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {
        message: 'Config error',
        password: 'super-secret-pass',
        apiKey: 'lin_api_abc123',
        token: 'jwt-token-value',
        DATABASE_URL: 'postgresql://user:pass@host/db',
      },
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    const body = res.body as { error: { details: Record<string, unknown> } }
    const details = body.error.details as Record<string, unknown>

    expect(details.password).toBe('[REDACTED]')
    expect(details.apiKey).toBe('[REDACTED]')
    expect(details.token).toBe('[REDACTED]')
    expect(details.DATABASE_URL).toBe('[REDACTED]')
    expect(details.message).toBe('Config error') // Non-sensitive field preserved
  })

  it('should sanitize nested credential-like fields in error details', () => {
    const err = Object.assign(new Error('Nested error'), {
      statusCode: 400,
      code: 'TEST_ERROR',
      details: {
        config: {
          secret: 'nested-secret-value',
          host: 'localhost', // non-sensitive
        },
      },
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    const body = res.body as { error: { details: { config: Record<string, unknown> } } }
    const config = body.error.details.config

    expect(config.secret).toBe('[REDACTED]')
    expect(config.host).toBe('localhost')
  })

  it('should return generic message for 500 errors in production', () => {
    process.env.NODE_ENV = 'production'

    const err = Object.assign(new Error('DATABASE_URL=postgresql://secret'), {
      code: 'INTERNAL_ERROR',
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    const body = res.body as { error: { message: string; details?: unknown } }

    expect(body.error.message).not.toContain('DATABASE_URL')
    expect(body.error.message).not.toContain('postgresql')
    expect(body.error.details).toBeUndefined() // No details in production 500s
  })

  it('should not include details field in production responses', () => {
    process.env.NODE_ENV = 'production'

    const err = Object.assign(new Error('Something failed'), {
      statusCode: 500,
      details: { password: 'leak-me' },
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    const body = res.body as { error: { details?: unknown } }
    expect(body.error.details).toBeUndefined()
  })
})
