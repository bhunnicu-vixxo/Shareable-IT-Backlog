import cron from 'node-cron'

import { syncService } from './sync.service.js'
import { getSyncCronSchedule } from '../settings/app-settings.service.js'
import { logger } from '../../utils/logger.js'

/** Hard-coded fallback used only when both DB and env are unavailable. */
const FALLBACK_CRON_SCHEDULE = '*/15 * * * *'

function isEnvFalse(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off'
}

/**
 * Manages the cron-based scheduling of automatic sync operations.
 *
 * Reads configuration from:
 * 1. `app_settings` database table (`sync_cron_schedule` key)
 * 2. `SYNC_CRON_SCHEDULE` environment variable (legacy fallback)
 * 3. Hard-coded default: every 15 minutes
 *
 * `SYNC_ENABLED` env var can still disable scheduling entirely.
 *
 * On `start()`, validates the cron expression, creates the scheduled task,
 * and fires an immediate initial sync so the cache is populated without
 * waiting for the first cron tick.
 */
class SyncSchedulerService {
  private task: cron.ScheduledTask | null = null
  private currentSchedule: string | null = null

  /**
   * Start the sync scheduler.
   *
   * Reads the cron schedule from the database (falling back to env / default),
   * creates a cron task, and fires an initial sync immediately.
   *
   * No-ops (with a log) if `SYNC_ENABLED` is `"false"` or the cron
   * expression is invalid.
   */
  async start(): Promise<void> {
    if (isEnvFalse(process.env.SYNC_ENABLED)) {
      // If we were already running, ensure we stop.
      this.stop()
      logger.info(
        { service: 'sync-scheduler' },
        'Sync scheduler disabled via SYNC_ENABLED=false',
      )
      return
    }

    if (this.task) {
      logger.warn(
        { service: 'sync-scheduler' },
        'Sync scheduler already running; start() is a no-op',
      )
      return
    }

    let schedule: string
    try {
      schedule = await getSyncCronSchedule()
    } catch {
      logger.warn(
        { service: 'sync-scheduler', schedule: FALLBACK_CRON_SCHEDULE },
        'Failed to read sync schedule from database — using fallback',
      )
      schedule = FALLBACK_CRON_SCHEDULE
    }

    if (!cron.validate(schedule)) {
      logger.error(
        { service: 'sync-scheduler', schedule },
        'Invalid sync cron schedule — scheduler not started',
      )
      return
    }

    this.currentSchedule = schedule
    this.task = cron.schedule(schedule, async () => {
      logger.info({ service: 'sync-scheduler' }, 'Scheduled sync triggered')
      await syncService.runSync({ triggerType: 'scheduled', triggeredBy: null })
    })

    logger.info(
      { service: 'sync-scheduler', schedule, source: 'database' },
      'Sync scheduler started',
    )

    // Run initial sync on startup so cache is populated immediately.
    // Fire-and-forget — doesn't block server startup.
    syncService.runSync({ triggerType: 'startup', triggeredBy: null }).catch((error) => {
      logger.error(
        { service: 'sync-scheduler', error },
        'Initial sync failed',
      )
    })
  }

  /**
   * Stop the scheduler and destroy the cron task.
   */
  stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
      this.currentSchedule = null
      logger.info({ service: 'sync-scheduler' }, 'Sync scheduler stopped')
    }
  }

  /**
   * Restart the scheduler with the latest schedule from the database.
   *
   * Useful after an admin updates the cron schedule via the API — call
   * `restart()` to pick up the new value without a server restart.
   */
  async restart(): Promise<void> {
    this.stop()
    await this.start()
  }

  /**
   * Whether the scheduler is currently active.
   */
  isRunning(): boolean {
    return this.task !== null
  }

  /**
   * The cron expression the scheduler is currently using, or null if stopped.
   */
  getSchedule(): string | null {
    return this.currentSchedule
  }
}

/** Singleton instance for application-wide use. */
export const syncScheduler = new SyncSchedulerService()

/** Export class for testing with fresh instances. */
export { SyncSchedulerService }
