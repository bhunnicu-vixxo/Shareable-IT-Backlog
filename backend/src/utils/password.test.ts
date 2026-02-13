import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password.js'

describe('password', () => {
  const validPassword = 'SecureP@ss1'

  describe('hashPassword', () => {
    it('should return a non-plaintext hash string', async () => {
      const hash = await hashPassword(validPassword)
      expect(hash).not.toBe(validPassword)
      expect(hash).toMatch(/^\$argon2id\$/) // Argon2id encoded string
    })

    it('should produce different hashes for the same password (random salt)', async () => {
      const a = await hashPassword(validPassword)
      const b = await hashPassword(validPassword)
      expect(a).not.toBe(b)
    })

    it('should throw for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be at least 8 characters')
    })

    it('should throw for password shorter than 8 characters', async () => {
      await expect(hashPassword('short')).rejects.toThrow('Password must be at least 8 characters')
    })

    it('should accept exactly 8 character password', async () => {
      const hash = await hashPassword('12345678')
      expect(hash).toMatch(/^\$argon2id\$/)
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword(validPassword)
      const valid = await verifyPassword(hash, validPassword)
      expect(valid).toBe(true)
    })

    it('should return false for wrong password', async () => {
      const hash = await hashPassword(validPassword)
      const valid = await verifyPassword(hash, 'WrongPassword1')
      expect(valid).toBe(false)
    })

    it('should return false for empty password against a hash', async () => {
      const hash = await hashPassword(validPassword)
      const valid = await verifyPassword(hash, '')
      expect(valid).toBe(false)
    })
  })
})
