import type { Issue } from '@linear/sdk'

import type { BacklogItemDto } from '../../types/linear-entities.types.js'
import type { SyncStatusResponse, SyncTriggerType } from '../../types/api.types.js'
import { linearClient } from './linear-client.service.js'
import { toBacklogItemDtosResilient } from './linear-transformers.js'
import type { TransformFailure } from './linear-transformers.js'
import { sortBacklogItems } from '../backlog/backlog.service.js'
import { logger } from '../../utils/logger.js'
import { classifySyncError, SYNC_ERROR_CODES } from './sync-error-classifier.js'
import { createSyncHistoryEntry, completeSyncHistoryEntry } from './sync-history.service.js'
import { backlogService } from '../backlog/backlog.service.js'

/**
 * Orchestrates scheduled sync of Linear issues into an in-memory cache.
 *
 * Fetches ALL issues for the configured project (paginating through the full
 * dataset), transforms them to DTOs, sorts, and stores in memory. The backlog
 * list API reads from this cache when populated, falling back to live fetch
 * when empty.
 *
 * Design decisions:
 * - In-memory cache (no database persistence) — sufficient for MVP
 * - Idempotent `runSync()` — guards against concurrent execution
 * - On failure, previous cache is preserved (stale data > no data)
 * - Status transitions: idle → syncing → success | error
 */
class SyncService {
  private cachedItems: BacklogItemDto[] = []
  /** Stores the most recent transform failures for admin visibility (volatile, lost on restart). */
  private lastTransformFailures: TransformFailure[] = []
  private static readonly MAX_FAILURE_DETAILS = 200
  private syncStatus: SyncStatusResponse = {
    lastSyncedAt: null,
    status: 'idle',
    itemCount: null,
    errorMessage: null,
    errorCode: null,
    itemsSynced: null,
    itemsFailed: null,
  }

  /**
   * Execute a full sync: paginate through ALL Linear issues for the
   * configured project, transform to DTOs, sort, and store in cache.
   *
   * Idempotent — returns early if a sync is already in progress.
   * On failure, preserves the previous cache contents.
   *
   * @param options.triggerType - How this sync was triggered (scheduled, manual, startup)
   * @param options.triggeredBy - User ID of the admin who triggered (for manual triggers)
   */
  async runSync(options?: { triggerType?: SyncTriggerType; triggeredBy?: number | null }): Promise<void> {
    if (this.syncStatus.status === 'syncing') {
      logger.warn({ service: 'sync' }, 'Sync already in progress, skipping')
      return
    }

    const startTime = Date.now()
    this.syncStatus = {
      ...this.syncStatus,
      status: 'syncing',
      errorMessage: null,
      errorCode: null,
      itemCount: null,
      itemsSynced: null,
      itemsFailed: null,
    }

    const triggerType = options?.triggerType ?? 'manual'
    const triggeredBy = options?.triggeredBy ?? null

    // Create sync history entry (fire-and-forget on failure — don't block sync)
    let historyId: number | null = null
    try {
      historyId = await createSyncHistoryEntry({ triggerType, triggeredBy })
    } catch (err) {
      logger.warn({ service: 'sync', err }, 'Failed to create sync history entry — continuing sync')
    }

    const projectId = process.env.LINEAR_PROJECT_ID
    if (!projectId) {
      const msg = 'LINEAR_PROJECT_ID not configured — cannot sync'
      logger.error({ service: 'sync' }, msg)
      this.syncStatus = { ...this.syncStatus, status: 'error', errorCode: 'SYNC_CONFIG_ERROR', errorMessage: msg, itemsSynced: null, itemsFailed: null }

      if (historyId !== null) {
        try {
          await completeSyncHistoryEntry({
            id: historyId,
            status: 'error',
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            errorMessage: msg,
            errorDetails: { errorCode: 'SYNC_CONFIG_ERROR' },
          })
        } catch (err) {
          logger.warn({ service: 'sync', err }, 'Failed to complete sync history entry')
        }
      }
      return
    }

    logger.info({ service: 'sync', projectId }, 'Sync started')

    try {
      // 1. Fetch ALL issues, paginating through the full dataset
      const allIssues = await this.fetchAllIssues(projectId)

      // 2. Transform SDK issues to DTOs (resilient — individual failures won't reject the batch)
      const { items: dtos, failures } = await toBacklogItemDtosResilient(allIssues)
      this.lastTransformFailures = failures.slice(0, SyncService.MAX_FAILURE_DETAILS)
      if (failures.length > this.lastTransformFailures.length) {
        logger.warn(
          {
            service: 'sync',
            itemsFailed: failures.length,
            storedFailureDetails: this.lastTransformFailures.length,
          },
          'Transform failures truncated for in-memory storage',
        )
      }

      const durationMs = Date.now() - startTime
      const completedAt = new Date().toISOString()

      // 3. ALL items failed → treat as error, preserve previous cache
      if (dtos.length === 0 && failures.length > 0) {
        this.syncStatus = {
          ...this.syncStatus,
          status: 'error',
          errorCode: SYNC_ERROR_CODES.TRANSFORM_FAILED,
          errorMessage: `All ${failures.length} item(s) failed to transform`,
          itemsSynced: 0,
          itemsFailed: failures.length,
        }

        logger.error(
          { service: 'sync', itemsFailed: failures.length, durationMs },
          'Sync failed — all items failed to transform',
        )

        // Persist error to sync_history
        if (historyId !== null) {
          try {
            await completeSyncHistoryEntry({
              id: historyId,
              status: 'error',
              completedAt,
              durationMs,
              itemsFailed: failures.length,
              errorMessage: `All ${failures.length} item(s) failed to transform`,
              errorDetails: { errorCode: SYNC_ERROR_CODES.TRANSFORM_FAILED },
            })
          } catch (err) {
            logger.warn({ service: 'sync', err }, 'Failed to complete sync history entry')
          }
        }
        return
      }

      // 4. Sort and replace cache (partial fresh data > fully stale data)
      const sorted = sortBacklogItems(dtos)
      this.cachedItems = sorted

      // Invalidate detail cache so stale detail data is not served
      backlogService.clearDetailCache()

      if (failures.length > 0) {
        // 5a. Partial success — some items succeeded, some failed
        this.syncStatus = {
          lastSyncedAt: completedAt,
          status: 'partial',
          itemCount: sorted.length,
          itemsSynced: sorted.length,
          itemsFailed: failures.length,
          errorCode: SYNC_ERROR_CODES.PARTIAL_SUCCESS,
          errorMessage: `${failures.length} item(s) failed to sync`,
        }

        logger.warn(
          { service: 'sync', itemsSynced: sorted.length, itemsFailed: failures.length, durationMs },
          'Sync completed with partial failures',
        )

        // Persist partial success to sync_history
        if (historyId !== null) {
          try {
            await completeSyncHistoryEntry({
              id: historyId,
              status: 'partial',
              completedAt,
              durationMs,
              itemsSynced: sorted.length,
              itemsFailed: failures.length,
              errorMessage: `${failures.length} item(s) failed to sync`,
            })
          } catch (err) {
            logger.warn({ service: 'sync', err }, 'Failed to complete sync history entry')
          }
        }
      } else {
        // 5b. Full success — all items succeeded
        this.syncStatus = {
          lastSyncedAt: completedAt,
          status: 'success',
          itemCount: sorted.length,
          errorMessage: null,
          errorCode: null,
          itemsSynced: sorted.length,
          itemsFailed: 0,
        }

        logger.info(
          { service: 'sync', itemCount: sorted.length, durationMs },
          'Sync completed successfully',
        )

        // Persist success to sync_history
        if (historyId !== null) {
          try {
            await completeSyncHistoryEntry({
              id: historyId,
              status: 'success',
              completedAt,
              durationMs,
              itemsSynced: sorted.length,
            })
          } catch (err) {
            logger.warn({ service: 'sync', err }, 'Failed to complete sync history entry')
          }
        }
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const classified = classifySyncError(error)

      // CRITICAL: Preserve previous cache on failure (stale data > no data)
      this.syncStatus = {
        ...this.syncStatus,
        status: 'error',
        errorCode: classified.code,
        errorMessage: classified.message,
        itemsSynced: null,
        itemsFailed: null,
      }

      logger.error(
        { service: 'sync', errorCode: classified.code, error, durationMs },
        'Sync failed',
      )

      // Persist error to sync_history
      if (historyId !== null) {
        try {
          await completeSyncHistoryEntry({
            id: historyId,
            status: 'error',
            completedAt: new Date().toISOString(),
            durationMs,
            errorMessage: classified.message,
            errorDetails: { errorCode: classified.code },
          })
        } catch (err) {
          logger.warn({ service: 'sync', err }, 'Failed to complete sync history entry')
        }
      }
    }
  }

  /**
   * Paginate through ALL issues in a Linear project.
   *
   * Fetches 50 items per page and follows `pageInfo.hasNextPage` /
   * `endCursor` until the full dataset is retrieved.
   *
   * The rate limiter handles throttling automatically — no manual delays.
   */
  private async fetchAllIssues(projectId: string): Promise<Issue[]> {
    const allIssues: Issue[] = []
    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      const result = await linearClient.getIssuesByProject(projectId, {
        first: 50,
        after: cursor,
      })
      allIssues.push(...result.data)
      hasMore = result.pageInfo?.hasNextPage ?? false
      cursor = result.pageInfo?.endCursor ?? undefined
    }

    return allIssues
  }

  /**
   * Return cached backlog items, or `null` if cache is empty.
   *
   * The backlog service checks this first; if `null`, it falls back
   * to live Linear fetch.
   */
  getCachedItems(): BacklogItemDto[] | null {
    return this.cachedItems.length > 0 ? this.cachedItems : null
  }

  /**
   * Return current sync status (last sync time, status, item count, errors).
   */
  getStatus(): SyncStatusResponse {
    return { ...this.syncStatus }
  }

  /**
   * Return the most recent transform failures, if any.
   *
   * Intended for admin visibility — allows the admin panel to display
   * which specific items failed during the last sync. Volatile (lost on restart).
   */
  getLastTransformFailures(): TransformFailure[] {
    return [...this.lastTransformFailures]
  }

  /**
   * Clear the in-memory cache. Used for testing and future manual
   * sync invalidation.
   */
  clearCache(): void {
    this.cachedItems = []
  }
}

/** Singleton instance for application-wide use. */
export const syncService = new SyncService()

/** Export the class for testing with fresh instances. */
export { SyncService }
