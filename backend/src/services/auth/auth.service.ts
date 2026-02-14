import { query } from '../../utils/database.js'
import { logger } from '../../utils/logger.js'

export interface User {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isIT: boolean
  isApproved: boolean
  isDisabled: boolean
  lastAccessAt: string | null
  approvedAt: string | null
  approvedBy: number | null
  createdAt: string
  updatedAt: string
}

/**
 * Map a database row (snake_case) to a User object (camelCase).
 */
function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    email: row.email as string,
    displayName: row.display_name as string | null,
    isAdmin: row.is_admin as boolean,
    isIT: row.is_it as boolean,
    isApproved: row.is_approved as boolean,
    isDisabled: row.is_disabled as boolean,
    lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
    approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
    approvedBy: row.approved_by as number | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

/**
 * Look up a user by email. If no user exists, create one with is_approved = false.
 * Returns the user record.
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING to avoid race conditions when two
 * concurrent requests try to create the same user simultaneously.
 */
export async function lookupOrCreateUser(email: string): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim()
  const displayName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ')

  // Attempt insert; if the email already exists the INSERT is a no-op.
  const inserted = await query(
    `INSERT INTO users (email, display_name, is_admin, is_approved, is_disabled)
     VALUES ($1, $2, false, false, false)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [normalizedEmail, displayName],
  )

  if (inserted.rows.length > 0) {
    logger.info({ email: normalizedEmail }, 'Created new user (pending approval)')
    return mapRowToUser(inserted.rows[0])
  }

  // Conflict — user already exists, fetch the existing record.
  const existing = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail])
  logger.debug({ email: normalizedEmail }, 'Found existing user')
  return mapRowToUser(existing.rows[0])
}

/**
 * Get a user by their ID. Returns null if not found.
 */
export async function getUserById(id: number): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id])
  if (result.rows.length === 0) {
    return null
  }
  return mapRowToUser(result.rows[0])
}

/**
 * Update the last_access_at timestamp for a user.
 */
export async function updateLastAccess(id: number): Promise<void> {
  await query('UPDATE users SET last_access_at = NOW() WHERE id = $1', [id])
  logger.debug({ userId: id }, 'Updated last access timestamp')
}
