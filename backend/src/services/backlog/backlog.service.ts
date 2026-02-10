import type { BacklogItemDto, CommentDto, IssueActivityDto } from '../../types/linear-entities.types.js'
import type { PaginatedResponse } from '../../types/api.types.js'
import { linearClient } from '../sync/linear-client.service.js'
import {
  toBacklogItemDto,
  toBacklogItemDtos,
  toCommentDtos,
  toIssueActivityDtos,
} from '../sync/linear-transformers.js'
import { LinearConfigError } from '../../utils/linear-errors.js'
import { logger } from '../../utils/logger.js'

export interface GetBacklogItemsOptions {
  /** Override the default project ID from env. */
  projectId?: string
  /** Maximum number of items to return (Linear default: 50). */
  first?: number
  /** Cursor for pagination (from previous response's endCursor). */
  after?: string
}

/**
 * Sort backlog items by priority ascending, with priority 0 (None) last.
 * Within the same priority level, items are sorted by sortOrder ascending.
 *
 * Returns a new array — does NOT mutate the input.
 */
function sortBacklogItems(items: BacklogItemDto[]): BacklogItemDto[] {
  return [...items].sort((a, b) => {
    const aPriority = a.priority === 0 ? 5 : a.priority // Push "None" after "Low"
    const bPriority = b.priority === 0 ? 5 : b.priority
    if (aPriority !== bPriority) return aPriority - bPriority
    return a.sortOrder - b.sortOrder
  })
}

/**
 * Service responsible for fetching and preparing backlog items for the API.
 *
 * Composes `LinearClientService` (data fetching) with `toBacklogItemDtos`
 * (SDK-to-DTO transformation) and applies business sorting rules.
 */
export class BacklogService {
  /**
   * Fetch backlog items from Linear, transform to DTOs, sort, and return
   * as a `PaginatedResponse<BacklogItemDto>`.
   */
  async getBacklogItems(
    options?: GetBacklogItemsOptions,
  ): Promise<PaginatedResponse<BacklogItemDto>> {
    const projectId = options?.projectId ?? process.env.LINEAR_PROJECT_ID

    if (!projectId) {
      throw new LinearConfigError(
        'LINEAR_PROJECT_ID environment variable is not configured. ' +
          'Set it in your .env file or pass projectId as a query parameter.',
      )
    }

    logger.debug(
      { service: 'backlog', operation: 'getBacklogItems', projectId },
      'Fetching backlog items from Linear',
    )

    // 1. Fetch raw issues from Linear via the GraphQL client
    //    Limit default to 20 to reduce lazy-loading overhead (each issue
    //    resolves ~5 SDK relations → additional API calls).
    const result = await linearClient.getIssuesByProject(projectId, {
      first: options?.first ?? 20,
      after: options?.after,
    })

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
    }
  }

  /**
   * Fetch a single backlog item by ID with its comments and activity history.
   *
   * Returns null when the issue does not exist (Linear returns null for non-existent issues).
   * Comments and history degrade gracefully — if either fetch fails, the detail
   * view still works with empty arrays rather than an error.
   */
  async getBacklogItemById(
    issueId: string,
  ): Promise<{ item: BacklogItemDto; comments: CommentDto[]; activities: IssueActivityDto[] } | null> {
    // Fetch issue, comments, and history in parallel using Promise.allSettled
    // so that failures in comments or history don't break the detail view
    const [issueResult, commentsResult, historyResult] = await Promise.allSettled([
      linearClient.getIssueById(issueId),
      linearClient.getIssueComments(issueId),
      linearClient.getIssueHistory(issueId),
    ])

    // Issue is required:
    // - If Linear returns `null` (not found) → return null (404)
    // - If the fetch fails (network/auth/etc.) → throw so controller returns 5xx (not a fake 404)
    if (issueResult.status === 'rejected') {
      logger.error(
        { service: 'backlog', operation: 'getBacklogItemById', issueId, error: issueResult.reason },
        'Failed to fetch issue',
      )
      throw issueResult.reason
    }
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

    return { item, comments, activities }
  }
}

/** Singleton instance for application-wide use. */
export const backlogService = new BacklogService()
