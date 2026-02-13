import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// Mock database query used by encryption utilities
const mockQuery = vi.fn()
vi.mock('./database.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}))

import { encrypt, decrypt } from './encryption.js'

describe('encryption', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DB_ENCRYPTION_KEY = 'test-encryption-key-32chars-long!'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('encrypt', () => {
    it('should call pgp_sym_encrypt with plaintext and key', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ encrypted: 'c30d0407...' }],
      })

      const result = await encrypt('my-secret-value')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pgp_sym_encrypt'),
        ['my-secret-value', 'test-encryption-key-32chars-long!'],
      )
      expect(result).toBe('c30d0407...')
    })

    it('should throw when DB_ENCRYPTION_KEY is not set', async () => {
      delete process.env.DB_ENCRYPTION_KEY

      await expect(encrypt('secret')).rejects.toThrow('DB_ENCRYPTION_KEY is not configured')
    })

    it('should throw when DB_ENCRYPTION_KEY is empty string', async () => {
      process.env.DB_ENCRYPTION_KEY = '   '

      await expect(encrypt('secret')).rejects.toThrow('DB_ENCRYPTION_KEY is not configured')
    })
  })

  describe('decrypt', () => {
    it('should call pgp_sym_decrypt with encrypted value and key', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ decrypted: 'my-secret-value' }],
      })

      const result = await decrypt('c30d0407...')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pgp_sym_decrypt'),
        ['c30d0407...', 'test-encryption-key-32chars-long!'],
      )
      expect(result).toBe('my-secret-value')
    })

    it('should throw when DB_ENCRYPTION_KEY is not set', async () => {
      delete process.env.DB_ENCRYPTION_KEY

      await expect(decrypt('c30d0407...')).rejects.toThrow('DB_ENCRYPTION_KEY is not configured')
    })
  })

  describe('round-trip', () => {
    it('should pass the exact encrypted output into decrypt', async () => {
      const encryptedHex = 'c30d04070302deadbeef'
      mockQuery
        .mockResolvedValueOnce({ rows: [{ encrypted: encryptedHex }] })
        .mockResolvedValueOnce({ rows: [{ decrypted: 'hello world' }] })

      const encrypted = await encrypt('hello world')
      expect(encrypted).toBe(encryptedHex)

      await decrypt(encrypted)

      // Verify decrypt received the exact output of encrypt as its first parameter
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('pgp_sym_decrypt'),
        [encryptedHex, 'test-encryption-key-32chars-long!'],
      )
    })
  })

  describe('error handling', () => {
    it('should propagate database error when decrypting with wrong key', async () => {
      mockQuery.mockRejectedValueOnce(
        new Error('ERROR: Wrong key or corrupt data'),
      )

      await expect(decrypt('c30d0407...')).rejects.toThrow(
        'Wrong key or corrupt data',
      )
    })

    it('should throw descriptive error when encrypt returns no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await expect(encrypt('secret')).rejects.toThrow(
        'Encryption failed: pgp_sym_encrypt returned no result',
      )
    })

    it('should throw descriptive error when decrypt returns no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      await expect(decrypt('c30d0407...')).rejects.toThrow(
        'Decryption failed: pgp_sym_decrypt returned no result',
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty string encryption', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ encrypted: 'c30d0407empty' }],
      })

      const result = await encrypt('')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pgp_sym_encrypt'),
        ['', 'test-encryption-key-32chars-long!'],
      )
      expect(result).toBe('c30d0407empty')
    })

    it('should handle empty string decryption result', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ decrypted: '' }] })

      const result = await decrypt('c30d0407empty')
      expect(result).toBe('')
    })
  })
})
