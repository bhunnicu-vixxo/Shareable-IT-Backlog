import pino from 'pino'

import '../config/env.js'

const level = process.env.LOG_LEVEL ?? 'info'
const isDev = process.env.NODE_ENV !== 'production'

/**
 * Application logger with sensitive field redaction.
 *
 * Any log object containing the redacted paths below will have those values
 * replaced with `[REDACTED]` to prevent credentials leaking into log output.
 */
export const logger = pino({
  level,
  redact: {
    paths: [
      // Request headers
      'req.headers.authorization',
      'req.headers.cookie',
      // Common credential field names (top-level)
      'password',
      'apiKey',
      'secret',
      'token',
      // Specific environment variable names (top-level)
      'LINEAR_API_KEY',
      'SESSION_SECRET',
      'CREDENTIAL_ENCRYPTION_KEY',
      'DB_ENCRYPTION_KEY',
      'DATABASE_URL',
      'SYNC_TRIGGER_TOKEN',
      // Wildcard patterns for nested objects with credential-like fields
      '*.password',
      '*.apiKey',
      '*.secret',
      '*.token',
      '*.credential',
      '*.credentials',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
})
