import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

const { mockLookupOrCreateUser, mockGetUserById, mockUpdateLastAccess } = vi.hoisted(() => ({
  mockLookupOrCreateUser: vi.fn(),
  mockGetUserById: vi.fn(),
  mockUpdateLastAccess: vi.fn(),
}))

vi.mock('../services/auth/auth.service.js', () => ({
  lookupOrCreateUser: mockLookupOrCreateUser,
  getUserById: mockGetUserById,
  updateLastAccess: mockUpdateLastAccess,
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock database for session store (connect-pg-simple)
vi.mock('../utils/database.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
  },
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

// Mock sync service to prevent imports
vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: vi.fn(),
    runSync: vi.fn(),
  },
}))

describe('Auth Routes (integration)', () => {
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
    mockUpdateLastAccess.mockResolvedValue(undefined)
  })

  const approvedUser = {
    id: 1,
    email: 'user@vixxo.com',
    displayName: 'User',
    isAdmin: false,
    isApproved: true,
    isDisabled: false,
    lastAccessAt: null,
    approvedAt: '2026-02-10T10:00:00.000Z',
    approvedBy: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  }

  const unapprovedUser = {
    ...approvedUser,
    id: 2,
    email: 'pending@vixxo.com',
    isApproved: false,
    approvedAt: null,
  }

  describe('POST /api/auth/identify', () => {
    it('should create session and return user for valid email', async () => {
      mockLookupOrCreateUser.mockResolvedValue(approvedUser)

      const res = await fetch(`${baseUrl}/api/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@vixxo.com' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(1)
      expect(body.email).toBe('user@vixxo.com')
      expect(body.isApproved).toBe(true)
      // Session cookie should be set
      expect(res.headers.get('set-cookie')).toContain('slb.sid')
    })

    it('should return 400 for missing email', async () => {
      const res = await fetch(`${baseUrl}/api/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return 401 when no session', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('AUTH_REQUIRED')
    })

    it('should return user when session is valid', async () => {
      // First identify to create session
      mockLookupOrCreateUser.mockResolvedValue(approvedUser)
      const identifyRes = await fetch(`${baseUrl}/api/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@vixxo.com' }),
      })
      const cookie = identifyRes.headers.get('set-cookie')

      // Then check /me with the session cookie
      mockGetUserById.mockResolvedValue(approvedUser)
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookie ?? '' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.email).toBe('user@vixxo.com')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should destroy session', async () => {
      // First identify to create session
      mockLookupOrCreateUser.mockResolvedValue(approvedUser)
      const identifyRes = await fetch(`${baseUrl}/api/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@vixxo.com' }),
      })
      const cookie = identifyRes.headers.get('set-cookie')

      // Logout
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: cookie ?? '' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toBe('Logged out successfully')
    })
  })

  describe('Protected route access', () => {
    it('should return 401 for unauthenticated access to protected routes', async () => {
      const res = await fetch(`${baseUrl}/api/backlog-items`)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('AUTH_REQUIRED')
    })

    it('should return 403 for unapproved user accessing protected routes', async () => {
      // Identify as unapproved user
      mockLookupOrCreateUser.mockResolvedValue(unapprovedUser)
      const identifyRes = await fetch(`${baseUrl}/api/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'pending@vixxo.com' }),
      })
      const cookie = identifyRes.headers.get('set-cookie')

      // Try to access protected route
      mockGetUserById.mockResolvedValue(unapprovedUser)
      const res = await fetch(`${baseUrl}/api/backlog-items`, {
        headers: { Cookie: cookie ?? '' },
      })

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('USER_NOT_APPROVED')
    })
  })
})
