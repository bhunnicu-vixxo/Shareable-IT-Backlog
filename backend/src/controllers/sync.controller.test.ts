import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

import { encryptCredential } from '../utils/credentials.js'
import type { SyncStatusResponse } from '../types/api.types.js'

// Use vi.hoisted so mock fns are available in hoisted vi.mock factories
const { mockGetStatus, mockRunSync } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockRunSync: vi.fn(),
}))

// Mock the sync service
vi.mock('../services/sync/sync.service.js', () => ({
  syncService: {
    getStatus: mockGetStatus,
    runSync: mockRunSync,
  },
}))

// Mock the logger to avoid side effects
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { getSyncStatus, triggerSync } from './sync.controller.js'

function createMockRequest(headers?: Record<string, string | undefined>): Request {
  return {
    header(name: string) {
      const key = name.toLowerCase()
      const value = headers?.[key] ?? headers?.[name]
      return value ?? undefined
    },
  } as unknown as Request
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

describe('SyncController.getSyncStatus', () => {
  let mockNext: NextFunction
  let originalSyncTriggerToken: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn()
    originalSyncTriggerToken = process.env.SYNC_TRIGGER_TOKEN
    delete process.env.SYNC_TRIGGER_TOKEN
  })

  afterEach(() => {
    if (originalSyncTriggerToken !== undefined) {
      process.env.SYNC_TRIGGER_TOKEN = originalSyncTriggerToken
    } else {
      delete process.env.SYNC_TRIGGER_TOKEN
    }
  })

  it('should return sync status with 200', async () => {
    const mockStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'success',
      itemCount: 42,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(mockStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual(mockStatus)
    expect(mockGetStatus).toHaveBeenCalled()
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return idle status when never synced', async () => {
    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(idleStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual(idleStatus)
  })

  it('should return error status with error message', async () => {
    const errorStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'error',
      itemCount: null,
      errorMessage: 'Network error',
      errorCode: 'SYNC_UNKNOWN_ERROR',
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(errorStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual(errorStatus)
  })

  it('should suppress technical errorMessage when SYNC_TRIGGER_TOKEN is configured and no token is provided', async () => {
    process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

    const errorStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'error',
      itemCount: null,
      errorMessage: 'Network error',
      errorCode: 'SYNC_UNKNOWN_ERROR',
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(errorStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual({
      ...errorStatus,
      errorMessage: null,
    })
  })

  it('should return technical errorMessage when SYNC_TRIGGER_TOKEN is configured and Bearer token is provided', async () => {
    process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

    const errorStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'error',
      itemCount: null,
      errorMessage: 'Network error',
      errorCode: 'SYNC_UNKNOWN_ERROR',
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(errorStatus)

    const req = createMockRequest({
      authorization: 'Bearer secret-token',
    })
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    expect(res.body).toEqual(errorStatus)
  })

  it('should match SyncStatusResponse shape', async () => {
    const mockStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'success',
      itemCount: 10,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(mockStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    const body = res.body as SyncStatusResponse
    expect(body).toHaveProperty('lastSyncedAt')
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('itemCount')
    expect(body).toHaveProperty('errorMessage')
    expect(['idle', 'syncing', 'success', 'error', 'partial']).toContain(body.status)
  })

  it('should call next with error when getStatus throws', async () => {
    const error = new Error('Unexpected error')
    mockGetStatus.mockImplementation(() => {
      throw error
    })

    const req = createMockRequest()
    const res = createMockResponse()

    await getSyncStatus(req, res as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(error)
  })
})

describe('SyncController.triggerSync', () => {
  let mockNext: NextFunction
  let originalSyncTriggerToken: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockNext = vi.fn()
    mockRunSync.mockResolvedValue(undefined)
    originalSyncTriggerToken = process.env.SYNC_TRIGGER_TOKEN
    delete process.env.SYNC_TRIGGER_TOKEN
  })

  afterEach(() => {
    if (originalSyncTriggerToken !== undefined) {
      process.env.SYNC_TRIGGER_TOKEN = originalSyncTriggerToken
    } else {
      delete process.env.SYNC_TRIGGER_TOKEN
    }
  })

  it('should return 202 and start sync when not already syncing', async () => {
    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    const syncingStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'syncing',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    // First call checks current status (idle), second call returns syncing after runSync starts
    mockGetStatus.mockReturnValueOnce(idleStatus).mockReturnValueOnce(syncingStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(202)
    expect(res.body).toEqual(syncingStatus)
    expect(mockRunSync).toHaveBeenCalled()
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 403 when SYNC_TRIGGER_TOKEN is configured and no token is provided', async () => {
    process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(idleStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({
      error: { message: 'Forbidden', code: 'FORBIDDEN' },
    })
    expect(mockRunSync).not.toHaveBeenCalled()
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should accept Bearer token when SYNC_TRIGGER_TOKEN is configured', async () => {
    process.env.SYNC_TRIGGER_TOKEN = 'secret-token'

    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    const syncingStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'syncing',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValueOnce(idleStatus).mockReturnValueOnce(syncingStatus)

    const req = createMockRequest({
      authorization: 'Bearer secret-token',
    })
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(202)
    expect(res.body).toEqual(syncingStatus)
    expect(mockRunSync).toHaveBeenCalled()
  })

  it('should return 409 when sync is already in progress', async () => {
    const syncingStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'syncing',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(syncingStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual(syncingStatus)
    expect(mockRunSync).not.toHaveBeenCalled()
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return response matching SyncStatusResponse shape', async () => {
    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'success',
      itemCount: 42,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    const syncingStatus: SyncStatusResponse = {
      lastSyncedAt: '2026-02-10T06:00:00.000Z',
      status: 'syncing',
      itemCount: 42,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValueOnce(idleStatus).mockReturnValueOnce(syncingStatus)

    const req = createMockRequest()
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    const body = res.body as SyncStatusResponse
    expect(body).toHaveProperty('lastSyncedAt')
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('itemCount')
    expect(body).toHaveProperty('errorMessage')
    expect(['idle', 'syncing', 'success', 'error', 'partial']).toContain(body.status)
  })

  it('should fire-and-forget runSync (not await it)', async () => {
    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(idleStatus)

    // Make runSync take a long time — handler should not wait
    mockRunSync.mockReturnValue(new Promise(() => {})) // never resolves

    const req = createMockRequest()
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    // Should have returned 202 immediately without waiting for runSync
    expect(res.statusCode).toBe(202)
    expect(mockRunSync).toHaveBeenCalled()
  })

  it('should call next with error when getStatus throws', async () => {
    const error = new Error('Unexpected error')
    mockGetStatus.mockImplementation(() => {
      throw error
    })

    const req = createMockRequest()
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(error)
  })

  it('should accept enc: prefixed SYNC_TRIGGER_TOKEN and decrypt it for comparison', async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-passphrase-for-unit-tests!'
    const plainToken = 'my-secret-trigger-token'
    const encryptedToken = encryptCredential(plainToken)
    process.env.SYNC_TRIGGER_TOKEN = encryptedToken

    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    const syncingStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'syncing',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValueOnce(idleStatus).mockReturnValueOnce(syncingStatus)

    const req = createMockRequest({
      authorization: `Bearer ${plainToken}`,
    })
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(202)
    expect(mockRunSync).toHaveBeenCalled()
  })

  it('should reject wrong token when SYNC_TRIGGER_TOKEN is enc: encrypted', async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-passphrase-for-unit-tests!'
    const plainToken = 'my-secret-trigger-token'
    const encryptedToken = encryptCredential(plainToken)
    process.env.SYNC_TRIGGER_TOKEN = encryptedToken

    const idleStatus: SyncStatusResponse = {
      lastSyncedAt: null,
      status: 'idle',
      itemCount: null,
      errorMessage: null,
      errorCode: null,
      itemsSynced: null,
      itemsFailed: null,
    }
    mockGetStatus.mockReturnValue(idleStatus)

    const req = createMockRequest({
      authorization: 'Bearer wrong-token-value',
    })
    const res = createMockResponse()

    await triggerSync(req, res as unknown as Response, mockNext)

    expect(res.statusCode).toBe(403)
    expect(mockRunSync).not.toHaveBeenCalled()
  })
})

