import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { decryptCredential } from './credentials.js'

// Mock process.exit to prevent test runner from exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
  throw new Error('process.exit called')
}) as never)

// Capture stdout/stderr output
const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

// Mock stdin for encrypt subcommand (reading from stdin)
const mockStdinRead = vi.fn()

// Mock readline for stdin reading
vi.mock('readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_prompt: string, cb: (answer: string) => void) => {
      cb(mockStdinRead())
    }),
    once: vi.fn((event: string, cb: (line: string) => void) => {
      if (event === 'line') {
        cb(mockStdinRead())
      }
    }),
    close: vi.fn(),
  })),
}))

// Mock the logger - export reference for test assertions
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: vi.fn(),
  },
}))

// Mock env.js
vi.mock('../config/env.js', () => ({}))

describe('credential-cli', () => {
  const originalEnv = { ...process.env }
  const originalArgv = [...process.argv]

  beforeEach(() => {
    vi.resetModules()
    mockExit.mockClear()
    mockStdoutWrite.mockClear()
    mockStderrWrite.mockClear()
    mockStdinRead.mockClear()
    mockLoggerInfo.mockClear()
    mockLoggerError.mockClear()
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-passphrase-for-unit-tests!'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    process.argv = [...originalArgv]
  })

  describe('encrypt subcommand', () => {
    it('should produce a valid enc: prefixed output', async () => {
      mockStdinRead.mockReturnValue('my-secret-api-key')
      process.argv = ['node', 'credential-cli.ts', 'encrypt']

      const { runCli } = await import('./credential-cli.js')
      await runCli()

      const stdoutOutput = mockStdoutWrite.mock.calls.map((c) => String(c[0])).join('')
      expect(stdoutOutput).toContain('enc:')

      // Verify the encrypted value can be decrypted back
      const encValue = stdoutOutput.match(/(enc:[A-Za-z0-9+/=]+)/)?.[1]
      expect(encValue).toBeTruthy()
      const decrypted = decryptCredential(encValue!)
      expect(decrypted).toBe('my-secret-api-key')
    })
  })

  describe('validate subcommand', () => {
    it('should report missing credentials', async () => {
      delete process.env.DATABASE_URL
      delete process.env.LINEAR_API_KEY
      delete process.env.SESSION_SECRET
      delete process.env.DB_ENCRYPTION_KEY
      process.argv = ['node', 'credential-cli.ts', 'validate']

      const { runCli } = await import('./credential-cli.js')

      await expect(async () => await runCli()).rejects.toThrow('process.exit called')

      // validateCredentials() now logs via logger.error, not stderr
      const loggerCalls = mockLoggerError.mock.calls.map((c) => JSON.stringify(c)).join('')
      expect(loggerCalls).toContain('DATABASE_URL')
      expect(loggerCalls).toContain('LINEAR_API_KEY')
    })

    it('should report success when all credentials present', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      process.env.LINEAR_API_KEY = 'lin_api_test123'
      process.env.SESSION_SECRET = 'test-session-secret'
      process.env.DB_ENCRYPTION_KEY = 'test-db-key'
      process.argv = ['node', 'credential-cli.ts', 'validate']

      const { runCli } = await import('./credential-cli.js')
      await runCli()

      // validateCredentials() now logs via logger.info, not stdout
      const loggerCalls = mockLoggerInfo.mock.calls.map((c) => JSON.stringify(c)).join('')
      expect(loggerCalls).toContain('All required credentials validated')
    })
  })

  describe('help output', () => {
    it('should show help when no subcommand provided', async () => {
      process.argv = ['node', 'credential-cli.ts']

      const { runCli } = await import('./credential-cli.js')
      await runCli()

      const stdoutOutput = mockStdoutWrite.mock.calls.map((c) => String(c[0])).join('')
      expect(stdoutOutput).toContain('encrypt')
      expect(stdoutOutput).toContain('validate')
    })

    it('should show help with --help flag', async () => {
      process.argv = ['node', 'credential-cli.ts', '--help']

      const { runCli } = await import('./credential-cli.js')
      await runCli()

      const stdoutOutput = mockStdoutWrite.mock.calls.map((c) => String(c[0])).join('')
      expect(stdoutOutput).toContain('encrypt')
      expect(stdoutOutput).toContain('validate')
      expect(stdoutOutput).toContain('rotate-check')
    })
  })
})
