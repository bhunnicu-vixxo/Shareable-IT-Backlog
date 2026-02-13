import { logger } from '../utils/logger.js'
import { decryptCredential } from '../utils/credentials.js'

/**
 * Required environment variable credentials that MUST be present at startup.
 * Missing any of these will cause the application to fail fast with exit(1).
 */
const REQUIRED_CREDENTIALS = [
  'DATABASE_URL',
  'LINEAR_API_KEY',
  'SESSION_SECRET',
  'DB_ENCRYPTION_KEY',
] as const

/**
 * All credential environment variables that support the `enc:` prefix.
 * If any of these contain an `enc:` value, CREDENTIAL_ENCRYPTION_KEY must be set.
 * Includes required credentials plus optional credential env vars.
 */
const ENCRYPTABLE_CREDENTIALS = [
  'DATABASE_URL',
  'LINEAR_API_KEY',
  'SESSION_SECRET',
  'SYNC_TRIGGER_TOKEN',
] as const

function exitWithError(message: string, context?: Record<string, unknown>): never {
  logger.error(context ?? {}, message)
  process.exit(1)
}

function isMissing(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

function resolveEncryptable(name: (typeof ENCRYPTABLE_CREDENTIALS)[number]): string | undefined {
  const raw = process.env[name]
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('enc:') ? decryptCredential(trimmed) : trimmed
}

function validateDatabaseUrl(resolved: string): void {
  try {
    const url = new URL(resolved)
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('unsupported protocol')
    }
  } catch {
    exitWithError('Startup credential validation failed: DATABASE_URL is malformed', {
      name: 'DATABASE_URL',
    })
  }
}

function validateNoWhitespace(name: string, value: string): void {
  if (/\s/.test(value)) {
    exitWithError(`Startup credential validation failed: ${name} is malformed`, { name })
  }
}

/**
 * Validate all required application credentials at startup.
 *
 * - Checks that all required env vars are present and non-empty.
 * - Detects `enc:` prefixed values and ensures CREDENTIAL_ENCRYPTION_KEY is available.
 * - On failure: logs error (credential NAMES only, never values) and calls process.exit(1).
 * - On success: logs info-level summary with count of validated credentials.
 *
 * MUST be called BEFORE any middleware or service initialization in server.ts.
 */
export function validateCredentials(): void {
  // Guardrails: these keys are NOT encryptable via enc:
  if (process.env.DB_ENCRYPTION_KEY?.trim().startsWith('enc:')) {
    exitWithError(
      'Startup credential validation failed: DB_ENCRYPTION_KEY does not support enc: prefix',
      {
        name: 'DB_ENCRYPTION_KEY',
      },
    )
  }
  if (process.env.CREDENTIAL_ENCRYPTION_KEY?.trim().startsWith('enc:')) {
    exitWithError(
      'Startup credential validation failed: CREDENTIAL_ENCRYPTION_KEY must not be encrypted',
      {
        name: 'CREDENTIAL_ENCRYPTION_KEY',
      },
    )
  }

  // Phase 1: Check for missing required credentials
  const missing: string[] = []

  for (const name of REQUIRED_CREDENTIALS) {
    const value = process.env[name]
    if (isMissing(value)) {
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    exitWithError(
      `Startup credential validation failed: missing required credentials: ${missing.join(', ')}`,
      { missing },
    )
  }

  // Phase 2: Check for enc: values that require CREDENTIAL_ENCRYPTION_KEY
  const encryptedVars: string[] = []

  for (const name of ENCRYPTABLE_CREDENTIALS) {
    const value = process.env[name]
    if (value && value.trim().startsWith('enc:')) {
      encryptedVars.push(name)
    }
  }

  if (encryptedVars.length > 0) {
    const encKey = process.env.CREDENTIAL_ENCRYPTION_KEY
    if (isMissing(encKey)) {
      exitWithError('CREDENTIAL_ENCRYPTION_KEY required to decrypt encrypted credentials', {
        encryptedVars,
      })
    }

    // Ensure all enc: values are actually decryptable (malformed enc:, wrong key, etc.)
    for (const name of encryptedVars) {
      const value = process.env[name]?.trim()
      if (!value) continue
      try {
        decryptCredential(value)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        exitWithError(`Startup credential validation failed: ${name} is malformed`, {
          name,
          error: message,
        })
      }
    }
  }

  // Phase 3: Basic shape validation on resolved values (never log values)
  const resolvedDatabaseUrl = resolveEncryptable('DATABASE_URL')
  if (resolvedDatabaseUrl) validateDatabaseUrl(resolvedDatabaseUrl)

  const resolvedLinearApiKey = resolveEncryptable('LINEAR_API_KEY')
  if (resolvedLinearApiKey) validateNoWhitespace('LINEAR_API_KEY', resolvedLinearApiKey)

  const resolvedSessionSecret = resolveEncryptable('SESSION_SECRET')
  if (resolvedSessionSecret) {
    validateNoWhitespace('SESSION_SECRET', resolvedSessionSecret)
    if (process.env.NODE_ENV === 'production' && resolvedSessionSecret.trim().length < 32) {
      exitWithError(
        'Startup credential validation failed: SESSION_SECRET must be set to a strong secret (32+ chars) in production',
        { name: 'SESSION_SECRET' },
      )
    }
  }

  const resolvedSyncToken = resolveEncryptable('SYNC_TRIGGER_TOKEN')
  if (resolvedSyncToken !== undefined && resolvedSyncToken.trim().length === 0) {
    exitWithError('Startup credential validation failed: SYNC_TRIGGER_TOKEN is malformed', {
      name: 'SYNC_TRIGGER_TOKEN',
    })
  }

  // All checks passed
  logger.info(
    { count: REQUIRED_CREDENTIALS.length, encryptedCount: encryptedVars.length },
    'All required credentials validated',
  )
}
