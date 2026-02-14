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

describe('errorMiddleware — database unavailability', () => {
  const mockNext: NextFunction = vi.fn()

  it('returns 503 with DATABASE_UNAVAILABLE for ECONNREFUSED errors', () => {
    const err = Object.assign(new Error('Connection refused'), {
      code: 'ECONNREFUSED',
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(503)
    const body = res.body as { error: { code: string; message: string; retryAfter: number } }
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
    expect(body.error.message).toBe('Service temporarily unavailable. Please try again.')
    expect(body.error.retryAfter).toBe(30)
    expect(res.headers['Retry-After']).toBe('30')
  })

  it('returns 503 for PostgreSQL admin_shutdown (57P01) error code', () => {
    const err = Object.assign(new Error('server is shutting down'), {
      code: '57P01',
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(503)
    const body = res.body as { error: { code: string } }
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
  })

  it('returns 503 for PostgreSQL cannot_connect_now (57P03) error code', () => {
    const err = Object.assign(new Error('cannot connect now'), {
      code: '57P03',
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(503)
    const body = res.body as { error: { code: string } }
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
  })

  it('returns 503 for PostgreSQL connection_failure (08006) error code', () => {
    const err = Object.assign(new Error('connection failure'), {
      code: '08006',
    })

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(503)
    const body = res.body as { error: { code: string } }
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
  })

  it('does not leak database connection strings in 503 response', () => {
    const err = Object.assign(
      new Error('connect ECONNREFUSED postgresql://user:pass@host:5432/db'),
      { code: 'ECONNREFUSED' },
    )

    const req = createMockRequest()
    const res = createMockResponse()

    errorMiddleware(err, req, res as unknown as Response, mockNext)

    const body = res.body as { error: { message: string } }
    expect(body.error.message).not.toContain('postgresql')
    expect(body.error.message).not.toContain('pass')
    expect(body.error.message).toBe('Service temporarily unavailable. Please try again.')
  })
})

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
