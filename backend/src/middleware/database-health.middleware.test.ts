import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { databaseHealthMiddleware, resetDatabaseHealthCache } from './database-health.middleware.js'

// Mock database module
vi.mock('../utils/database.js', () => ({
  testConnection: vi.fn(),
}))

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { testConnection } from '../utils/database.js'

const mockTestConnection = vi.mocked(testConnection)

function createMockReq(): Request {
  return {} as unknown as Request
}

function createMockRes(): Response & { statusCode: number; body: unknown; headers: Record<string, string> } {
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
  return res as unknown as Response & { statusCode: number; body: unknown; headers: Record<string, string> }
}

describe('databaseHealthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDatabaseHealthCache()
  })

  it('calls next() when database is connected', async () => {
    mockTestConnection.mockResolvedValue({ connected: true, latencyMs: 5 })
    const req = createMockReq()
    const res = createMockRes()
    const next = vi.fn() as unknown as NextFunction

    await databaseHealthMiddleware(req, res as unknown as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(200) // Not overwritten
  })

  it('returns 503 when database is disconnected', async () => {
    mockTestConnection.mockResolvedValue({ connected: false })
    const req = createMockReq()
    const res = createMockRes()
    const next = vi.fn() as unknown as NextFunction

    await databaseHealthMiddleware(req, res as unknown as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(503)
    const body = res.body as { error: { code: string; message: string; retryAfter: number } }
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
    expect(body.error.message).toBe('Service temporarily unavailable. Please try again.')
    expect(body.error.retryAfter).toBe(30)
    expect(res.headers['Retry-After']).toBe('30')
  })

  it('caches health check result for 5 seconds', async () => {
    mockTestConnection.mockResolvedValue({ connected: true, latencyMs: 5 })
    const req = createMockReq()
    const res1 = createMockRes()
    const res2 = createMockRes()
    const next = vi.fn() as unknown as NextFunction

    // First call — hits testConnection
    await databaseHealthMiddleware(req, res1 as unknown as Response, next)
    expect(mockTestConnection).toHaveBeenCalledTimes(1)

    // Second call within 5 seconds — uses cache
    await databaseHealthMiddleware(req, res2 as unknown as Response, next)
    expect(mockTestConnection).toHaveBeenCalledTimes(1) // No additional call

    expect(next).toHaveBeenCalledTimes(2) // Both should have called next
  })

  it('does not leak sensitive information in 503 response', async () => {
    mockTestConnection.mockResolvedValue({ connected: false })
    const req = createMockReq()
    const res = createMockRes()
    const next = vi.fn() as unknown as NextFunction

    await databaseHealthMiddleware(req, res as unknown as Response, next)

    const body = res.body as { error: { message: string } }
    expect(body.error.message).not.toContain('postgres')
    expect(body.error.message).not.toContain('password')
    expect(body.error.message).not.toContain('connection')
  })
})
