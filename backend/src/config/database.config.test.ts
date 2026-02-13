import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptCredential } from '../utils/credentials.js'

// Prevent the env loader side-effect (dotenv) from overwriting test env vars.
vi.mock('../config/env.js', () => ({}))

describe('database.config — SSL configuration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should enable SSL with rejectUnauthorized: true in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/app'

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.ssl).toEqual({ rejectUnauthorized: true })
  })

  it('should disable SSL by default in development', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.DB_SSL_ENABLED

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.ssl).toBeUndefined()
  })

  it('should disable SSL when DB_SSL_ENABLED is explicitly false in development', async () => {
    process.env.NODE_ENV = 'development'
    process.env.DB_SSL_ENABLED = 'false'

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.ssl).toBeUndefined()
  })

  it('should enable SSL with rejectUnauthorized: false in development when DB_SSL_ENABLED is true', async () => {
    process.env.NODE_ENV = 'development'
    process.env.DB_SSL_ENABLED = 'true'

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false })
  })

  it('should use DATABASE_URL from environment', async () => {
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://custom:pw@myhost:9999/mydb'

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.connectionString).toBe(
      'postgresql://custom:pw@myhost:9999/mydb',
    )
  })

  it('should configure pool with correct defaults', async () => {
    process.env.NODE_ENV = 'development'

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.max).toBe(20)
    expect(poolConfig.idleTimeoutMillis).toBe(30_000)
    expect(poolConfig.connectionTimeoutMillis).toBe(5_000)
  })
})

describe('database.config — decryptCredential support', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should decrypt DATABASE_URL with enc: prefix before pool creation', async () => {
    process.env.NODE_ENV = 'development'
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-passphrase-for-unit-tests!'

    const plainUrl = 'postgresql://user:pass@localhost:5432/testdb'
    const encrypted = encryptCredential(plainUrl)
    process.env.DATABASE_URL = encrypted

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.connectionString).toBe(plainUrl)
  })

  it('should pass through plaintext DATABASE_URL unchanged', async () => {
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'

    const { poolConfig } = await import('./database.config.js')

    expect(poolConfig.connectionString).toBe(
      'postgresql://user:pass@localhost:5432/testdb',
    )
  })
})
