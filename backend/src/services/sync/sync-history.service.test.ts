import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}))

vi.mock('../../utils/database.js', () => ({
  query: mockQuery,
  pool: {
    connect: vi.fn(),
  },
}))

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  createSyncHistoryEntry,
  completeSyncHistoryEntry,
  listSyncHistory,
} from './sync-history.service.js'

describe('sync-history.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSyncHistoryEntry', () => {
    it('should insert a new entry with syncing status and return the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] })

      const id = await createSyncHistoryEntry({
        triggerType: 'manual',
        triggeredBy: 5,
      })

      expect(id).toBe(42)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_history'),
        ['syncing', 'manual', 5],
      )
    })

    it('should default triggeredBy to null', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] })

      await createSyncHistoryEntry({ triggerType: 'scheduled' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_history'),
        ['syncing', 'scheduled', null],
      )
    })

    it('should handle startup trigger type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 7 }] })

      const id = await createSyncHistoryEntry({ triggerType: 'startup' })

      expect(id).toBe(7)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_history'),
        ['syncing', 'startup', null],
      )
    })
  })

  describe('completeSyncHistoryEntry', () => {
    it('should update entry with success status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await completeSyncHistoryEntry({
        id: 42,
        status: 'success',
        completedAt: '2026-02-10T12:00:00.000Z',
        durationMs: 1500,
        itemsSynced: 100,
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_history'),
        ['success', '2026-02-10T12:00:00.000Z', 1500, 100, 0, null, null, 42],
      )
    })

    it('should update entry with error status and error details', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const errorDetails = { errorCode: 'SYNC_API_UNAVAILABLE' }
      await completeSyncHistoryEntry({
        id: 10,
        status: 'error',
        completedAt: '2026-02-10T12:01:00.000Z',
        durationMs: 500,
        itemsSynced: 0,
        itemsFailed: 0,
        errorMessage: 'Connection refused',
        errorDetails,
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_history'),
        ['error', '2026-02-10T12:01:00.000Z', 500, 0, 0, 'Connection refused', errorDetails, 10],
      )
    })

    it('should handle partial status with itemsFailed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await completeSyncHistoryEntry({
        id: 15,
        status: 'partial',
        completedAt: '2026-02-10T12:02:00.000Z',
        durationMs: 3000,
        itemsSynced: 80,
        itemsFailed: 5,
        errorMessage: 'Some items failed to sync',
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_history'),
        ['partial', '2026-02-10T12:02:00.000Z', 3000, 80, 5, 'Some items failed to sync', null, 15],
      )
    })
  })

  describe('listSyncHistory', () => {
    const makeSyncHistoryRow = (overrides: Record<string, unknown> = {}) => ({
      id: 1,
      status: 'success',
      trigger_type: 'scheduled',
      triggered_by: null,
      started_at: new Date('2026-02-10T06:00:00Z'),
      completed_at: new Date('2026-02-10T06:00:02Z'),
      duration_ms: 2000,
      items_synced: 100,
      items_failed: 0,
      error_message: null,
      error_details: null,
      created_at: new Date('2026-02-10T06:00:00Z'),
      ...overrides,
    })

    it('should return entries mapped to camelCase', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeSyncHistoryRow()],
      })

      const result = await listSyncHistory()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 1,
        status: 'success',
        triggerType: 'scheduled',
        triggeredBy: null,
        startedAt: '2026-02-10T06:00:00.000Z',
        completedAt: '2026-02-10T06:00:02.000Z',
        durationMs: 2000,
        itemsSynced: 100,
        itemsFailed: 0,
        errorMessage: null,
        errorDetails: null,
        createdAt: '2026-02-10T06:00:00.000Z',
      })
    })

    it('should use default limit of 50', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await listSyncHistory()

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY started_at DESC'),
        [50],
      )
    })

    it('should respect custom limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await listSyncHistory({ limit: 10 })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [10],
      )
    })

    it('should clamp limit to max 200', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await listSyncHistory({ limit: 999 })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [200],
      )
    })

    it('should clamp limit to min 1', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await listSyncHistory({ limit: 0 })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [1],
      )
    })

    it('should return empty array when no history', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await listSyncHistory()

      expect(result).toEqual([])
    })

    it('should handle error entries with error details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeSyncHistoryRow({
            id: 2,
            status: 'error',
            trigger_type: 'manual',
            triggered_by: 5,
            completed_at: new Date('2026-02-10T06:00:01Z'),
            duration_ms: 1000,
            items_synced: 0,
            items_failed: 0,
            error_message: 'Connection refused',
            error_details: { errorCode: 'SYNC_API_UNAVAILABLE' },
          }),
        ],
      })

      const result = await listSyncHistory()

      expect(result[0].status).toBe('error')
      expect(result[0].triggerType).toBe('manual')
      expect(result[0].triggeredBy).toBe(5)
      expect(result[0].errorMessage).toBe('Connection refused')
      expect(result[0].errorDetails).toEqual({ errorCode: 'SYNC_API_UNAVAILABLE' })
    })

    it('should parse error_details when returned as a JSON string', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeSyncHistoryRow({
            status: 'error',
            error_message: 'Bad stuff',
            error_details: JSON.stringify({ errorCode: 'SYNC_UNKNOWN_ERROR' }),
          }),
        ],
      })

      const result = await listSyncHistory()

      expect(result[0].errorDetails).toEqual({ errorCode: 'SYNC_UNKNOWN_ERROR' })
    })

    it('should handle timestamp fields returned as strings', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeSyncHistoryRow({
            started_at: '2026-02-10T06:00:00Z',
            completed_at: '2026-02-10T06:00:02Z',
            created_at: '2026-02-10T06:00:00Z',
          }),
        ],
      })

      const result = await listSyncHistory()

      expect(result[0].startedAt).toBe('2026-02-10T06:00:00.000Z')
      expect(result[0].completedAt).toBe('2026-02-10T06:00:02.000Z')
      expect(result[0].createdAt).toBe('2026-02-10T06:00:00.000Z')
    })

    it('should handle entries with null completed_at (still running)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeSyncHistoryRow({
            status: 'syncing',
            completed_at: null,
            duration_ms: null,
          }),
        ],
      })

      const result = await listSyncHistory()

      expect(result[0].completedAt).toBeNull()
      expect(result[0].durationMs).toBeNull()
    })
  })
})
