import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptCredential } from '../utils/credentials.js'

// Prevent the env loader side-effect (dotenv) from overwriting test env vars.
vi.mock('../config/env.js', () => ({}))

// Mock logger to capture log output
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

// Mock process.exit to prevent test runner from exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
  throw new Error('process.exit called')
}) as never)

describe('credential-validator', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    mockLoggerInfo.mockClear()
    mockLoggerError.mockClear()
    mockExit.mockClear()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  function setRequiredEnv() {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.LINEAR_API_KEY = 'lin_api_test123'
    process.env.SESSION_SECRET = 'test-session-secret-value'
    process.env.DB_ENCRYPTION_KEY = 'test-db-encryption-key'
  }

  describe('validateCredentials', () => {
    it('should pass when all required credentials are present', async () => {
      setRequiredEnv()

      const { validateCredentials } = await import('./credential-validator.js')
      validateCredentials()

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ count: expect.any(Number) }),
        expect.stringContaining('All required credentials validated'),
      )
      expect(mockExit).not.toHaveBeenCalled()
    })

    it('should fail when DATABASE_URL is missing', async () => {
      setRequiredEnv()
      delete process.env.DATABASE_URL

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(['DATABASE_URL']),
        }),
        expect.any(String),
      )
    })

    it('should fail when LINEAR_API_KEY is missing', async () => {
      setRequiredEnv()
      delete process.env.LINEAR_API_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(['LINEAR_API_KEY']),
        }),
        expect.any(String),
      )
    })

    it('should fail when SESSION_SECRET is missing', async () => {
      setRequiredEnv()
      delete process.env.SESSION_SECRET

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(['SESSION_SECRET']),
        }),
        expect.any(String),
      )
    })

    it('should fail when DB_ENCRYPTION_KEY is missing', async () => {
      setRequiredEnv()
      delete process.env.DB_ENCRYPTION_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(['DB_ENCRYPTION_KEY']),
        }),
        expect.any(String),
      )
    })

    it('should report all missing credentials at once', async () => {
      // Set none of the required env vars
      delete process.env.DATABASE_URL
      delete process.env.LINEAR_API_KEY
      delete process.env.SESSION_SECRET
      delete process.env.DB_ENCRYPTION_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining([
            'DATABASE_URL',
            'LINEAR_API_KEY',
            'SESSION_SECRET',
            'DB_ENCRYPTION_KEY',
          ]),
        }),
        expect.any(String),
      )
    })

    it('should treat empty string as missing', async () => {
      setRequiredEnv()
      process.env.LINEAR_API_KEY = ''

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(['LINEAR_API_KEY']),
        }),
        expect.any(String),
      )
    })

    it('should treat whitespace-only string as missing', async () => {
      setRequiredEnv()
      process.env.DATABASE_URL = '   '

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          missing: expect.arrayContaining(['DATABASE_URL']),
        }),
        expect.any(String),
      )
    })

    it('should require CREDENTIAL_ENCRYPTION_KEY when enc: value is detected', async () => {
      setRequiredEnv()
      process.env.LINEAR_API_KEY = 'enc:abc123base64data'
      delete process.env.CREDENTIAL_ENCRYPTION_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedVars: expect.arrayContaining(['LINEAR_API_KEY']),
        }),
        expect.stringContaining('CREDENTIAL_ENCRYPTION_KEY required to decrypt encrypted credentials'),
      )
    })

    it('should pass when enc: value is present AND CREDENTIAL_ENCRYPTION_KEY is set', async () => {
      setRequiredEnv()
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-for-encryption'
      process.env.LINEAR_API_KEY = encryptCredential('lin_api_test123')

      const { validateCredentials } = await import('./credential-validator.js')
      validateCredentials()

      expect(mockExit).not.toHaveBeenCalled()
    })

    it('should detect enc: prefix on any credential env var', async () => {
      setRequiredEnv()
      process.env.SESSION_SECRET = 'enc:encrypted-session-data'
      process.env.DATABASE_URL = 'enc:encrypted-db-url'
      delete process.env.CREDENTIAL_ENCRYPTION_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedVars: expect.arrayContaining(['SESSION_SECRET', 'DATABASE_URL']),
        }),
        expect.stringContaining('CREDENTIAL_ENCRYPTION_KEY required to decrypt encrypted credentials'),
      )
    })

    it('should detect enc: prefix on SYNC_TRIGGER_TOKEN when configured', async () => {
      setRequiredEnv()
      process.env.SYNC_TRIGGER_TOKEN = 'enc:encrypted-trigger-token'
      delete process.env.CREDENTIAL_ENCRYPTION_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedVars: expect.arrayContaining(['SYNC_TRIGGER_TOKEN']),
        }),
        expect.stringContaining('CREDENTIAL_ENCRYPTION_KEY required to decrypt encrypted credentials'),
      )
    })

    it('should fail when an enc: credential value is not decryptable (wrong key)', async () => {
      setRequiredEnv()
      // Encrypt using one key, then validate using a different key
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'key-a'
      const plainUrl = 'postgresql://user:pass@localhost:5432/db'
      const encryptedUrl = encryptCredential(plainUrl)

      process.env.DATABASE_URL = encryptedUrl
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'key-b'

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DATABASE_URL',
          error: expect.any(String),
        }),
        expect.stringContaining('DATABASE_URL is malformed'),
      )
    })

    it('should fail when DATABASE_URL is malformed (not a valid postgres URL)', async () => {
      setRequiredEnv()
      process.env.DATABASE_URL = 'not-a-url'

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'DATABASE_URL' }),
        expect.stringContaining('DATABASE_URL is malformed'),
      )
    })

    it('should fail when DB_ENCRYPTION_KEY is configured with enc: prefix', async () => {
      setRequiredEnv()
      process.env.DB_ENCRYPTION_KEY = 'enc:should-not-be-encrypted'

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'DB_ENCRYPTION_KEY' }),
        expect.stringContaining('DB_ENCRYPTION_KEY does not support enc: prefix'),
      )
    })

    it('should fail when CREDENTIAL_ENCRYPTION_KEY is configured with enc: prefix', async () => {
      setRequiredEnv()
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'enc:should-not-be-encrypted'

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'CREDENTIAL_ENCRYPTION_KEY' }),
        expect.stringContaining('CREDENTIAL_ENCRYPTION_KEY must not be encrypted'),
      )
    })

    it('should never include credential values in error log messages', async () => {
      setRequiredEnv()
      process.env.LINEAR_API_KEY = 'lin_api_super_secret_value'
      delete process.env.SESSION_SECRET

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')

      // Check ALL logger calls — no credential values should appear
      const allLogCalls = [...mockLoggerError.mock.calls, ...mockLoggerInfo.mock.calls]
      const logOutput = JSON.stringify(allLogCalls)

      expect(logOutput).not.toContain('lin_api_super_secret_value')
      expect(logOutput).not.toContain('postgresql://user:pass@localhost:5432/db')
      expect(logOutput).not.toContain('test-db-encryption-key')
    })

    it('should call process.exit(1) on validation failure', async () => {
      delete process.env.DATABASE_URL
      delete process.env.LINEAR_API_KEY
      delete process.env.SESSION_SECRET
      delete process.env.DB_ENCRYPTION_KEY

      const { validateCredentials } = await import('./credential-validator.js')

      expect(() => validateCredentials()).toThrow('process.exit called')
      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })
})
