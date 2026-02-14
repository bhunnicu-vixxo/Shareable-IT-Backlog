import type { BacklogItemDto, CommentDto, IssueActivityDto } from '../../types/linear-entities.types.js'
import type { PaginatedResponse } from '../../types/api.types.js'
import { linearClient } from '../sync/linear-client.service.js'
import { syncService } from '../sync/sync.service.js'
import {
  toBacklogItemDto,
  toBacklogItemDtos,
  toCommentDtos,
  toIssueActivityDtos,
} from '../sync/linear-transformers.js'
import { LinearConfigError } from '../../utils/linear-errors.js'
import { logger } from '../../utils/logger.js'
import { TtlCache } from '../../utils/ttl-cache.js'

export interface GetBacklogItemsOptions {
  /** Override the default project ID from env. */
  projectId?: string
  /** Maximum number of items to return (Linear default: 50). */
  first?: number
  /** Cursor for pagination (from previous response's endCursor). */
  after?: string
}

/** Extended paginated response that indicates whether data came from the sync cache. */
export interface BacklogListResult extends PaginatedResponse<BacklogItemDto> {
  /** Set to true when data was served from the in-memory sync cache. */
  _servedFromCache?: boolean
  /** ISO 8601 timestamp of the last successful sync, or null if never synced. */
  lastSyncedAt?: string | null
}

/** Detail response type including item, comments, and activities. */
export type DetailResult = { item: BacklogItemDto; comments: CommentDto[]; activities: IssueActivityDto[] }

/**
 * Sort backlog items by priority ascending, with priority 0 (None) last.
 * Within the same priority level, items are sorted by prioritySortOrder ascending
 * (Linear's drag-and-drop ordering in the priority view).
 *
 * Returns a new array — does NOT mutate the input.
 */
export function sortBacklogItems(items: BacklogItemDto[]): BacklogItemDto[] {
  return [...items].sort((a, b) => {
    const aPriority = a.priority === 0 ? 5 : a.priority // Push "None" after "Low"
    const bPriority = b.priority === 0 ? 5 : b.priority
    if (aPriority !== bPriority) return aPriority - bPriority
    return a.prioritySortOrder - b.prioritySortOrder
  })
}

/**
 * Service responsible for fetching and preparing backlog items for the API.
 *
 * Composes `LinearClientService` (data fetching) with `toBacklogItemDtos`
 * (SDK-to-DTO transformation) and applies business sorting rules.
 */
export class BacklogService {
  /** Short-lived in-memory cache for detail responses (30 second TTL). */
  private detailCache = new TtlCache<DetailResult>(30_000)

  /**
   * Fetch backlog items, preferring the sync cache when populated.
   *
   * Cache-first strategy:
   * - If the sync cache is populated, apply in-memory pagination and return.
   * - If the cache is empty, start a background sync to populate it, but
   *   serve the request from live Linear data to avoid blocking the API.
   * - If a `projectId` override is provided (different from configured project),
   *   the cache is skipped and the service falls back to live Linear API fetch.
   *
   * The `after` cursor for cached data is the ID of the last item in the
   * previous page. This matches the cursor-based pagination pattern the
   * frontend already uses.
   */
  async getBacklogItems(
    options?: GetBacklogItemsOptions,
  ): Promise<BacklogListResult> {
    const configuredProjectId = process.env.LINEAR_PROJECT_ID
    const projectId = options?.projectId ?? configuredProjectId
    const first = options?.first ?? 50

    if (!projectId) {
      throw new LinearConfigError(
        'LINEAR_PROJECT_ID environment variable is not configured. ' +
          'Set it in your .env file or pass projectId as a query parameter.',
      )
    }

    // Cache can only be used for the configured project ID.
    const canUseCache = !options?.projectId || options.projectId === configuredProjectId

    if (canUseCache) {
      // Try cache first (populated by sync scheduler)
      const cached = syncService.getCachedItems()

      if (cached) {
        const afterIndex = options?.after
          ? cached.findIndex((item) => item.id === options.after) + 1
          : 0
        const startIndex = Math.max(0, afterIndex)
        const page = cached.slice(startIndex, startIndex + first)
        const hasNextPage = startIndex + first < cached.length
        const endCursor = page.length > 0 ? page[page.length - 1].id : null

        logger.debug(
          { service: 'backlog', source: 'cache', itemCount: page.length },
          'Serving backlog items from sync cache',
        )

        return {
          items: page,
          pageInfo: { hasNextPage, endCursor },
          totalCount: cached.length,
          _servedFromCache: true,
          lastSyncedAt: syncService.getStatus().lastSyncedAt,
        }
      }

      // Cache miss: start a background sync so future requests can serve from a
      // stable, globally-sorted cache, but do not block this request.
      logger.info(
        { service: 'backlog', operation: 'getBacklogItems' },
        'Sync cache empty — starting background sync and serving live data',
      )
      syncService.runSync().catch((error) => {
        logger.error(
          { service: 'backlog', operation: 'getBacklogItems', error },
          'Background sync failed while serving live data',
        )
      })
    }

    logger.debug(
      { service: 'backlog', source: 'live', projectId },
      'Fetching backlog items live from Linear',
    )

    // 1. Fetch raw issues from Linear via the GraphQL client.
    //    Note: When bypassing cache (projectId override), we retain cursor-based
    //    pagination from Linear. Sorting is applied after transformation.
    let result: Awaited<ReturnType<typeof linearClient.getIssuesByProject>>
    try {
      result = await linearClient.getIssuesByProject(projectId, {
        first,
        after: options?.after,
      })
    } catch (error) {
      if (canUseCache) {
        // Graceful degradation: cache was empty and live Linear fetch failed.
        // Return an empty paginated response instead of a 500 error.
        logger.warn(
          { service: 'backlog', operation: 'getBacklogItems', source: 'degraded-empty', error },
          'Live Linear fetch failed and sync cache is empty — returning empty result',
        )
        return {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
          totalCount: 0,
          _servedFromCache: false,
          lastSyncedAt: syncService.getStatus().lastSyncedAt,
        }
      }
      // Cache bypass path (different projectId): propagate the error
      throw error
    }

    // 2. Transform SDK Issue instances to flat, JSON-safe DTOs
    const dtos = await toBacklogItemDtos(result.data)

    // 3. Sort: priority ascending (1=Urgent first), then sortOrder, with None (0) last
    const sorted = sortBacklogItems(dtos)

    logger.debug(
      { service: 'backlog', operation: 'getBacklogItems', itemCount: sorted.length },
      'Backlog items fetched and sorted',
    )

    // 4. Return paginated response with pageInfo from Linear connection
    return {
      items: sorted,
      pageInfo: result.pageInfo ?? {
        hasNextPage: false,
        endCursor: null,
      },
      totalCount: sorted.length,
      _servedFromCache: false,
      lastSyncedAt: syncService.getStatus().lastSyncedAt,
    }
  }

  /**
   * Fetch a single backlog item by ID with its comments and activity history.
   *
   * Uses a short-lived in-memory cache (30 second TTL) to avoid redundant
   * Linear API calls for recently-fetched items.
   *
   * Returns null when the issue does not exist (Linear returns null for non-existent issues).
   * Comments and history degrade gracefully — if either fetch fails, the detail
   * view still works with empty arrays rather than an error.
   *
   * Does NOT cache 404 responses — item-not-found always re-checks.
   */
  async getBacklogItemById(
    issueId: string,
  ): Promise<DetailResult | null> {
    // Check detail cache first
    const cachedDetail = this.detailCache.get(issueId)
    if (cachedDetail) {
      logger.debug(
        { service: 'backlog', operation: 'getBacklogItemById', issueId, source: 'detail-cache' },
        'Serving item detail from in-memory cache',
      )
      return cachedDetail
    }

    // Fetch issue, comments, and history in parallel using Promise.allSettled
    // so that failures in comments or history don't break the detail view
    const [issueResult, commentsResult, historyResult] = await Promise.allSettled([
      linearClient.getIssueById(issueId),
      linearClient.getIssueComments(issueId),
      linearClient.getIssueHistory(issueId),
    ])

    // Issue is required:
    // - If Linear returns `null` (not found) → return null (404)
    // - If the fetch fails (network/auth/etc.) → try sync cache before giving up
    if (issueResult.status === 'rejected') {
      // Try sync cache before giving up
      const cachedItems = syncService.getCachedItems()
      const cachedItem = cachedItems?.find((item) => item.id === issueId) ?? null

      if (cachedItem) {
        logger.info(
          { service: 'backlog', operation: 'getBacklogItemById', issueId, source: 'cache-fallback' },
          'Live fetch failed — serving item from sync cache (no comments/activities)',
        )
        const fallbackResult: DetailResult = { item: cachedItem, comments: [], activities: [] }
        // Cache fallback result too
        this.detailCache.set(issueId, fallbackResult)
        return fallbackResult
      }

      // Not in cache either — throw original error
      logger.error(
        { service: 'backlog', operation: 'getBacklogItemById', issueId, error: issueResult.reason },
        'Failed to fetch issue and item not in sync cache',
      )
      throw issueResult.reason
    }
    // Do NOT cache 404 responses
    if (!issueResult.value.data) return null

    const item = await toBacklogItemDto(issueResult.value.data)

    // Comments degrade gracefully
    const comments = commentsResult.status === 'fulfilled'
      ? await toCommentDtos(commentsResult.value.data ?? [])
      : []

    if (commentsResult.status === 'rejected') {
      logger.warn(
        { service: 'backlog', operation: 'getBacklogItemById', issueId, error: commentsResult.reason },
        'Failed to fetch issue comments',
      )
    }

    // Activities degrade gracefully
    const activities = historyResult.status === 'fulfilled'
      ? await toIssueActivityDtos(historyResult.value.data ?? [])
      : []

    if (historyResult.status === 'rejected') {
      logger.warn(
        { service: 'backlog', operation: 'getBacklogItemById', issueId, error: historyResult.reason },
        'Failed to fetch issue history',
      )
    }

    logger.debug(
      {
        service: 'backlog',
        operation: 'getBacklogItemById',
        issueId,
        commentCount: comments.length,
        activityCount: activities.length,
      },
      'Backlog item detail fetched',
    )

    const detailResult: DetailResult = { item, comments, activities }

    // Cache successful result with default TTL (30s)
    this.detailCache.set(issueId, detailResult)

    return detailResult
  }

  /**
   * Clear the detail cache. Called by sync service after a successful sync
   * to ensure stale detail data is evicted.
   */
  clearDetailCache(): void {
    this.detailCache.clear()
  }
}

/** Singleton instance for application-wide use. */
export const backlogService = new BacklogService()
