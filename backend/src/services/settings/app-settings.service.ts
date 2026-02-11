import { query } from '../../utils/database.js'
import { logger } from '../../utils/logger.js'

/**
 * Service for reading and writing application settings stored in the
 * `app_settings` database table.
 *
 * Settings are key-value pairs with an optional description.  This module
 * provides typed helpers for known setting keys and a generic get/set for
 * future extensibility.
 */

/* ------------------------------------------------------------------ */
/*  Known setting keys (type-safe constants)                           */
/* ------------------------------------------------------------------ */

export const SETTING_KEYS = {
  SYNC_CRON_SCHEDULE: 'sync_cron_schedule',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

/* ------------------------------------------------------------------ */
/*  Generic get / set                                                  */
/* ------------------------------------------------------------------ */

/**
 * Retrieve a setting value by key.
 *
 * Returns `null` when the key does not exist in the database.
 */
export async function getSetting(key: SettingKey): Promise<string | null> {
  try {
    const result = await query(
      'SELECT value FROM app_settings WHERE key = $1',
      [key],
    )
    return result.rows.length > 0 ? (result.rows[0].value as string) : null
  } catch (err) {
    logger.error({ err, key }, 'Failed to read app setting from database')
    return null
  }
}

/**
 * Upsert a setting value (insert or update on conflict).
 *
 * Updates `updated_at` automatically.
 */
export async function setSetting(
  key: SettingKey,
  value: string,
  description?: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO app_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             description = COALESCE(EXCLUDED.description, app_settings.description),
             updated_at = NOW()`,
      [key, value, description ?? null],
    )
    logger.info({ key, value }, 'App setting updated')
  } catch (err) {
    logger.error({ err, key }, 'Failed to write app setting to database')
    throw err
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience helpers for specific settings                          */
/* ------------------------------------------------------------------ */

/** Default schedule used when the DB row is missing or unreadable. */
const DEFAULT_SYNC_CRON_SCHEDULE = '*/15 * * * *'

/**
 * Get the sync cron schedule.
 *
 * Resolution order:
 * 1. Database `app_settings` table (`sync_cron_schedule` row)
 * 2. `SYNC_CRON_SCHEDULE` environment variable (legacy / override)
 * 3. Hard-coded default: every 15 minutes (`{@link DEFAULT_SYNC_CRON_SCHEDULE}`)
 */
export async function getSyncCronSchedule(): Promise<string> {
  const dbValue = await getSetting(SETTING_KEYS.SYNC_CRON_SCHEDULE)
  if (dbValue) return dbValue

  const envValue = process.env.SYNC_CRON_SCHEDULE?.trim()
  if (envValue) {
    logger.info(
      { service: 'app-settings', source: 'env', schedule: envValue },
      'Sync schedule not found in DB — falling back to SYNC_CRON_SCHEDULE env var',
    )
    return envValue
  }

  logger.info(
    { service: 'app-settings', source: 'default', schedule: DEFAULT_SYNC_CRON_SCHEDULE },
    'Sync schedule not found in DB or env — using hard-coded default',
  )
  return DEFAULT_SYNC_CRON_SCHEDULE
}

/**
 * Update the sync cron schedule in the database.
 */
export async function setSyncCronSchedule(cronExpression: string): Promise<void> {
  await setSetting(
    SETTING_KEYS.SYNC_CRON_SCHEDULE,
    cronExpression,
    'Cron expression controlling how often the Linear sync runs.',
  )
}
