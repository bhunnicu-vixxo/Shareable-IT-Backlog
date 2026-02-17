import type { BacklogItemDto } from '../../types/linear-entities.types.js'
import { pool } from '../../utils/database.js'
import { logger } from '../../utils/logger.js'

/**
 * Upsert synced backlog items into the `backlog_items` table.
 *
 * Uses a single transaction: truncate + batch insert. This is simpler and
 * faster than individual UPSERTs for a full-sync model where the entire
 * dataset is replaced each cycle.
 *
 * The table is used by `getUnseenCount()` to compare `created_at` against
 * a user's `last_seen_at` timestamp.
 */
export async function upsertBacklogItemsFromSync(items: BacklogItemDto[]): Promise<void> {
  if (items.length === 0) return

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Full replacement — delete stale rows and insert the latest snapshot.
    await client.query('DELETE FROM backlog_items')

    // Batch insert in chunks of 500 to avoid exceeding parameter limits.
    const CHUNK_SIZE = 500
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE)
      const values: unknown[] = []
      const placeholders: string[] = []

      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j]
        const offset = j * 5
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`)
        values.push(item.id, item.identifier, item.title, item.status, item.createdAt)
      }

      await client.query(
        `INSERT INTO backlog_items (id, identifier, title, status, created_at)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (id) DO UPDATE SET
           identifier = EXCLUDED.identifier,
           title      = EXCLUDED.title,
           status     = EXCLUDED.status,
           updated_at = NOW()`,
        values,
      )
    }

    await client.query('COMMIT')

    logger.debug(
      { service: 'sync', operation: 'upsertBacklogItems', count: items.length },
      'Persisted backlog items to database',
    )
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
