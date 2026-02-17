import { query, pool } from '../../utils/database.js'
import { logger } from '../../utils/logger.js'

export interface ManagedUser {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isIT: boolean
  isApproved: boolean
  isDisabled: boolean
  approvedAt: string | null
  lastAccessAt: string | null
  createdAt: string
}

export interface PendingUser {
  id: number
  email: string
  displayName: string | null
  createdAt: string
}

export interface ApprovedUser {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isApproved: boolean
  isDisabled: boolean
  approvedAt: string | null
  approvedBy: number | null
}

/**
 * Get all pending users (is_approved = false AND is_disabled = false).
 * Ordered by creation date (oldest first).
 */
export async function getPendingUsers(): Promise<PendingUser[]> {
  const result = await query(
    `SELECT id, email, display_name, created_at
     FROM users
     WHERE is_approved = false AND is_disabled = false
     ORDER BY created_at ASC`,
  )

  return result.rows.map((row) => ({
    id: row.id as number,
    email: row.email as string,
    displayName: row.display_name as string | null,
    createdAt: (row.created_at as Date).toISOString(),
  }))
}

/**
 * Approve a user by setting is_approved = true and recording who approved them.
 * Also creates an audit log entry for the approval action.
 * Runs inside a database transaction so the approval and audit log are atomic.
 * Throws if user not found or already approved.
 */
export async function approveUser(userId: number, adminId: number, ipAddress: string = ''): Promise<ApprovedUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check user exists and is not already approved
    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (existing.rows.length === 0) {
      const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'USER_NOT_FOUND'
      throw err
    }

    const existingUser = existing.rows[0]
    if (existingUser.is_approved) {
      const err = new Error(`User with ID ${userId} is already approved`) as Error & { statusCode: number; code: string }
      err.statusCode = 409
      err.code = 'USER_ALREADY_APPROVED'
      throw err
    }

    // Approve the user
    const result = await client.query(
      `UPDATE users
       SET is_approved = true, approved_at = NOW(), approved_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [userId, adminId],
    )

    const row = result.rows[0]

    // Create audit log entry (within same transaction)
    const beforeApprovedAt =
      existingUser.approved_at instanceof Date
        ? existingUser.approved_at.toISOString()
        : existingUser.approved_at
          ? new Date(existingUser.approved_at as string).toISOString()
          : null
    const afterApprovedAt =
      row.approved_at instanceof Date
        ? (row.approved_at as Date).toISOString()
        : row.approved_at
          ? new Date(row.approved_at as string).toISOString()
          : null

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
       VALUES ($1, 'USER_APPROVED', 'user', $2, $3, $4, true)`,
      [
        adminId,
        String(userId),
        JSON.stringify({
          target: { userId, email: existingUser.email as string },
          before: {
            isApproved: existingUser.is_approved as boolean,
            isDisabled: existingUser.is_disabled as boolean,
            approvedAt: beforeApprovedAt,
            approvedBy: (existingUser.approved_by as number | null) ?? null,
          },
          after: {
            isApproved: row.is_approved as boolean,
            isDisabled: row.is_disabled as boolean,
            approvedAt: afterApprovedAt,
            approvedBy: (row.approved_by as number | null) ?? null,
          },
        }),
        ipAddress,
      ],
    )

    await client.query('COMMIT')

    logger.info({ userId, adminId, email: existingUser.email }, 'User approved by admin')

    return {
      id: row.id as number,
      email: row.email as string,
      displayName: row.display_name as string | null,
      isAdmin: row.is_admin as boolean,
      isApproved: row.is_approved as boolean,
      isDisabled: row.is_disabled as boolean,
      approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
      approvedBy: row.approved_by as number | null,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Disable a user's access by setting is_disabled = true.
 * Prevents self-lockout (admin cannot disable their own account).
 * Creates an audit log entry for the action.
 * Runs inside a database transaction.
 */
export async function disableUser(userId: number, adminId: number, ipAddress: string = ''): Promise<ManagedUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (existing.rows.length === 0) {
      const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'USER_NOT_FOUND'
      throw err
    }

    const user = existing.rows[0]

    // Prevent self-lockout
    if (userId === adminId) {
      const err = new Error('Cannot disable your own account') as Error & { statusCode: number; code: string }
      err.statusCode = 400
      err.code = 'SELF_DISABLE_FORBIDDEN'
      throw err
    }

    // Disabling is intended for approved users (pending users managed via approval flow)
    if (!user.is_approved) {
      const err = new Error(`User with ID ${userId} is not approved`) as Error & { statusCode: number; code: string }
      err.statusCode = 409
      err.code = 'USER_NOT_APPROVED'
      throw err
    }

    if (user.is_disabled) {
      const err = new Error(`User with ID ${userId} is already disabled`) as Error & { statusCode: number; code: string }
      err.statusCode = 409
      err.code = 'USER_ALREADY_DISABLED'
      throw err
    }

    const result = await client.query(
      `UPDATE users SET is_disabled = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId],
    )

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
       VALUES ($1, 'USER_DISABLED', 'user', $2, $3, $4, true)`,
      [
        adminId,
        String(userId),
        JSON.stringify({
          target: { userId, email: user.email as string },
          before: { isDisabled: user.is_disabled as boolean },
          after: { isDisabled: true },
        }),
        ipAddress,
      ],
    )

    await client.query('COMMIT')

    logger.info({ userId, adminId, email: user.email }, 'User disabled by admin')

    const row = result.rows[0]
    return {
      id: row.id as number,
      email: row.email as string,
      displayName: row.display_name as string | null,
      isAdmin: row.is_admin as boolean,
      isIT: row.is_it as boolean,
      isApproved: row.is_approved as boolean,
      isDisabled: row.is_disabled as boolean,
      approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
      lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Re-enable a disabled user by setting is_disabled = false.
 * Creates an audit log entry for the action.
 * Runs inside a database transaction.
 */
export async function enableUser(userId: number, adminId: number, ipAddress: string = ''): Promise<ManagedUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (existing.rows.length === 0) {
      const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'USER_NOT_FOUND'
      throw err
    }

    const user = existing.rows[0]

    if (!user.is_disabled) {
      const err = new Error(`User with ID ${userId} is not disabled`) as Error & { statusCode: number; code: string }
      err.statusCode = 409
      err.code = 'USER_NOT_DISABLED'
      throw err
    }

    const result = await client.query(
      `UPDATE users SET is_disabled = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId],
    )

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
       VALUES ($1, 'USER_ENABLED', 'user', $2, $3, $4, true)`,
      [
        adminId,
        String(userId),
        JSON.stringify({
          target: { userId, email: user.email as string },
          before: { isDisabled: user.is_disabled as boolean },
          after: { isDisabled: false },
        }),
        ipAddress,
      ],
    )

    await client.query('COMMIT')

    logger.info({ userId, adminId, email: user.email }, 'User re-enabled by admin')

    const row = result.rows[0]
    return {
      id: row.id as number,
      email: row.email as string,
      displayName: row.display_name as string | null,
      isAdmin: row.is_admin as boolean,
      isIT: row.is_it as boolean,
      isApproved: row.is_approved as boolean,
      isDisabled: row.is_disabled as boolean,
      approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
      lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Update a user's IT role (is_it flag).
 * Creates an audit log entry for the action.
 * Runs inside a database transaction.
 */
export async function updateUserITRole(
  userId: number,
  isIT: boolean,
  adminId: number,
  ipAddress: string = '',
): Promise<ManagedUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (existing.rows.length === 0) {
      const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'USER_NOT_FOUND'
      throw err
    }

    const user = existing.rows[0]

    const result = await client.query(
      `UPDATE users SET is_it = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId, isIT],
    )

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
       VALUES ($1, 'USER_IT_ROLE_UPDATED', 'user', $2, $3, $4, true)`,
      [
        adminId,
        String(userId),
        JSON.stringify({
          target: { userId, email: user.email as string },
          before: { isIT: user.is_it as boolean },
          after: { isIT },
        }),
        ipAddress,
      ],
    )

    await client.query('COMMIT')

    logger.info({ userId, adminId, isIT, email: user.email }, 'User IT role updated by admin')

    const row = result.rows[0]
    return {
      id: row.id as number,
      email: row.email as string,
      displayName: row.display_name as string | null,
      isAdmin: row.is_admin as boolean,
      isIT: row.is_it as boolean,
      isApproved: row.is_approved as boolean,
      isDisabled: row.is_disabled as boolean,
      approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
      lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Get ALL users (approved, pending, disabled) for admin management view.
 * Ordered by creation date (oldest first).
 */
export async function getAllUsers(): Promise<ManagedUser[]> {
  const result = await query(
    `SELECT id, email, display_name, is_admin, is_it, is_approved, is_disabled,
            approved_at, last_access_at, created_at
     FROM users
     ORDER BY created_at ASC`,
  )

  return result.rows.map((row) => ({
    id: row.id as number,
    email: row.email as string,
    displayName: row.display_name as string | null,
    isAdmin: row.is_admin as boolean,
    isIT: row.is_it as boolean,
    isApproved: row.is_approved as boolean,
    isDisabled: row.is_disabled as boolean,
    approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
    lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
    createdAt: (row.created_at as Date).toISOString(),
  }))
}

// ── Unseen / "What's New" tracking ────────────────────────────────────

export interface UnseenCountResult {
  unseenCount: number
  lastSeenAt: string | null
}

/**
 * Count backlog items the user has not yet seen.
 * An item is "unseen" when its created_at is after the user's last_seen_at.
 * If last_seen_at is NULL (first-time user), all items are unseen.
 */
export async function getUnseenCount(userId: number): Promise<UnseenCountResult> {
  const userResult = await query('SELECT last_seen_at FROM users WHERE id = $1', [userId])

  if (userResult.rows.length === 0) {
    const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
    err.statusCode = 404
    err.code = 'USER_NOT_FOUND'
    throw err
  }

  const lastSeenAt: Date | null = (userResult.rows[0].last_seen_at as Date | null) ?? null

  let countResult
  if (lastSeenAt) {
    countResult = await query(
      'SELECT COUNT(*)::int AS count FROM backlog_items WHERE created_at > $1',
      [lastSeenAt],
    )
  } else {
    countResult = await query('SELECT COUNT(*)::int AS count FROM backlog_items')
  }

  return {
    unseenCount: (countResult.rows[0].count as number) ?? 0,
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
  }
}

/**
 * Mark all current backlog items as "seen" by updating the user's last_seen_at to NOW().
 * Returns the updated timestamp.
 */
export async function markSeen(userId: number): Promise<{ lastSeenAt: string }> {
  const result = await query(
    `UPDATE users SET last_seen_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING last_seen_at`,
    [userId],
  )

  if (result.rows.length === 0) {
    const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
    err.statusCode = 404
    err.code = 'USER_NOT_FOUND'
    throw err
  }

  return {
    lastSeenAt: (result.rows[0].last_seen_at as Date).toISOString(),
  }
}
