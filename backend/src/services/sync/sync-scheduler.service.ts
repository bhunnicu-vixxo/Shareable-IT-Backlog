import cron from 'node-cron'

import { syncService } from './sync.service.js'
import { logger } from '../../utils/logger.js'

/** Default cron schedule: 6 AM and 12 PM daily. */
const DEFAULT_CRON_SCHEDULE = '0 6,12 * * *'

function isEnvFalse(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off'
}

/**
 * Manages the cron-based scheduling of automatic sync operations.
 *
 * Reads configuration from environment variables:
 * - `SYNC_ENABLED` — set to `"false"` to disable entirely (default: `true`)
 * - `SYNC_CRON_SCHEDULE` — cron expression (default: `0 6,12 * * *`)
 *
 * On `start()`, validates the cron expression, creates the scheduled task,
 * and fires an immediate initial sync so the cache is populated without
 * waiting for the first cron tick.
 */
class SyncSchedulerService {
  private task: cron.ScheduledTask | null = null

  /**
   * Start the sync scheduler.
   *
   * Creates a cron task and fires an initial sync immediately.
   * No-ops (with a log) if `SYNC_ENABLED` is `"false"` or the cron
   * expression is invalid.
   */
  start(): void {
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

    const schedule = process.env.SYNC_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE

    if (!cron.validate(schedule)) {
      logger.error(
        { service: 'sync-scheduler', schedule },
        'Invalid SYNC_CRON_SCHEDULE — scheduler not started',
      )
      return
    }

    this.task = cron.schedule(schedule, async () => {
      logger.info({ service: 'sync-scheduler' }, 'Scheduled sync triggered')
      await syncService.runSync({ triggerType: 'scheduled', triggeredBy: null })
    })

    logger.info(
      { service: 'sync-scheduler', schedule },
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
      logger.info({ service: 'sync-scheduler' }, 'Sync scheduler stopped')
    }
  }

  /**
   * Whether the scheduler is currently active.
   */
  isRunning(): boolean {
    return this.task !== null
  }
}

/** Singleton instance for application-wide use. */
export const syncScheduler = new SyncSchedulerService()

/** Export class for testing with fresh instances. */
export { SyncSchedulerService }
