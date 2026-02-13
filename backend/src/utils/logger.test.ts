import { describe, it, expect } from 'vitest'
import pino from 'pino'
import { Writable } from 'node:stream'

/**
 * Tests for Pino logger redaction configuration.
 *
 * Replicates the redact config from logger.ts so we can verify sensitive
 * fields are masked without importing the singleton logger (which triggers
 * pino-pretty transport setup and env-dependent config).
 */

const REDACT_CONFIG = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'apiKey',
    'secret',
    'token',
    'LINEAR_API_KEY',
    'SESSION_SECRET',
    'CREDENTIAL_ENCRYPTION_KEY',
    'DB_ENCRYPTION_KEY',
  ],
  censor: '[REDACTED]',
}

/** Create a test logger that captures JSON output lines. */
function createTestLogger(): { logger: pino.Logger; getLines: () => string[] } {
  const lines: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, cb) {
      lines.push(chunk.toString())
      cb()
    },
  })
  const logger = pino({ redact: REDACT_CONFIG }, stream)
  return { logger, getLines: () => lines }
}

describe('logger redaction', () => {
  it('should redact password field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ password: 'super-secret-password' }, 'login attempt')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('super-secret-password')
  })

  it('should redact apiKey field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ apiKey: 'lin_api_abc123xyz' }, 'api call')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('lin_api_abc123xyz')
  })

  it('should redact secret field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ secret: 'my-session-secret' }, 'config loaded')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('my-session-secret')
  })

  it('should redact token field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ token: 'jwt.token.value' }, 'auth check')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('jwt.token.value')
  })

  it('should redact LINEAR_API_KEY field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ LINEAR_API_KEY: 'lin_api_production_key' }, 'linear config')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('lin_api_production_key')
  })

  it('should redact nested req.headers.authorization', () => {
    const { logger, getLines } = createTestLogger()
    logger.info(
      { req: { headers: { authorization: 'Bearer eyJhbGciOi...' } } },
      'incoming request',
    )
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('Bearer eyJhbGciOi...')
  })

  it('should redact nested req.headers.cookie', () => {
    const { logger, getLines } = createTestLogger()
    logger.info(
      { req: { headers: { cookie: 'slb.sid=s%3Aabc123' } } },
      'incoming request',
    )
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('slb.sid=s%3Aabc123')
  })

  it('should NOT redact non-sensitive fields', () => {
    const { logger, getLines } = createTestLogger()
    logger.info(
      { username: 'john.doe', email: 'john@vixxo.com', statusCode: 200 },
      'user action',
    )
    const output = getLines().join('')
    expect(output).toContain('john.doe')
    expect(output).toContain('john@vixxo.com')
    expect(output).toContain('200')
    expect(output).not.toContain('[REDACTED]')
  })

  it('should redact DB_ENCRYPTION_KEY field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ DB_ENCRYPTION_KEY: 'aes256-db-key' }, 'db init')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('aes256-db-key')
  })

  it('should redact CREDENTIAL_ENCRYPTION_KEY field', () => {
    const { logger, getLines } = createTestLogger()
    logger.info({ CREDENTIAL_ENCRYPTION_KEY: 'cred-key-value' }, 'cred init')
    const output = getLines().join('')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('cred-key-value')
  })
})
