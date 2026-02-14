import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQuery, mockClient } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: {
    query: vi.fn(),
    release: vi.fn(),
  },
}))

vi.mock('../../utils/database.js', () => ({
  query: mockQuery,
  pool: {
    connect: vi.fn().mockResolvedValue(mockClient),
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
  listAllLabels,
  updateLabelVisibility,
  bulkUpdateVisibility,
  getVisibleLabels,
  getAllLabelNames,
  upsertLabelsFromSync,
  getUnreviewedCount,
} from './label-visibility.service.js'

const makeLabelRow = (overrides: Record<string, unknown> = {}) => ({
  label_name: 'Bug',
  is_visible: false,
  show_on_cards: true,
  first_seen_at: new Date('2026-02-14T10:00:00Z'),
  reviewed_at: null,
  updated_at: new Date('2026-02-14T10:00:00Z'),
  updated_by: null,
  item_count: '5',
  ...overrides,
})

describe('label-visibility.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listAllLabels', () => {
    it('should return all labels with camelCase mapping and itemCount 0', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeLabelRow({ label_name: 'Bug', is_visible: true, reviewed_at: new Date('2026-02-14T12:00:00Z'), updated_by: 1 }),
          makeLabelRow({ label_name: 'Feature' }),
        ],
      })

      const result = await listAllLabels()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        labelName: 'Bug',
        isVisible: true,
        showOnCards: true,
        firstSeenAt: '2026-02-14T10:00:00.000Z',
        reviewedAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T10:00:00.000Z',
        updatedBy: 1,
        itemCount: 0,
      })
      expect(result[1].labelName).toBe('Feature')
      expect(result[1].reviewedAt).toBeNull()
      expect(result[1].itemCount).toBe(0)
    })

    it('should return empty array when no labels exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await listAllLabels()

      expect(result).toEqual([])
    })
  })

  describe('updateLabelVisibility', () => {
    it('should update a label and return the updated entry', async () => {
      const updatedRow = makeLabelRow({
        label_name: 'Bug',
        is_visible: true,
        reviewed_at: new Date('2026-02-14T14:00:00Z'),
        updated_at: new Date('2026-02-14T14:00:00Z'),
        updated_by: 1,
      })
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] })

      const result = await updateLabelVisibility('Bug', true, 1)

      expect(result.labelName).toBe('Bug')
      expect(result.isVisible).toBe(true)
      expect(result.reviewedAt).toBe('2026-02-14T14:00:00.000Z')
      expect(result.updatedBy).toBe(1)

      // Verify the SQL and params
      expect(mockQuery).toHaveBeenCalledTimes(1)
      const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]]
      expect(sql).toContain('UPDATE label_visibility')
      expect(sql).toContain('COALESCE(reviewed_at, NOW())')
      expect(params).toEqual(['Bug', true, 1])
    })

    it('should throw 404 when label not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await expect(updateLabelVisibility('NonExistent', true, 1)).rejects.toThrow(
        'Label "NonExistent" not found',
      )
    })
  })

  describe('bulkUpdateVisibility', () => {
    beforeEach(() => {
      mockClient.query.mockReset()
      mockClient.release.mockReset()
    })

    it('should update multiple labels in a transaction with audit logs', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — label "Bug" exists
      mockClient.query.mockResolvedValueOnce({ rows: [makeLabelRow({ is_visible: false })] })
      // UPDATE Bug
      mockClient.query.mockResolvedValueOnce({
        rows: [makeLabelRow({ is_visible: true, reviewed_at: new Date('2026-02-14T14:00:00Z'), updated_by: 1 })],
      })
      // INSERT audit log for Bug
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — label "Feature" exists
      mockClient.query.mockResolvedValueOnce({ rows: [makeLabelRow({ label_name: 'Feature', is_visible: true })] })
      // UPDATE Feature
      mockClient.query.mockResolvedValueOnce({
        rows: [makeLabelRow({ label_name: 'Feature', is_visible: false, reviewed_at: new Date('2026-02-14T14:00:00Z'), updated_by: 1 })],
      })
      // INSERT audit log for Feature
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await bulkUpdateVisibility(
        [
          { labelName: 'Bug', isVisible: true },
          { labelName: 'Feature', isVisible: false },
        ],
        1,
        '192.168.1.1',
      )

      expect(result).toHaveLength(2)
      expect(result[0].labelName).toBe('Bug')
      expect(result[0].isVisible).toBe(true)
      expect(result[1].labelName).toBe('Feature')
      expect(result[1].isVisible).toBe(false)

      // Verify transaction flow: BEGIN, [SELECT, UPDATE, AUDIT] x2, COMMIT = 8 calls
      expect(mockClient.query).toHaveBeenCalledTimes(8)
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN')

      // Verify audit log for Bug
      expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO audit_logs')
      expect(mockClient.query.mock.calls[3][0]).toContain('LABEL_VISIBILITY_UPDATED')
      const bugAuditParams = mockClient.query.mock.calls[3][1] as unknown[]
      expect(bugAuditParams[0]).toBe(1) // adminUserId
      expect(bugAuditParams[1]).toBe('Bug') // labelName as resourceId
      expect(bugAuditParams[3]).toBe('192.168.1.1') // ip
      const bugDetails = JSON.parse(String(bugAuditParams[2])) as Record<string, unknown>
      expect(bugDetails).toEqual({
        target: { labelName: 'Bug' },
        before: { isVisible: false },
        after: { isVisible: true },
      })

      expect(mockClient.query.mock.calls[7][0]).toBe('COMMIT')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should return empty array for empty updates', async () => {
      const result = await bulkUpdateVisibility([], 1)

      expect(result).toEqual([])
      expect(mockClient.query).not.toHaveBeenCalled()
    })

    it('should skip unknown labels and continue', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — "Unknown" not found
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — "Bug" exists
      mockClient.query.mockResolvedValueOnce({ rows: [makeLabelRow({ is_visible: false })] })
      // UPDATE Bug
      mockClient.query.mockResolvedValueOnce({
        rows: [makeLabelRow({ is_visible: true, reviewed_at: new Date('2026-02-14T14:00:00Z'), updated_by: 1 })],
      })
      // INSERT audit log for Bug
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await bulkUpdateVisibility(
        [
          { labelName: 'Unknown', isVisible: true },
          { labelName: 'Bug', isVisible: true },
        ],
        1,
      )

      expect(result).toHaveLength(1)
      expect(result[0].labelName).toBe('Bug')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should ROLLBACK on error', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT throws
      mockClient.query.mockRejectedValueOnce(new Error('DB connection lost'))
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(
        bulkUpdateVisibility([{ labelName: 'Bug', isVisible: true }], 1),
      ).rejects.toThrow('DB connection lost')

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('getVisibleLabels', () => {
    it('should return visible label names sorted alphabetically', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { label_name: 'Bug' },
          { label_name: 'Enhancement' },
          { label_name: 'Feature' },
        ],
      })

      const result = await getVisibleLabels()

      expect(result).toEqual(['Bug', 'Enhancement', 'Feature'])
      expect(mockQuery.mock.calls[0][0]).toContain('is_visible = TRUE')
    })

    it('should return empty array when no labels visible', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await getVisibleLabels()

      expect(result).toEqual([])
    })
  })

  describe('getAllLabelNames', () => {
    it('should return all label names sorted alphabetically', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { label_name: 'Bug' },
          { label_name: 'Enhancement' },
          { label_name: 'Feature' },
        ],
      })

      const result = await getAllLabelNames()

      expect(result).toEqual(['Bug', 'Enhancement', 'Feature'])
      expect(mockQuery.mock.calls[0][0]).toContain('FROM label_visibility')
    })

    it('should return empty array when no labels exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await getAllLabelNames()

      expect(result).toEqual([])
    })
  })

  describe('upsertLabelsFromSync', () => {
    it('should insert labels with ON CONFLICT DO NOTHING', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await upsertLabelsFromSync(['Bug', 'Feature', 'Enhancement'])

      expect(mockQuery).toHaveBeenCalledTimes(1)
      const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]]
      expect(sql).toContain('INSERT INTO label_visibility')
      expect(sql).toContain('ON CONFLICT (label_name) DO NOTHING')
      expect(sql).toContain('($1), ($2), ($3)')
      expect(params).toEqual(['Bug', 'Feature', 'Enhancement'])
    })

    it('should skip when no labels provided', async () => {
      await upsertLabelsFromSync([])

      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('getUnreviewedCount', () => {
    it('should return count of unreviewed labels', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '7' }] })

      const result = await getUnreviewedCount()

      expect(result).toBe(7)
      expect(mockQuery.mock.calls[0][0]).toContain('reviewed_at IS NULL')
    })

    it('should return 0 when all labels are reviewed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] })

      const result = await getUnreviewedCount()

      expect(result).toBe(0)
    })
  })
})
