import type { Issue } from '@linear/sdk'

import type { BacklogItemDto } from '../../types/linear-entities.types.js'
import type { SyncStatusResponse } from '../../types/api.types.js'
import { linearClient } from './linear-client.service.js'
import { toBacklogItemDtos } from './linear-transformers.js'
import { sortBacklogItems } from '../backlog/backlog.service.js'
import { logger } from '../../utils/logger.js'
import { classifySyncError } from './sync-error-classifier.js'

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
  private syncStatus: SyncStatusResponse = {
    lastSyncedAt: null,
    status: 'idle',
    itemCount: null,
    errorMessage: null,
    errorCode: null,
  }

  /**
   * Execute a full sync: paginate through ALL Linear issues for the
   * configured project, transform to DTOs, sort, and store in cache.
   *
   * Idempotent — returns early if a sync is already in progress.
   * On failure, preserves the previous cache contents.
   */
  async runSync(): Promise<void> {
    if (this.syncStatus.status === 'syncing') {
      logger.warn({ service: 'sync' }, 'Sync already in progress, skipping')
      return
    }

    const startTime = Date.now()
    this.syncStatus = { ...this.syncStatus, status: 'syncing', errorMessage: null, errorCode: null }

    const projectId = process.env.LINEAR_PROJECT_ID
    if (!projectId) {
      const msg = 'LINEAR_PROJECT_ID not configured — cannot sync'
      logger.error({ service: 'sync' }, msg)
      this.syncStatus = { ...this.syncStatus, status: 'error', errorCode: 'SYNC_CONFIG_ERROR', errorMessage: msg }
      return
    }

    logger.info({ service: 'sync', projectId }, 'Sync started')

    try {
      // 1. Fetch ALL issues, paginating through the full dataset
      const allIssues = await this.fetchAllIssues(projectId)

      // 2. Transform SDK issues to DTOs
      const dtos = await toBacklogItemDtos(allIssues)

      // 3. Sort (reuse same logic as backlog.service.ts)
      const sorted = sortBacklogItems(dtos)

      // 4. Replace cache atomically
      this.cachedItems = sorted

      const durationMs = Date.now() - startTime
      this.syncStatus = {
        lastSyncedAt: new Date().toISOString(),
        status: 'success',
        itemCount: sorted.length,
        errorMessage: null,
        errorCode: null,
      }

      logger.info(
        { service: 'sync', itemCount: sorted.length, durationMs },
        'Sync completed successfully',
      )
    } catch (error) {
      const durationMs = Date.now() - startTime
      const classified = classifySyncError(error)

      // CRITICAL: Preserve previous cache on failure (stale data > no data)
      this.syncStatus = {
        ...this.syncStatus,
        status: 'error',
        errorCode: classified.code,
        errorMessage: classified.message,
      }

      logger.error(
        { service: 'sync', errorCode: classified.code, error, durationMs },
        'Sync failed',
      )
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
