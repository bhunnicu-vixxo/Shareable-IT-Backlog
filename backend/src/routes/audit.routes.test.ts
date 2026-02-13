import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

const {
  mockLookupOrCreateUser,
  mockGetUserById,
  mockUpdateLastAccess,
  mockAuditGetAuditLogs,
  mockAuditLogUserAccess,
} = vi.hoisted(() => ({
  mockLookupOrCreateUser: vi.fn(),
  mockGetUserById: vi.fn(),
  mockUpdateLastAccess: vi.fn(),
  mockAuditGetAuditLogs: vi.fn(),
  mockAuditLogUserAccess: vi.fn(),
}))

vi.mock('../services/auth/auth.service.js', () => ({
  lookupOrCreateUser: mockLookupOrCreateUser,
  getUserById: mockGetUserById,
  updateLastAccess: mockUpdateLastAccess,
}))

vi.mock('../services/audit/audit.service.js', () => ({
  auditService: {
    getAuditLogs: mockAuditGetAuditLogs,
    logUserAccess: mockAuditLogUserAccess,
  },
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

// Mock database for session store + any incidental DB usage
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

describe('Audit Routes (integration)', () => {
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

  const adminUser = {
    id: 1,
    email: 'admin@vixxo.com',
    displayName: 'Admin',
    isAdmin: true,
    isApproved: true,
    isDisabled: false,
    lastAccessAt: null,
    approvedAt: '2026-02-10T10:00:00.000Z',
    approvedBy: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  }

  const regularUser = {
    ...adminUser,
    id: 2,
    email: 'user@vixxo.com',
    isAdmin: false,
  }

  // Cache cookies to avoid hitting the identify rate limiter (10 requests/min)
  let adminCookie: string | null = null
  let regularUserCookie: string | null = null

  async function authenticateAsAdmin(): Promise<string> {
    if (adminCookie) return adminCookie
    mockLookupOrCreateUser.mockResolvedValue(adminUser)
    const res = await fetch(`${baseUrl}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vixxo.com' }),
    })
    adminCookie = res.headers.get('set-cookie') ?? ''
    return adminCookie
  }

  async function authenticateAsRegularUser(): Promise<string> {
    if (regularUserCookie) return regularUserCookie
    mockLookupOrCreateUser.mockResolvedValue(regularUser)
    const res = await fetch(`${baseUrl}/api/auth/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@vixxo.com' }),
    })
    regularUserCookie = res.headers.get('set-cookie') ?? ''
    return regularUserCookie
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateLastAccess.mockResolvedValue(undefined)
    mockAuditLogUserAccess.mockResolvedValue(undefined)
    // Ensure getUserById returns the correct user for requireApproved middleware fallback
    mockGetUserById.mockImplementation(async (id: number) => {
      if (id === adminUser.id) return adminUser
      if (id === regularUser.id) return regularUser
      return null
    })
  })

  describe('GET /api/admin/audit-logs', () => {
    it('should return audit logs for admin', async () => {
      const cookie = await authenticateAsAdmin()

      mockAuditGetAuditLogs.mockResolvedValueOnce({
        logs: [
          {
            id: 1,
            userId: 42,
            action: 'VIEW_ITEM',
            resource: 'backlog_item',
            resourceId: 'abc-123',
            details: { method: 'GET' },
            ipAddress: '10.0.0.1',
            isAdminAction: false,
            createdAt: '2026-02-12T10:00:00.000Z',
          },
        ],
        total: 1,
      })

      const res = await fetch(
        `${baseUrl}/api/admin/audit-logs?userId=42&isAdminAction=true&page=2&limit=10`,
        { headers: { Cookie: cookie } },
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.total).toBe(1)
      expect(body.page).toBe(2)
      expect(body.limit).toBe(10)
      expect(body.logs).toHaveLength(1)

      expect(mockAuditGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, isAdminAction: true, page: 2, limit: 10 }),
      )
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 401 for unauthenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs`)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('AUTH_REQUIRED')
    })

    it('should return 400 for invalid page parameter', async () => {
      const cookie = await authenticateAsAdmin()

      const res = await fetch(`${baseUrl}/api/admin/audit-logs?page=abc`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })
})
