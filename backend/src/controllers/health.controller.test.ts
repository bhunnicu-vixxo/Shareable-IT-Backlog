import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import type { Request, Response } from 'express'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const { mockTestConnection, mockVerifyAuth } = vi.hoisted(() => ({
  mockTestConnection: vi.fn(),
  mockVerifyAuth: vi.fn(),
}))

// Mock the database utility
vi.mock('../utils/database.js', () => ({
  testConnection: mockTestConnection,
}))

// Mock the Linear client service
vi.mock('../services/sync/linear-client.service.js', () => ({
  linearClient: {
    verifyAuth: mockVerifyAuth,
  },
}))

// Mock the health monitor service
vi.mock('../services/health/health-monitor.service.js', () => ({
  healthMonitor: {
    getMetrics: vi.fn().mockReturnValue({
      database: {
        totalChecks: 10,
        consecutiveFailures: 0,
        latencySamples: 10,
        totalLatencyMs: 50,
        averageLatencyMs: 5,
        lastStatus: 'ok',
      },
      linear: {
        totalChecks: 10,
        consecutiveFailures: 0,
        latencySamples: 10,
        totalLatencyMs: 1500,
        averageLatencyMs: 150,
        lastStatus: 'ok',
      },
      totalChecks: 10,
      startedAt: '2026-02-13T00:00:00.000Z',
    }),
  },
}))

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

import { getHealth, getDbHealth, getLinearHealth, getReady, getLive } from './health.controller.js'

function createMockRequest(): Request {
  return {} as unknown as Request
}

function createMockResponse(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}

describe('HealthController', () => {
  const originalLinearApiKey = process.env.LINEAR_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINEAR_API_KEY = 'test-linear-key'
    // Default: healthy DB and Linear
    mockTestConnection.mockResolvedValue({ connected: true, latencyMs: 5 })
    mockVerifyAuth.mockResolvedValue({
      data: { id: '1', name: 'Test', email: 'test@test.com' },
      rateLimit: null,
    })
  })

  afterAll(() => {
    if (originalLinearApiKey !== undefined) process.env.LINEAR_API_KEY = originalLinearApiKey
    else delete process.env.LINEAR_API_KEY
  })

  describe('getHealth', () => {
    it('returns full health status with all checks passing', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        checks: {
          database: {
            status: 'ok',
            connected: true,
            latencyMs: 5,
          },
          linear: {
            status: 'ok',
            connected: true,
            latencyMs: expect.any(Number),
          },
        },
      })
    })

    it('returns response format matching expected schema', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('timestamp')
      expect(body).toHaveProperty('uptime')
      expect(body).toHaveProperty('version')
      expect(body).toHaveProperty('checks')

      const checks = body.checks as Record<string, unknown>
      expect(checks).toHaveProperty('database')
      expect(checks).toHaveProperty('linear')
    })

    it('returns status "ok" when all checks pass', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('ok')
    })

    it('returns status "degraded" when Linear API is down but DB is up', async () => {
      mockVerifyAuth.mockRejectedValue(new Error('Linear API unavailable'))

      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('degraded')
      expect(res.statusCode).toBe(200)

      const checks = body.checks as Record<string, Record<string, unknown>>
      expect(checks.database.status).toBe('ok')
      expect(checks.linear.status).toBe('error')
      expect(checks.linear.connected).toBe(false)
    })

    it('returns status "unhealthy" when database is down', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })

      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('unhealthy')
      expect(res.statusCode).toBe(503)
    })

    it('handles Linear check timeout without blocking response', async () => {
      // Set a short timeout for this test (100ms)
      const origTimeout = process.env.HEALTH_CHECK_LINEAR_TIMEOUT_MS
      process.env.HEALTH_CHECK_LINEAR_TIMEOUT_MS = '100'

      // Simulate a slow Linear response (10s) that exceeds the 100ms timeout
      mockVerifyAuth.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      )

      const req = createMockRequest()
      const res = createMockResponse()

      const start = Date.now()
      await getHealth(req, res)
      const elapsed = Date.now() - start

      // Should respond well under 1 second due to 100ms timeout
      expect(elapsed).toBeLessThan(1000)

      const body = res.body as Record<string, unknown>
      // When timeout occurs, Linear is treated as unavailable -> degraded
      expect(body.status).toBe('degraded')

      const checks = body.checks as Record<string, Record<string, unknown>>
      expect(checks.linear.connected).toBe(false)
      expect(checks.linear.status).toBe('error')

      // Restore env var
      if (origTimeout !== undefined) {
        process.env.HEALTH_CHECK_LINEAR_TIMEOUT_MS = origTimeout
      } else {
        delete process.env.HEALTH_CHECK_LINEAR_TIMEOUT_MS
      }
    })

    it('handles when LINEAR_API_KEY is not configured', async () => {
      delete process.env.LINEAR_API_KEY
      // Simulate LinearConfigError thrown when no API key
      const { LinearConfigError } = await import('../utils/linear-errors.js')
      mockVerifyAuth.mockRejectedValue(new LinearConfigError('LINEAR_API_KEY is required'))

      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      // Not configured means we consider overall "ok" (Linear is optional)
      expect(body.status).toBe('ok')

      const checks = body.checks as Record<string, Record<string, unknown>>
      expect(checks.linear.status).toBe('not_configured')
      expect(checks.linear.connected).toBe(false)
    })

    it('includes uptime and version fields', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      expect(typeof body.uptime).toBe('number')
      expect(body.uptime).toBeGreaterThanOrEqual(0)
      expect(typeof body.version).toBe('string')
      expect(body.version).toBeTruthy()
    })

    it('preserves backward compatibility with existing database field format', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getHealth(req, res)

      const body = res.body as Record<string, unknown>
      const checks = body.checks as Record<string, Record<string, unknown>>
      expect(checks.database).toHaveProperty('connected')
      expect(checks.database).toHaveProperty('latencyMs')
    })
  })

  describe('getDbHealth', () => {
    it('returns database-only health check', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getDbHealth(req, res)

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({
        status: 'ok',
        database: {
          connected: true,
          latencyMs: expect.any(Number),
        },
      })
    })

    it('returns 503 when database is down', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })

      const req = createMockRequest()
      const res = createMockResponse()

      await getDbHealth(req, res)

      expect(res.statusCode).toBe(503)
      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('error')
    })
  })

  describe('getLinearHealth', () => {
    it('returns Linear-only health check', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getLinearHealth(req, res)

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({
        status: 'ok',
        linear: {
          connected: true,
          latencyMs: expect.any(Number),
        },
      })
    })

    it('returns 503 when Linear API is down', async () => {
      mockVerifyAuth.mockRejectedValue(new Error('Linear API unavailable'))

      const req = createMockRequest()
      const res = createMockResponse()

      await getLinearHealth(req, res)

      expect(res.statusCode).toBe(503)
      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('error')
    })
  })

  describe('getReady', () => {
    it('returns 200 when all dependencies are ready', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getReady(req, res)

      expect(res.statusCode).toBe(200)
      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('ready')
    })

    it('returns 503 when database is not ready', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })

      const req = createMockRequest()
      const res = createMockResponse()

      await getReady(req, res)

      expect(res.statusCode).toBe(503)
      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('not_ready')
    })
  })

  describe('getLive', () => {
    it('returns 200 always (liveness probe)', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getLive(req, res)

      expect(res.statusCode).toBe(200)
      const body = res.body as Record<string, unknown>
      expect(body.status).toBe('alive')
    })

    it('returns 200 even when database is down', async () => {
      mockTestConnection.mockResolvedValue({ connected: false })

      const req = createMockRequest()
      const res = createMockResponse()

      await getLive(req, res)

      expect(res.statusCode).toBe(200)
    })
  })
})
