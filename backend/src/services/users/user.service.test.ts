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

import { getPendingUsers, approveUser, getAllUsers, disableUser, enableUser } from './user.service.js'

const makePendingRow = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  email: 'pending@vixxo.com',
  display_name: 'Pending User',
  created_at: new Date('2026-02-10T10:00:00Z'),
  ...overrides,
})

const makeFullUserRow = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  email: 'pending@vixxo.com',
  display_name: 'Pending User',
  is_admin: false,
  is_approved: false,
  is_disabled: false,
  last_access_at: null,
  approved_at: null,
  approved_by: null,
  created_at: new Date('2026-02-10T10:00:00Z'),
  updated_at: new Date('2026-02-10T10:00:00Z'),
  ...overrides,
})

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllUsers', () => {
    it('should return all users (approved, pending, disabled)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeFullUserRow({ id: 1, email: 'admin@vixxo.com', is_admin: true, is_approved: true, approved_at: new Date('2026-02-10T12:00:00Z'), last_access_at: new Date('2026-02-10T14:00:00Z') }),
          makeFullUserRow({ id: 2, email: 'pending@vixxo.com' }),
          makeFullUserRow({ id: 3, email: 'disabled@vixxo.com', is_disabled: true }),
        ],
      })

      const result = await getAllUsers()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        id: 1,
        email: 'admin@vixxo.com',
        displayName: 'Pending User',
        isAdmin: true,
        isApproved: true,
        isDisabled: false,
        approvedAt: '2026-02-10T12:00:00.000Z',
        lastAccessAt: '2026-02-10T14:00:00.000Z',
        createdAt: '2026-02-10T10:00:00.000Z',
      })
      expect(result[1].email).toBe('pending@vixxo.com')
      expect(result[2].email).toBe('disabled@vixxo.com')
      expect(result[2].isDisabled).toBe(true)
    })

    it('should return empty array when no users', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await getAllUsers()

      expect(result).toEqual([])
    })

    it('should handle null approved_at and last_access_at', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeFullUserRow({ approved_at: null, last_access_at: null })],
      })

      const result = await getAllUsers()

      expect(result[0].approvedAt).toBeNull()
      expect(result[0].lastAccessAt).toBeNull()
    })
  })

  describe('getPendingUsers', () => {
    it('should return unapproved, non-disabled users', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makePendingRow(), makePendingRow({ id: 3, email: 'another@vixxo.com' })],
      })

      const result = await getPendingUsers()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(2)
      expect(result[0].email).toBe('pending@vixxo.com')
      expect(result[0].createdAt).toBe('2026-02-10T10:00:00.000Z')
    })

    it('should return empty array when no pending users', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const result = await getPendingUsers()

      expect(result).toEqual([])
    })
  })

  describe('approveUser', () => {
    beforeEach(() => {
      mockClient.query.mockReset()
      mockClient.release.mockReset()
    })

    it('should set is_approved, approved_at, approved_by and create audit log in a transaction', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — user exists
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow()] })
      // UPDATE user
      const approvedRow = makeFullUserRow({
        is_approved: true,
        approved_at: new Date('2026-02-10T12:00:00Z'),
        approved_by: 1,
      })
      mockClient.query.mockResolvedValueOnce({ rows: [approvedRow] })
      // INSERT audit log
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await approveUser(2, 1, '192.168.1.1')

      expect(result.isApproved).toBe(true)
      expect(result.approvedBy).toBe(1)
      // Verify transaction flow: BEGIN, SELECT, UPDATE, INSERT audit, COMMIT
      expect(mockClient.query).toHaveBeenCalledTimes(5)
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(mockClient.query.mock.calls[1][0]).toContain('SELECT * FROM users WHERE id = $1 FOR UPDATE')
      expect(mockClient.query.mock.calls[2][0]).toContain('UPDATE users')
      expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO audit_logs')
      expect(mockClient.query.mock.calls[3][0]).toContain('USER_APPROVED')
      // Verify audit details include target + before/after and IP address is passed
      const auditParams = mockClient.query.mock.calls[3][1] as unknown[]
      expect(auditParams[0]).toBe(1) // adminId
      expect(auditParams[1]).toBe('2') // target user id
      expect(auditParams[3]).toBe('192.168.1.1') // ip

      const details = JSON.parse(String(auditParams[2])) as Record<string, unknown>
      expect(details).toEqual(
        expect.objectContaining({
          target: { userId: 2, email: 'pending@vixxo.com' },
          before: expect.objectContaining({
            isApproved: false,
            isDisabled: false,
            approvedAt: null,
            approvedBy: null,
          }),
          after: expect.objectContaining({
            isApproved: true,
            isDisabled: false,
            approvedBy: 1,
          }),
        }),
      )
      expect(mockClient.query.mock.calls[4][0]).toBe('COMMIT')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 404 for non-existent user and ROLLBACK', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — not found
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(approveUser(999, 1)).rejects.toThrow('User with ID 999 not found')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 409 for already approved user and ROLLBACK', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — already approved
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ is_approved: true })] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(approveUser(2, 1)).rejects.toThrow('already approved')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('disableUser', () => {
    beforeEach(() => {
      mockClient.query.mockReset()
      mockClient.release.mockReset()
    })

    it('should set is_disabled = true and create audit log in a transaction', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — user exists, approved, not disabled
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ is_approved: true })] })
      // UPDATE user
      const disabledRow = makeFullUserRow({ is_approved: true, is_disabled: true })
      mockClient.query.mockResolvedValueOnce({ rows: [disabledRow] })
      // INSERT audit log
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await disableUser(2, 1, '192.168.1.1')

      expect(result.isDisabled).toBe(true)
      // Verify transaction flow: BEGIN, SELECT, UPDATE, INSERT audit, COMMIT
      expect(mockClient.query).toHaveBeenCalledTimes(5)
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(mockClient.query.mock.calls[1][0]).toContain('SELECT * FROM users WHERE id = $1 FOR UPDATE')
      expect(mockClient.query.mock.calls[2][0]).toContain('UPDATE users SET is_disabled = true')
      expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO audit_logs')
      expect(mockClient.query.mock.calls[3][0]).toContain('USER_DISABLED')
      const disableAuditParams = mockClient.query.mock.calls[3][1] as unknown[]
      expect(disableAuditParams[0]).toBe(1) // adminId
      expect(disableAuditParams[1]).toBe('2') // target user id
      expect(disableAuditParams[3]).toBe('192.168.1.1') // ip
      const disableDetails = JSON.parse(String(disableAuditParams[2])) as Record<string, unknown>
      expect(disableDetails).toEqual(
        expect.objectContaining({
          target: { userId: 2, email: 'pending@vixxo.com' },
          before: expect.objectContaining({ isDisabled: false }),
          after: expect.objectContaining({ isDisabled: true }),
        }),
      )
      expect(mockClient.query.mock.calls[4][0]).toBe('COMMIT')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 404 for non-existent user', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — not found
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(disableUser(999, 1)).rejects.toThrow('User with ID 999 not found')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 400 for self-disable attempt', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — user exists
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ id: 1 })] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(disableUser(1, 1)).rejects.toThrow('Cannot disable your own account')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 409 for already-disabled user', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — already disabled
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ is_approved: true, is_disabled: true })] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(disableUser(2, 1)).rejects.toThrow('already disabled')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 409 for unapproved user', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — unapproved user
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ is_approved: false })] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(disableUser(2, 1)).rejects.toThrow('is not approved')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('enableUser', () => {
    beforeEach(() => {
      mockClient.query.mockReset()
      mockClient.release.mockReset()
    })

    it('should set is_disabled = false and create audit log in a transaction', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT FOR UPDATE — user exists, disabled
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ is_disabled: true })] })
      // UPDATE user
      const enabledRow = makeFullUserRow({ is_disabled: false })
      mockClient.query.mockResolvedValueOnce({ rows: [enabledRow] })
      // INSERT audit log
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await enableUser(3, 1, '192.168.1.1')

      expect(result.isDisabled).toBe(false)
      // Verify transaction flow: BEGIN, SELECT, UPDATE, INSERT audit, COMMIT
      expect(mockClient.query).toHaveBeenCalledTimes(5)
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(mockClient.query.mock.calls[2][0]).toContain('UPDATE users SET is_disabled = false')
      expect(mockClient.query.mock.calls[3][0]).toContain('USER_ENABLED')
      const enableAuditParams = mockClient.query.mock.calls[3][1] as unknown[]
      expect(enableAuditParams[0]).toBe(1) // adminId
      expect(enableAuditParams[1]).toBe('3') // target user id
      expect(enableAuditParams[3]).toBe('192.168.1.1') // ip
      const enableDetails = JSON.parse(String(enableAuditParams[2])) as Record<string, unknown>
      expect(enableDetails).toEqual(
        expect.objectContaining({
          target: { userId: 3, email: 'pending@vixxo.com' },
          before: expect.objectContaining({ isDisabled: true }),
          after: expect.objectContaining({ isDisabled: false }),
        }),
      )
      expect(mockClient.query.mock.calls[4][0]).toBe('COMMIT')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 404 for non-existent user', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — not found
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(enableUser(999, 1)).rejects.toThrow('User with ID 999 not found')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should throw 409 for user that is not disabled', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // SELECT — not disabled
      mockClient.query.mockResolvedValueOnce({ rows: [makeFullUserRow({ is_disabled: false })] })
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(enableUser(2, 1)).rejects.toThrow('is not disabled')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalled()
    })
  })
})
