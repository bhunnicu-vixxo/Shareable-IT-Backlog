import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

import type { SyncStatusResponse } from '../types/api.types.js'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const { mockGetStatus, mockRunSync } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockRunSync: vi.fn(),
}))

vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: mockGetStatus,
    runSync: mockRunSync,
  },
}))

// Mock the logger to avoid noisy output in tests
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Sync Routes (route integration)', () => {
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
    mockRunSync.mockResolvedValue(undefined)
  })

  describe('GET /api/sync/status', () => {
    it('should return sync status JSON with 200', async () => {
      const mockStatus: SyncStatusResponse = {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'success',
        itemCount: 42,
        errorMessage: null,
        errorCode: null,
      }
      mockGetStatus.mockReturnValue(mockStatus)

      const res = await fetch(`${baseUrl}/api/sync/status`)

      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual(mockStatus)
    })

    it('should return 500 with standard error format when handler throws', async () => {
      mockGetStatus.mockImplementation(() => {
        throw new Error('boom')
      })

      const res = await fetch(`${baseUrl}/api/sync/status`)
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body).toHaveProperty('error')
      expect(body.error).toHaveProperty('message')
      expect(body.error).toHaveProperty('code', 'INTERNAL_ERROR')
    })

    it('should suppress technical errorMessage when SYNC_TRIGGER_TOKEN is configured and no token is provided', async () => {
      const original = process.env.SYNC_TRIGGER_TOKEN
      process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

      try {
        const mockStatus: SyncStatusResponse = {
          lastSyncedAt: '2026-02-10T06:00:00.000Z',
          status: 'error',
          itemCount: null,
          errorMessage: 'Network error',
          errorCode: 'SYNC_UNKNOWN_ERROR',
        }
        mockGetStatus.mockReturnValue(mockStatus)

        const res = await fetch(`${baseUrl}/api/sync/status`)
        expect(res.status).toBe(200)
        await expect(res.json()).resolves.toEqual({
          ...mockStatus,
          errorMessage: null,
        })
      } finally {
        if (original !== undefined) process.env.SYNC_TRIGGER_TOKEN = original
        else delete process.env.SYNC_TRIGGER_TOKEN
      }
    })

    it('should return technical errorMessage when SYNC_TRIGGER_TOKEN is configured and Bearer token is provided', async () => {
      const original = process.env.SYNC_TRIGGER_TOKEN
      process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

      try {
        const mockStatus: SyncStatusResponse = {
          lastSyncedAt: '2026-02-10T06:00:00.000Z',
          status: 'error',
          itemCount: null,
          errorMessage: 'Network error',
          errorCode: 'SYNC_UNKNOWN_ERROR',
        }
        mockGetStatus.mockReturnValue(mockStatus)

        const res = await fetch(`${baseUrl}/api/sync/status`, {
          headers: { Authorization: 'Bearer secret-token' },
        })
        expect(res.status).toBe(200)
        await expect(res.json()).resolves.toEqual(mockStatus)
      } finally {
        if (original !== undefined) process.env.SYNC_TRIGGER_TOKEN = original
        else delete process.env.SYNC_TRIGGER_TOKEN
      }
    })
  })

  describe('POST /api/sync/trigger', () => {
    it('should return 202 for successful trigger', async () => {
      const idleStatus: SyncStatusResponse = {
        lastSyncedAt: null,
        status: 'idle',
        itemCount: null,
        errorMessage: null,
        errorCode: null,
      }
      const syncingStatus: SyncStatusResponse = {
        lastSyncedAt: null,
        status: 'syncing',
        itemCount: null,
        errorMessage: null,
        errorCode: null,
      }
      mockGetStatus.mockReturnValueOnce(idleStatus).mockReturnValueOnce(syncingStatus)

      const res = await fetch(`${baseUrl}/api/sync/trigger`, { method: 'POST' })

      expect(res.status).toBe(202)
      await expect(res.json()).resolves.toEqual(syncingStatus)
    })

    it('should return 409 for concurrent trigger', async () => {
      const syncingStatus: SyncStatusResponse = {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'syncing',
        itemCount: null,
        errorMessage: null,
        errorCode: null,
      }
      mockGetStatus.mockReturnValue(syncingStatus)

      const res = await fetch(`${baseUrl}/api/sync/trigger`, { method: 'POST' })

      expect(res.status).toBe(409)
      await expect(res.json()).resolves.toEqual(syncingStatus)
      expect(mockRunSync).not.toHaveBeenCalled()
    })

    it('should be accessible as a POST route', async () => {
      const idleStatus: SyncStatusResponse = {
        lastSyncedAt: null,
        status: 'idle',
        itemCount: null,
        errorMessage: null,
        errorCode: null,
      }
      mockGetStatus.mockReturnValue(idleStatus)

      const res = await fetch(`${baseUrl}/api/sync/trigger`, { method: 'POST' })

      // Should not return 404 (route not found)
      expect(res.status).not.toBe(404)
    })

    it('should require SYNC_TRIGGER_TOKEN when configured', async () => {
      const original = process.env.SYNC_TRIGGER_TOKEN
      process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

      try {
        mockGetStatus.mockReturnValue({
          lastSyncedAt: null,
          status: 'idle',
          itemCount: null,
          errorMessage: null,
          errorCode: null,
        })

        const res = await fetch(`${baseUrl}/api/sync/trigger`, { method: 'POST' })
        const body = await res.json()

        expect(res.status).toBe(403)
        expect(body).toEqual({
          error: { message: 'Forbidden', code: 'FORBIDDEN' },
        })
      } finally {
        if (original !== undefined) process.env.SYNC_TRIGGER_TOKEN = original
        else delete process.env.SYNC_TRIGGER_TOKEN
      }
    })

    it('should accept Bearer token when SYNC_TRIGGER_TOKEN is configured', async () => {
      const original = process.env.SYNC_TRIGGER_TOKEN
      process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

      try {
        const idleStatus: SyncStatusResponse = {
          lastSyncedAt: null,
          status: 'idle',
          itemCount: null,
          errorMessage: null,
          errorCode: null,
        }
        const syncingStatus: SyncStatusResponse = {
          lastSyncedAt: null,
          status: 'syncing',
          itemCount: null,
          errorMessage: null,
          errorCode: null,
        }
        mockGetStatus.mockReturnValueOnce(idleStatus).mockReturnValueOnce(syncingStatus)

        const res = await fetch(`${baseUrl}/api/sync/trigger`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer secret-token',
          },
        })

        expect(res.status).toBe(202)
        await expect(res.json()).resolves.toEqual(syncingStatus)
      } finally {
        if (original !== undefined) process.env.SYNC_TRIGGER_TOKEN = original
        else delete process.env.SYNC_TRIGGER_TOKEN
      }
    })
  })
})
