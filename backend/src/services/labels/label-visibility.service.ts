import { query, pool } from '../../utils/database.js'
import { logger } from '../../utils/logger.js'

export interface LabelVisibilityEntry {
  labelName: string
  isVisible: boolean
  showOnCards: boolean
  firstSeenAt: string
  reviewedAt: string | null
  updatedAt: string
  updatedBy: number | null
  itemCount: number
}

/**
 * List all labels with their visibility settings and approximate item counts.
 * Returns labels joined against cached backlog data to show how many items use each label.
 * Ordered: unreviewed first, then alphabetically by name.
 */
export async function listAllLabels(): Promise<LabelVisibilityEntry[]> {
  // NOTE: backlog_items is an in-memory sync cache, not a DB table.
  // Item counts are computed client-side from the already-fetched backlog data.
  const result = await query(
    `SELECT label_name, is_visible, show_on_cards,
            first_seen_at, reviewed_at, updated_at, updated_by
     FROM label_visibility
     ORDER BY reviewed_at IS NOT NULL ASC, label_name ASC`,
  )

  return result.rows.map((row) => ({
    labelName: row.label_name as string,
    isVisible: row.is_visible as boolean,
    showOnCards: row.show_on_cards as boolean,
    firstSeenAt: (row.first_seen_at as Date).toISOString(),
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
    updatedAt: (row.updated_at as Date).toISOString(),
    updatedBy: row.updated_by as number | null,
    itemCount: 0, // Computed client-side from synced backlog data
  }))
}

/**
 * Update a single label's visibility. Sets reviewed_at if previously NULL.
 * Returns the updated entry.
 */
export async function updateLabelVisibility(
  labelName: string,
  isVisible: boolean,
  adminUserId: number,
): Promise<LabelVisibilityEntry> {
  const result = await query(
    `UPDATE label_visibility
     SET is_visible = $2,
         reviewed_at = COALESCE(reviewed_at, NOW()),
         updated_at = NOW(),
         updated_by = $3
     WHERE label_name = $1
     RETURNING *`,
    [labelName, isVisible, adminUserId],
  )

  if (result.rows.length === 0) {
    const err = new Error(`Label "${labelName}" not found`) as Error & { statusCode: number; code: string }
    err.statusCode = 404
    err.code = 'LABEL_NOT_FOUND'
    throw err
  }

  const row = result.rows[0]
  return {
    labelName: row.label_name as string,
    isVisible: row.is_visible as boolean,
    showOnCards: row.show_on_cards as boolean,
    firstSeenAt: (row.first_seen_at as Date).toISOString(),
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
    updatedAt: (row.updated_at as Date).toISOString(),
    updatedBy: row.updated_by as number | null,
    itemCount: 0, // Single update does not join item counts; caller can refetch list
  }
}

/**
 * Bulk update label visibility within a single transaction.
 * Each label gets reviewed_at set if previously NULL.
 * Also creates audit log entries for each change.
 */
export async function bulkUpdateVisibility(
  updates: { labelName: string; isVisible: boolean }[],
  adminUserId: number,
  ipAddress: string = '',
): Promise<LabelVisibilityEntry[]> {
  if (updates.length === 0) return []

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const results: LabelVisibilityEntry[] = []

    for (const { labelName, isVisible } of updates) {
      const existing = await client.query(
        `SELECT * FROM label_visibility WHERE label_name = $1 FOR UPDATE`,
        [labelName],
      )

      if (existing.rows.length === 0) {
        logger.warn({ labelName }, 'Skipping unknown label in bulk update')
        continue
      }

      const before = existing.rows[0]

      const updated = await client.query(
        `UPDATE label_visibility
         SET is_visible = $2,
             reviewed_at = COALESCE(reviewed_at, NOW()),
             updated_at = NOW(),
             updated_by = $3
         WHERE label_name = $1
         RETURNING *`,
        [labelName, isVisible, adminUserId],
      )

      const row = updated.rows[0]

      // Transactional audit log for each label change
      await client.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
         VALUES ($1, 'LABEL_VISIBILITY_UPDATED', 'label_visibility', $2, $3, $4, true)`,
        [
          adminUserId,
          labelName,
          JSON.stringify({
            target: { labelName },
            before: { isVisible: before.is_visible as boolean },
            after: { isVisible: row.is_visible as boolean },
          }),
          ipAddress,
        ],
      )

      results.push({
        labelName: row.label_name as string,
        isVisible: row.is_visible as boolean,
        showOnCards: row.show_on_cards as boolean,
        firstSeenAt: (row.first_seen_at as Date).toISOString(),
        reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
        updatedAt: (row.updated_at as Date).toISOString(),
        updatedBy: row.updated_by as number | null,
        itemCount: 0,
      })
    }

    await client.query('COMMIT')

    logger.info(
      { adminUserId, labelCount: results.length },
      'Bulk label visibility update completed',
    )

    return results
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Get visible label names for the public label filter.
 * Returns just the label names where is_visible = TRUE.
 */
export async function getVisibleLabels(): Promise<string[]> {
  const result = await query(
    `SELECT label_name FROM label_visibility WHERE is_visible = TRUE ORDER BY label_name`,
  )

  return result.rows.map((row) => row.label_name as string)
}

/**
 * Get all known label names (admin/IT use-case).
 * Returns every label in label_visibility regardless of visibility.
 */
export async function getAllLabelNames(): Promise<string[]> {
  const result = await query(
    `SELECT label_name FROM label_visibility ORDER BY label_name`,
  )

  return result.rows.map((row) => row.label_name as string)
}

/**
 * Upsert labels discovered during sync.
 * New labels are added with is_visible = FALSE (opt-in model).
 * Existing labels are left untouched (DO NOTHING on conflict).
 */
export async function upsertLabelsFromSync(labelNames: string[]): Promise<void> {
  if (labelNames.length === 0) return

  // Build a single INSERT ... ON CONFLICT DO NOTHING for all labels
  const placeholders = labelNames.map((_, i) => `($${i + 1})`).join(', ')
  await query(
    `INSERT INTO label_visibility (label_name)
     VALUES ${placeholders}
     ON CONFLICT (label_name) DO NOTHING`,
    labelNames,
  )

  logger.debug({ labelCount: labelNames.length }, 'Upserted labels from sync')
}

/**
 * Get the count of unreviewed labels (reviewed_at IS NULL).
 */
export async function getUnreviewedCount(): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) AS count FROM label_visibility WHERE reviewed_at IS NULL`,
  )

  return Number(result.rows[0].count)
}
