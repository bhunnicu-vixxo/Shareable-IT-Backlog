import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { encryptCredential, decryptCredential } from './credentials.js'

describe('credentials', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-passphrase-for-unit-tests!'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('encryptCredential', () => {
    it('should return a string with enc: prefix', () => {
      const result = encryptCredential('my-api-key')
      expect(result).toMatch(/^enc:/)
    })

    it('should produce different ciphertexts for same plaintext (random salt/iv)', () => {
      const a = encryptCredential('same-value')
      const b = encryptCredential('same-value')
      expect(a).not.toBe(b)
    })

    it('should throw when CREDENTIAL_ENCRYPTION_KEY is not set', () => {
      delete process.env.CREDENTIAL_ENCRYPTION_KEY
      expect(() => encryptCredential('secret')).toThrow('CREDENTIAL_ENCRYPTION_KEY is required')
    })
  })

  describe('decryptCredential', () => {
    it('should decrypt an enc: prefixed value back to plaintext', () => {
      const encrypted = encryptCredential('lin_api_test123')
      const decrypted = decryptCredential(encrypted)
      expect(decrypted).toBe('lin_api_test123')
    })

    it('should return plaintext values unchanged (no enc: prefix)', () => {
      const result = decryptCredential('plain-api-key')
      expect(result).toBe('plain-api-key')
    })

    it('should handle empty string as plaintext passthrough', () => {
      const result = decryptCredential('')
      expect(result).toBe('')
    })

    it('should throw when CREDENTIAL_ENCRYPTION_KEY is missing for enc: value', () => {
      const encrypted = encryptCredential('secret')
      delete process.env.CREDENTIAL_ENCRYPTION_KEY
      expect(() => decryptCredential(encrypted)).toThrow('CREDENTIAL_ENCRYPTION_KEY is required')
    })

    it('should throw when decrypting with wrong key', () => {
      const encrypted = encryptCredential('secret')
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'wrong-key-completely-different!'
      expect(() => decryptCredential(encrypted)).toThrow()
    })
  })

  describe('round-trip', () => {
    it('should encrypt and decrypt various credential formats', () => {
      const testValues = [
        'lin_api_abcdef123456',
        'change-me-in-production-super-secret',
        'postgresql://user:p@ssw0rd@localhost:5432/db',
        'a', // single character
        'key with spaces and special chars! @#$%',
      ]

      for (const original of testValues) {
        const encrypted = encryptCredential(original)
        const decrypted = decryptCredential(encrypted)
        expect(decrypted).toBe(original)
      }
    })
  })
})
