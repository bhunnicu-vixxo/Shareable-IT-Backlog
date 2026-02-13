import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

const {
  mockLookupOrCreateUser,
  mockGetUserById,
  mockUpdateLastAccess,
  mockGetPendingUsers,
  mockApproveUser,
  mockGetAllUsers,
  mockDisableUser,
  mockEnableUser,
  mockListSyncHistory,
  mockAuditLogAdminAction,
} = vi.hoisted(() => ({
  mockLookupOrCreateUser: vi.fn(),
  mockGetUserById: vi.fn(),
  mockUpdateLastAccess: vi.fn(),
  mockGetPendingUsers: vi.fn(),
  mockApproveUser: vi.fn(),
  mockGetAllUsers: vi.fn(),
  mockDisableUser: vi.fn(),
  mockEnableUser: vi.fn(),
  mockListSyncHistory: vi.fn(),
  mockAuditLogAdminAction: vi.fn(),
}))

vi.mock('../services/auth/auth.service.js', () => ({
  lookupOrCreateUser: mockLookupOrCreateUser,
  getUserById: mockGetUserById,
  updateLastAccess: mockUpdateLastAccess,
}))

vi.mock('../services/users/user.service.js', () => ({
  getPendingUsers: mockGetPendingUsers,
  approveUser: mockApproveUser,
  getAllUsers: mockGetAllUsers,
  disableUser: mockDisableUser,
  enableUser: mockEnableUser,
}))

vi.mock('../services/audit/audit.service.js', () => ({
  auditService: {
    logAdminAction: mockAuditLogAdminAction,
    // audit middleware may call this; keep it as a harmless noop
    logUserAccess: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock database for session store
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

// Mock sync service — import for re-initializing after clearAllMocks
const { mockSyncGetStatus, mockSyncRunSync } = vi.hoisted(() => ({
  mockSyncGetStatus: vi.fn(),
  mockSyncRunSync: vi.fn(),
}))

vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: mockSyncGetStatus,
    runSync: mockSyncRunSync,
  },
}))

// Mock sync history service
vi.mock('../services/sync/sync-history.service.js', () => ({
  listSyncHistory: mockListSyncHistory,
  createSyncHistoryEntry: vi.fn().mockResolvedValue(1),
  completeSyncHistoryEntry: vi.fn().mockResolvedValue(undefined),
}))

describe('Admin Routes (integration)', () => {
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
    mockAuditLogAdminAction.mockResolvedValue(undefined)
    // Re-establish sync mocks after clearAllMocks (vitest v4 clears factory implementations)
    mockSyncGetStatus.mockReturnValue({ status: 'idle', lastSyncedAt: null, itemCount: null, errorMessage: null, errorCode: null })
    mockSyncRunSync.mockResolvedValue(undefined)
    mockListSyncHistory.mockResolvedValue([])
    // Ensure getUserById returns the correct user for requireApproved middleware fallback
    mockGetUserById.mockImplementation(async (id: number) => {
      if (id === adminUser.id) return adminUser
      if (id === regularUser.id) return regularUser
      return null
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

  describe('GET /api/admin/users/pending', () => {
    it('should return pending users for admin', async () => {
      const cookie = await authenticateAsAdmin()
      const pendingUsers = [
        { id: 3, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00.000Z' },
      ]
      mockGetPendingUsers.mockResolvedValue(pendingUsers)

      const res = await fetch(`${baseUrl}/api/admin/users/pending`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(pendingUsers)
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/users/pending`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('ADMIN_REQUIRED')
    })

    it('should return 401 for unauthenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/pending`)

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/admin/users/:id/approve', () => {
    it('should approve user when admin requests', async () => {
      const cookie = await authenticateAsAdmin()
      const approvedUser = {
        id: 3,
        email: 'pending@vixxo.com',
        isApproved: true,
        approvedBy: 1,
      }
      mockApproveUser.mockResolvedValue(approvedUser)

      const res = await fetch(`${baseUrl}/api/admin/users/3/approve`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.isApproved).toBe(true)
      expect(mockApproveUser).toHaveBeenCalledWith(3, 1, expect.any(String))
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/users/3/approve`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/admin/users', () => {
    it('should return all users for admin', async () => {
      const cookie = await authenticateAsAdmin()
      const allUsers = [
        { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false, approvedAt: '2026-02-10T10:00:00.000Z', lastAccessAt: null, createdAt: '2026-02-10T10:00:00.000Z' },
        { id: 2, email: 'user@vixxo.com', displayName: 'User', isAdmin: false, isApproved: true, isDisabled: false, approvedAt: null, lastAccessAt: null, createdAt: '2026-02-10T10:00:00.000Z' },
      ]
      mockGetAllUsers.mockResolvedValue(allUsers)

      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(allUsers)
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('should return 401 for unauthenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`)

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/admin/users/:id/disable', () => {
    it('should disable user when admin requests', async () => {
      const cookie = await authenticateAsAdmin()
      const disabledUser = {
        id: 3,
        email: 'user@vixxo.com',
        isDisabled: true,
      }
      mockDisableUser.mockResolvedValue(disabledUser)

      const res = await fetch(`${baseUrl}/api/admin/users/3/disable`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.isDisabled).toBe(true)
      expect(mockDisableUser).toHaveBeenCalledWith(3, 1, expect.any(String))
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/users/3/disable`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })
  })

  describe('POST /api/admin/users/:id/enable', () => {
    it('should enable user when admin requests', async () => {
      const cookie = await authenticateAsAdmin()
      const enabledUser = {
        id: 3,
        email: 'disabled@vixxo.com',
        isDisabled: false,
      }
      mockEnableUser.mockResolvedValue(enabledUser)

      const res = await fetch(`${baseUrl}/api/admin/users/3/enable`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.isDisabled).toBe(false)
      expect(mockEnableUser).toHaveBeenCalledWith(3, 1, expect.any(String))
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/users/3/enable`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })
  })

  describe('POST /api/admin/sync/trigger', () => {
    it('should return 202 for admin sync trigger', async () => {
      const cookie = await authenticateAsAdmin()

      const res = await fetch(`${baseUrl}/api/admin/sync/trigger`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(202)
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/sync/trigger`, {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('should return 401 for unauthenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/admin/sync/trigger`, {
        method: 'POST',
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/sync/history', () => {
    it('should return sync history for admin', async () => {
      const cookie = await authenticateAsAdmin()
      const history = [
        { id: 1, status: 'success', triggerType: 'scheduled', startedAt: '2026-02-10T06:00:00.000Z' },
      ]
      mockListSyncHistory.mockResolvedValue(history)

      const res = await fetch(`${baseUrl}/api/admin/sync/history`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(history)
    })

    it('should return 403 for non-admin user', async () => {
      const cookie = await authenticateAsRegularUser()

      const res = await fetch(`${baseUrl}/api/admin/sync/history`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(403)
    })

    it('should return 401 for unauthenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/admin/sync/history`)

      expect(res.status).toBe(401)
    })

    it('should pass limit query param', async () => {
      const cookie = await authenticateAsAdmin()
      mockListSyncHistory.mockResolvedValue([])

      const res = await fetch(`${baseUrl}/api/admin/sync/history?limit=10`, {
        headers: { Cookie: cookie },
      })

      expect(res.status).toBe(200)
      expect(mockListSyncHistory).toHaveBeenCalledWith({ limit: 10 })
    })
  })
})
