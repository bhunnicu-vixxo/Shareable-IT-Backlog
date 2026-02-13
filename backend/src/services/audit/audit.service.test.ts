import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auditService } from './audit.service.js'
import type { CreateAuditLogInput } from '../../types/audit.types.js'

// Mock model layer
vi.mock('../../models/audit-log.model.js', () => ({
  insertAuditLog: vi.fn(),
  queryAuditLogs: vi.fn(),
  deleteOldAuditLogs: vi.fn(),
}))

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { insertAuditLog, queryAuditLogs, deleteOldAuditLogs } from '../../models/audit-log.model.js'
import { logger } from '../../utils/logger.js'

const mockInsert = vi.mocked(insertAuditLog)
const mockQueryLogs = vi.mocked(queryAuditLogs)
const mockDelete = vi.mocked(deleteOldAuditLogs)
const mockLogger = vi.mocked(logger)

const sampleInput: CreateAuditLogInput = {
  userId: 42,
  action: 'VIEW_ITEM',
  resource: 'backlog_item',
  resourceId: '123',
  ipAddress: '10.0.0.1',
  isAdminAction: false,
  details: { method: 'GET', path: '/api/backlog-items/123', statusCode: 200 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auditService.logUserAccess', () => {
  it('delegates to insertAuditLog', async () => {
    mockInsert.mockResolvedValueOnce({
      id: 1,
      userId: 42,
      action: 'VIEW_ITEM',
      resource: 'backlog_item',
      resourceId: '123',
      details: null,
      ipAddress: '10.0.0.1',
      isAdminAction: false,
      createdAt: '2026-02-12T10:30:00.000Z',
    })

    await auditService.logUserAccess(sampleInput)

    expect(mockInsert).toHaveBeenCalledOnce()
    expect(mockInsert).toHaveBeenCalledWith(sampleInput)
  })

  it('catches database errors and logs them (never throws)', async () => {
    const dbError = new Error('Connection refused')
    mockInsert.mockRejectedValueOnce(dbError)

    // Should NOT throw
    await expect(auditService.logUserAccess(sampleInput)).resolves.toBeUndefined()

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledOnce()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: dbError,
        entry: expect.objectContaining({
          userId: 42,
          action: 'VIEW_ITEM',
          details: undefined, // details stripped from error log
        }),
      }),
      'Failed to write audit log',
    )
  })

  it('strips details from error log entry to avoid logging sensitive data', async () => {
    mockInsert.mockRejectedValueOnce(new Error('fail'))

    await auditService.logUserAccess(sampleInput)

    const loggedEntry = (mockLogger.error.mock.calls[0][0] as Record<string, unknown>).entry as Record<string, unknown>
    expect(loggedEntry.details).toBeUndefined()
    expect(loggedEntry.userId).toBe(42)
  })
})

describe('auditService.getAuditLogs', () => {
  it('delegates to queryAuditLogs', async () => {
    const expected = { logs: [], total: 0 }
    mockQueryLogs.mockResolvedValueOnce(expected)

    const params = { userId: 42, page: 1, limit: 20 }
    const result = await auditService.getAuditLogs(params)

    expect(result).toEqual(expected)
    expect(mockQueryLogs).toHaveBeenCalledOnce()
    expect(mockQueryLogs).toHaveBeenCalledWith(params)
  })
})

describe('auditService.cleanupExpiredLogs', () => {
  it('defaults to 365 days retention', async () => {
    mockDelete.mockResolvedValueOnce(100)

    const count = await auditService.cleanupExpiredLogs()

    expect(count).toBe(100)
    expect(mockDelete).toHaveBeenCalledWith(365)
    expect(mockLogger.info).toHaveBeenCalledWith(
      { retentionDays: 365, deletedCount: 100 },
      'Audit log cleanup completed',
    )
  })

  it('accepts custom retention period', async () => {
    mockDelete.mockResolvedValueOnce(50)

    const count = await auditService.cleanupExpiredLogs(30)

    expect(count).toBe(50)
    expect(mockDelete).toHaveBeenCalledWith(30)
    expect(mockLogger.info).toHaveBeenCalledWith(
      { retentionDays: 30, deletedCount: 50 },
      'Audit log cleanup completed',
    )
  })

  it('logs the cleanup result', async () => {
    mockDelete.mockResolvedValueOnce(0)

    await auditService.cleanupExpiredLogs(365)

    expect(mockLogger.info).toHaveBeenCalledOnce()
  })
})
