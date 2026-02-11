import type { SyncHistoryEntry, SyncHistoryStatus, SyncTriggerType } from '../../types/api.types.js'
import { query } from '../../utils/database.js'
import { logger } from '../../utils/logger.js'

/** Maximum number of history entries that can be requested at once. */
const MAX_LIMIT = 200
/** Default number of history entries returned when no limit is specified. */
const DEFAULT_LIMIT = 50

function toIsoString(value: unknown, fieldName: string): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  throw new Error(`Invalid ${fieldName} value`)
}

function toNullableIsoString(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) return null
  return toIsoString(value, fieldName)
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(n)) return n
  return fallback
}

function toNullableJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (typeof parsed === 'object' && parsed) return parsed as Record<string, unknown>
      return null
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && value) return value as Record<string, unknown>
  return null
}

interface CreateSyncHistoryInput {
  triggerType: SyncTriggerType
  triggeredBy?: number | null
}

interface CompleteSyncHistoryInput {
  id: number
  status: SyncHistoryStatus
  completedAt: string
  durationMs: number
  itemsSynced?: number
  itemsFailed?: number
  errorMessage?: string | null
  errorDetails?: Record<string, unknown> | null
}

/**
 * Map a snake_case database row to a camelCase SyncHistoryEntry.
 */
function mapRowToEntry(row: Record<string, unknown>): SyncHistoryEntry {
  return {
    id: Number(row.id),
    status: row.status as SyncHistoryStatus,
    triggerType: row.trigger_type as SyncTriggerType,
    triggeredBy: toNullableNumber(row.triggered_by),
    startedAt: toIsoString(row.started_at, 'started_at'),
    completedAt: toNullableIsoString(row.completed_at, 'completed_at'),
    durationMs: toNullableNumber(row.duration_ms),
    itemsSynced: toNumber(row.items_synced, 0),
    itemsFailed: toNumber(row.items_failed, 0),
    errorMessage: (row.error_message as string) ?? null,
    errorDetails: toNullableJsonRecord(row.error_details),
    createdAt: toIsoString(row.created_at, 'created_at'),
  }
}

/**
 * Insert a new sync history entry with status='syncing'.
 * Returns the inserted row's `id`.
 */
export async function createSyncHistoryEntry(
  input: CreateSyncHistoryInput,
): Promise<number> {
  const { triggerType, triggeredBy = null } = input

  const result = await query(
    `INSERT INTO sync_history (status, trigger_type, triggered_by, started_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id`,
    ['syncing', triggerType, triggeredBy],
  )

  const id = result.rows[0].id as number
  logger.debug({ service: 'sync-history', historyId: id, triggerType }, 'Created sync history entry')
  return id
}

/**
 * Update a sync history entry upon completion (success, error, or partial).
 */
export async function completeSyncHistoryEntry(
  input: CompleteSyncHistoryInput,
): Promise<void> {
  const {
    id,
    status,
    completedAt,
    durationMs,
    itemsSynced = 0,
    itemsFailed = 0,
    errorMessage = null,
    errorDetails = null,
  } = input

  await query(
    `UPDATE sync_history
     SET status = $1,
         completed_at = $2,
         duration_ms = $3,
         items_synced = $4,
         items_failed = $5,
         error_message = $6,
         error_details = $7
     WHERE id = $8`,
    [status, completedAt, durationMs, itemsSynced, itemsFailed, errorMessage, errorDetails, id],
  )

  logger.debug({ service: 'sync-history', historyId: id, status }, 'Completed sync history entry')
}

/**
 * List sync history entries, newest-first.
 *
 * @param options.limit - Max rows to return (1–200, default 50)
 */
export async function listSyncHistory(
  options?: { limit?: number },
): Promise<SyncHistoryEntry[]> {
  const rawLimit = options?.limit ?? DEFAULT_LIMIT
  const limit = Math.max(1, Math.min(rawLimit, MAX_LIMIT))

  const result = await query(
    `SELECT id, status, trigger_type, triggered_by, started_at, completed_at,
            duration_ms, items_synced, items_failed, error_message, error_details, created_at
     FROM sync_history
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit],
  )

  return result.rows.map(mapRowToEntry)
}
