import '../config/env.js' // Ensure dotenv loaded (matches Story 1.2 pattern)

import pg from 'pg'

import { poolConfig } from '../config/database.config.js'
import { logger } from './logger.js'

const pool = new pg.Pool(poolConfig)

// Log unexpected pool-level errors but never crash the process (graceful degradation)
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error')
})

/**
 * Execute a parameterised query against the connection pool.
 *
 * For simple queries:
 *   `await query('SELECT * FROM users WHERE id = $1', [42])`
 *
 * For transactions use the exported `pool` directly:
 *   ```
 *   const client = await pool.connect()
 *   try { ... } finally { client.release() }
 *   ```
 */
export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start
  logger.debug({ text, duration, rows: result.rowCount }, 'Executed query')
  return result
}

/**
 * Lightweight connectivity probe used by the health-check endpoint.
 * Returns a structured result so the caller never has to catch.
 */
export async function testConnection(): Promise<{
  connected: boolean
  latencyMs?: number
}> {
  try {
    const start = Date.now()
    await pool.query('SELECT NOW()')
    return { connected: true, latencyMs: Date.now() - start }
  } catch (err) {
    logger.error({ err }, 'Database connection test failed')
    return { connected: false }
  }
}

export { pool }
