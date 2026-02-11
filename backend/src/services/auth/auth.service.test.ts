import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}))

vi.mock('../../utils/database.js', () => ({
  query: mockQuery,
  pool: {},
}))

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { lookupOrCreateUser, getUserById, updateLastAccess } from './auth.service.js'

const makeUserRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: 'user@vixxo.com',
  display_name: 'User',
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

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('lookupOrCreateUser', () => {
    it('should create new user when INSERT succeeds (no conflict)', async () => {
      const newRow = makeUserRow({ id: 2, email: 'new@vixxo.com', display_name: 'new' })
      mockQuery.mockResolvedValueOnce({ rows: [newRow] }) // INSERT ON CONFLICT returns new row

      const user = await lookupOrCreateUser('new@vixxo.com')

      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT (email) DO NOTHING')
      expect(user.id).toBe(2)
      expect(user.isApproved).toBe(false)
    })

    it('should return existing user when INSERT is a no-op (conflict)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }) // INSERT ON CONFLICT — conflict, no rows returned
      const existingRow = makeUserRow()
      mockQuery.mockResolvedValueOnce({ rows: [existingRow] }) // SELECT fallback

      const user = await lookupOrCreateUser('User@Vixxo.com')

      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery.mock.calls[1][0]).toContain('SELECT * FROM users WHERE email = $1')
      expect(mockQuery.mock.calls[1][1]).toEqual(['user@vixxo.com'])
      expect(user.id).toBe(1)
      expect(user.email).toBe('user@vixxo.com')
    })

    it('should normalize email to lowercase and trimmed', async () => {
      const row = makeUserRow()
      mockQuery.mockResolvedValueOnce({ rows: [row] }) // INSERT returns the row

      await lookupOrCreateUser('  USER@VIXXO.COM  ')

      expect(mockQuery.mock.calls[0][1]![0]).toBe('user@vixxo.com')
    })
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeUserRow()] })

      const user = await getUserById(1)

      expect(user).not.toBeNull()
      expect(user!.id).toBe(1)
    })

    it('should return null for non-existent ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const user = await getUserById(999)

      expect(user).toBeNull()
    })
  })

  describe('updateLastAccess', () => {
    it('should update last_access_at timestamp', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await updateLastAccess(1)

      expect(mockQuery).toHaveBeenCalledWith('UPDATE users SET last_access_at = NOW() WHERE id = $1', [1])
    })
  })
})
