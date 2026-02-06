import '../config/env.js'

import type { PoolConfig } from 'pg'

/**
 * PostgreSQL pool configuration parsed from DATABASE_URL.
 *
 * Pool settings:
 *  - max 20 connections (matches architecture spec)
 *  - 30 s idle timeout — release idle clients back to the OS
 *  - 5 s connection timeout — fail fast when DB is unreachable
 */
export const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
}
