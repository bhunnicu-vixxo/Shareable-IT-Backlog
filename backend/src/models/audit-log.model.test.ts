import { describe, it, expect, vi, beforeEach } from 'vitest'
import { insertAuditLog, queryAuditLogs, deleteOldAuditLogs } from './audit-log.model.js'
import type { CreateAuditLogInput } from '../types/audit.types.js'

// Mock the database utility
vi.mock('../utils/database.js', () => ({
  query: vi.fn(),
}))

import { query } from '../utils/database.js'

const mockQuery = vi.mocked(query)

const sampleRow = {
  id: 1,
  user_id: 42,
  action: 'VIEW_ITEM',
  resource: 'backlog_item',
  resource_id: '123',
  details: { method: 'GET', path: '/api/backlog-items/123', statusCode: 200 },
  ip_address: '10.0.0.1',
  is_admin_action: false,
  created_at: new Date('2026-02-12T10:30:00Z'),
}

const expectedEntry = {
  id: 1,
  userId: 42,
  action: 'VIEW_ITEM',
  resource: 'backlog_item',
  resourceId: '123',
  details: { method: 'GET', path: '/api/backlog-items/123', statusCode: 200 },
  ipAddress: '10.0.0.1',
  isAdminAction: false,
  createdAt: '2026-02-12T10:30:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('insertAuditLog', () => {
  it('inserts a log entry with all fields and returns the mapped entry', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [sampleRow],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    })

    const input: CreateAuditLogInput = {
      userId: 42,
      action: 'VIEW_ITEM',
      resource: 'backlog_item',
      resourceId: '123',
      ipAddress: '10.0.0.1',
      isAdminAction: false,
      details: { method: 'GET', path: '/api/backlog-items/123', statusCode: 200 },
    }

    const result = await insertAuditLog(input)

    expect(result).toEqual(expectedEntry)
    expect(mockQuery).toHaveBeenCalledOnce()

    // Verify parameterized query (no SQL injection)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO audit_logs')
    expect(sql).toContain('$1')
    expect(sql).toContain('$7')
    expect(params).toEqual([
      42,
      'VIEW_ITEM',
      'backlog_item',
      '123',
      JSON.stringify({ method: 'GET', path: '/api/backlog-items/123', statusCode: 200 }),
      '10.0.0.1',
      false,
    ])
  })

  it('handles null details field', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...sampleRow, details: null }],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    })

    const input: CreateAuditLogInput = {
      userId: 42,
      action: 'VIEW_BACKLOG',
      resource: 'backlog',
      resourceId: null,
      ipAddress: '10.0.0.1',
      isAdminAction: false,
      details: null,
    }

    await insertAuditLog(input)

    const params = mockQuery.mock.calls[0][1]
    expect(params![4]).toBeNull()
  })
})

describe('queryAuditLogs', () => {
  it('returns paginated results with total count and no filters', async () => {
    // Count query
    mockQuery.mockResolvedValueOnce({
      rows: [{ total: '3' }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    })
    // Data query
    mockQuery.mockResolvedValueOnce({
      rows: [sampleRow],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    })

    const result = await queryAuditLogs({})

    expect(result.total).toBe(3)
    expect(result.logs).toHaveLength(1)
    expect(result.logs[0]).toEqual(expectedEntry)

    // Count query has no WHERE
    expect(mockQuery.mock.calls[0][0]).not.toContain('WHERE')
    // Data query has ORDER BY + LIMIT/OFFSET
    const dataSql = mockQuery.mock.calls[1][0] as string
    expect(dataSql).toContain('ORDER BY created_at DESC')
    expect(dataSql).toContain('LIMIT')
    expect(dataSql).toContain('OFFSET')
  })

  it('filters by userId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({ userId: 42 })

    const countSql = mockQuery.mock.calls[0][0] as string
    expect(countSql).toContain('user_id = $1')
    expect(mockQuery.mock.calls[0][1]).toEqual([42])
  })

  it('filters by action', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({ action: 'VIEW_ITEM' })

    const countSql = mockQuery.mock.calls[0][0] as string
    expect(countSql).toContain('action = $1')
  })

  it('filters by resource', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({ resource: 'backlog' })

    const countSql = mockQuery.mock.calls[0][0] as string
    expect(countSql).toContain('resource = $1')
  })

  it('filters by date range', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({
      startDate: '2026-02-01T00:00:00Z',
      endDate: '2026-02-12T23:59:59Z',
    })

    const countSql = mockQuery.mock.calls[0][0] as string
    expect(countSql).toContain('created_at >= $1')
    expect(countSql).toContain('created_at <= $2')
    expect(mockQuery.mock.calls[0][1]).toEqual([
      '2026-02-01T00:00:00Z',
      '2026-02-12T23:59:59Z',
    ])
  })

  it('applies multiple filters together', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({ userId: 42, action: 'VIEW_ITEM', resource: 'backlog_item' })

    const countSql = mockQuery.mock.calls[0][0] as string
    expect(countSql).toContain('user_id = $1')
    expect(countSql).toContain('action = $2')
    expect(countSql).toContain('resource = $3')
  })

  it('uses correct pagination defaults (page 1, limit 50)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({})

    // No filters, so params start at $1 for LIMIT, $2 for OFFSET
    const dataParams = mockQuery.mock.calls[1][1] as unknown[]
    expect(dataParams[0]).toBe(50)  // limit
    expect(dataParams[1]).toBe(0)   // offset = (1-1) * 50
  })

  it('calculates correct offset for custom page and limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })

    await queryAuditLogs({ page: 3, limit: 20 })

    const dataParams = mockQuery.mock.calls[1][1] as unknown[]
    expect(dataParams[0]).toBe(20)  // limit
    expect(dataParams[1]).toBe(40)  // offset = (3-1) * 20
  })
})

describe('deleteOldAuditLogs', () => {
  it('deletes entries older than retention period and returns count', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 42,
      command: 'DELETE',
      oid: 0,
      fields: [],
    })

    const count = await deleteOldAuditLogs(365)

    expect(count).toBe(42)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('DELETE FROM audit_logs')
    expect(sql).toContain("INTERVAL '1 day' * $1")
    expect(params).toEqual([365])
  })

  it('returns 0 when no rows match', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'DELETE',
      oid: 0,
      fields: [],
    })

    const count = await deleteOldAuditLogs(30)

    expect(count).toBe(0)
  })

  it('handles null rowCount gracefully', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: null,
      command: 'DELETE',
      oid: 0,
      fields: [],
    })

    const count = await deleteOldAuditLogs(365)

    expect(count).toBe(0)
  })
})
