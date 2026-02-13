import '../config/env.js'

import type { PoolConfig } from 'pg'

const isProduction = process.env.NODE_ENV === 'production'
const sslEnabled = process.env.DB_SSL_ENABLED === 'true' || isProduction

/**
 * PostgreSQL pool configuration parsed from DATABASE_URL.
 *
 * Pool settings:
 *  - max 20 connections (matches architecture spec)
 *  - 30 s idle timeout — release idle clients back to the OS
 *  - 5 s connection timeout — fail fast when DB is unreachable
 *
 * SSL/TLS:
 *  - Enabled automatically in production (`rejectUnauthorized: true`)
 *  - Optionally enabled in dev via `DB_SSL_ENABLED=true`
 *  - Disabled by default in development
 */
export const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(sslEnabled && {
    ssl: {
      rejectUnauthorized: isProduction, // Require valid certs in production only
    },
  }),
}
