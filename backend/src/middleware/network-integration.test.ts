import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

// Mock the logger to avoid noisy output
vi.mock('../utils/logger.js', () => {
  const mockChild = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }
  mockChild.child.mockReturnValue(mockChild)
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnValue(mockChild),
    },
  }
})

// Mock DB health probe so /api/health doesn't hang on real DB connectivity
vi.mock('../utils/database.js', async () => {
  const actual = await vi.importActual<typeof import('../utils/database.js')>(
    '../utils/database.js',
  )
  return {
    ...actual,
    testConnection: vi.fn().mockResolvedValue({ connected: true, latencyMs: 1 }),
  }
})

// Mock Linear client to prevent actual API calls during health checks
vi.mock('../services/sync/linear-client.service.js', () => ({
  linearClient: {
    verifyAuth: vi.fn().mockResolvedValue({
      data: { id: '1', name: 'Test', email: 'test@test.com' },
      rateLimit: null,
    }),
  },
}))

// Mock sync service to prevent actual sync operations
vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: vi.fn().mockReturnValue({
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }),
    runSync: vi.fn(),
  },
}))

describe('Network verification integration', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    // Enable network verification with a very restrictive range
    // so all test requests from 127.0.0.1 are denied (unless bypassed)
    process.env.NETWORK_CHECK_ENABLED = 'true'
    process.env.ALLOWED_NETWORKS = '203.0.113.0/24' // TEST-NET-3, won't match 127.0.0.1

    const { default: app } = await import('../app.js')
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
    delete process.env.NETWORK_CHECK_ENABLED
    delete process.env.ALLOWED_NETWORKS
  })

  it('should allow health endpoint through even when network check blocks other requests', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('status', 'ok')
  })

  it('should block non-health API endpoints from denied IPs', async () => {
    const res = await fetch(`${baseUrl}/api/sync/status`)
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body).toEqual({
      error: {
        message: expect.stringContaining('Access denied'),
        code: 'NETWORK_ACCESS_DENIED',
      },
    })
  })

  it('should return proper error format for denied requests', async () => {
    const res = await fetch(`${baseUrl}/api/backlog-items`)
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('NETWORK_ACCESS_DENIED')
    expect(body.error.message).toContain('Vixxo')
  })
})
