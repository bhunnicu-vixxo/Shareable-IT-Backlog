import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import type { Request, Response } from 'express'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const {
  mockGetHealth,
  mockGetDbHealth,
  mockGetLinearHealth,
  mockGetReady,
  mockGetLive,
} = vi.hoisted(() => ({
  mockGetHealth: vi.fn(),
  mockGetDbHealth: vi.fn(),
  mockGetLinearHealth: vi.fn(),
  mockGetReady: vi.fn(),
  mockGetLive: vi.fn(),
}))

// Mock the health controller
vi.mock('../controllers/health.controller.js', () => ({
  getHealth: mockGetHealth,
  getDbHealth: mockGetDbHealth,
  getLinearHealth: mockGetLinearHealth,
  getReady: mockGetReady,
  getLive: mockGetLive,
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

import express from 'express'
import healthRoutes from './health.routes.js'

describe('Health Routes', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = express()
    app.use('/api', healthRoutes)

    server = createServer(app)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })

    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockGetHealth.mockImplementation((_req: Request, res: Response) => {
      res.json({ status: 'ok' })
    })
    mockGetDbHealth.mockImplementation((_req: Request, res: Response) => {
      res.json({ status: 'ok', database: { connected: true, latencyMs: 3 } })
    })
    mockGetLinearHealth.mockImplementation((_req: Request, res: Response) => {
      res.json({ status: 'ok', linear: { connected: true, latencyMs: 100 } })
    })
    mockGetReady.mockImplementation((_req: Request, res: Response) => {
      res.json({ status: 'ready' })
    })
    mockGetLive.mockImplementation((_req: Request, res: Response) => {
      res.json({ status: 'alive' })
    })
  })

  it('GET /api/health calls getHealth controller', async () => {
    const response = await fetch(`${baseUrl}/api/health`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(mockGetHealth).toHaveBeenCalled()
  })

  it('GET /api/health/db returns database-only check', async () => {
    const response = await fetch(`${baseUrl}/api/health/db`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.database).toBeDefined()
    expect(mockGetDbHealth).toHaveBeenCalled()
  })

  it('GET /api/health/linear returns Linear-only check', async () => {
    const response = await fetch(`${baseUrl}/api/health/linear`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.linear).toBeDefined()
    expect(mockGetLinearHealth).toHaveBeenCalled()
  })

  it('GET /api/health/ready returns 200 when ready', async () => {
    const response = await fetch(`${baseUrl}/api/health/ready`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ready')
    expect(mockGetReady).toHaveBeenCalled()
  })

  it('GET /api/health/ready returns 503 when not ready', async () => {
    mockGetReady.mockImplementation((_req: Request, res: Response) => {
      res.status(503).json({ status: 'not_ready' })
    })

    const response = await fetch(`${baseUrl}/api/health/ready`)
    expect(response.status).toBe(503)
  })

  it('GET /api/health/live returns 200 always (liveness)', async () => {
    const response = await fetch(`${baseUrl}/api/health/live`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('alive')
    expect(mockGetLive).toHaveBeenCalled()
  })

  it('routes are accessible without authentication', async () => {
    // All health routes should respond without any auth headers
    const endpoints = [
      '/api/health',
      '/api/health/db',
      '/api/health/linear',
      '/api/health/ready',
      '/api/health/live',
    ]

    for (const endpoint of endpoints) {
      const response = await fetch(`${baseUrl}${endpoint}`)
      // Should NOT get 401/403 (no auth required)
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    }
  })
})
