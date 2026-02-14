import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

const { mockLookupOrCreateUser, mockGetUserById } = vi.hoisted(() => ({
  mockLookupOrCreateUser: vi.fn(),
  mockGetUserById: vi.fn(),
}))

vi.mock('../services/auth/auth.service.js', () => ({
  lookupOrCreateUser: mockLookupOrCreateUser,
  // requireApproved and requireIT can fall back to DB lookup
  getUserById: mockGetUserById,
  updateLastAccess: vi.fn().mockResolvedValue(undefined),
}))

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

// Mock database for session store (connect-pg-simple)
vi.mock('../utils/database.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
  },
  testConnection: vi.fn().mockResolvedValue({ connected: true, latencyMs: 1 }),
}))

// Use MemoryStore instead of PG session store for tests
vi.mock('../config/session.config.js', async () => {
  const session = await import('express-session')
  return {
    createSessionMiddleware: () =>
      session.default({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        name: 'slb.sid',
      }),
  }
})

// Mock sync service to prevent imports / side effects
vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: vi.fn(),
    runSync: vi.fn(),
  },
}))

describe('IT Routes (integration)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
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
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseUser = {
    id: 10,
    email: 'user@vixxo.com',
    displayName: 'User',
    isAdmin: false,
    isIT: false,
    isApproved: true,
    isDisabled: false,
    lastAccessAt: null,
    approvedAt: '2026-02-10T10:00:00.000Z',
    approvedBy: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  }

  async function authenticate(user: typeof baseUser): Promise<string> {
    mockLookupOrCreateUser.mockResolvedValue(user)
    // requireApproved and requireIT middleware fall back to DB lookup
    mockGetUserById.mockResolvedValue(user)
    const res = await fetch(`${baseUrl}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
    return res.headers.get('set-cookie') ?? ''
  }

  it('should return 200 for IT user', async () => {
    const cookie = await authenticate({ ...baseUser, isIT: true })

    const res = await fetch(`${baseUrl}/api/it/ping`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('should return 200 for admin user (admin bypass)', async () => {
    const cookie = await authenticate({ ...baseUser, isAdmin: true, email: 'admin@vixxo.com' })

    const res = await fetch(`${baseUrl}/api/it/ping`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(200)
  })

  it('should return 403 for regular approved user', async () => {
    const cookie = await authenticate(baseUser)

    const res = await fetch(`${baseUrl}/api/it/ping`, {
      headers: { Cookie: cookie },
    })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('IT_OR_ADMIN_REQUIRED')
  })

  it('should return 401 when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/api/it/ping`)
    expect(res.status).toBe(401)
  })
})

