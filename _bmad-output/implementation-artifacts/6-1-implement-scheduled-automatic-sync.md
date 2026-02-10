# Story 6.1: Implement Scheduled Automatic Sync

Linear Issue ID: VIX-354
Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want to automatically sync Linear data on a schedule,
so that data stays current without manual intervention.

## Acceptance Criteria

1. **Given** automatic sync is configured, **When** the scheduled time arrives (1-2x daily, cron-configurable), **Then** sync process executes automatically
2. **And** Linear API is queried for ALL issues in the configured project (paginating through the full dataset)
3. **And** fetched issues are transformed to `BacklogItemDto[]` and cached in-memory, replacing the previous cache
4. **And** the backlog list API (`GET /api/backlog-items`) serves from cache when populated, falling back to live Linear fetch when cache is empty
5. **And** item detail API (`GET /api/backlog-items/:id`) continues to fetch live from Linear (fresh comments/activities)
6. **And** sync status is tracked: `lastSyncedAt`, `status` (idle/syncing/success/error), `itemCount`, `errorMessage`
7. **And** sync status is exposed via `GET /api/sync/status` returning `SyncStatusResponse`
8. **And** sync operations are logged via Pino at appropriate levels (info for start/complete, error for failures)
9. **And** sync schedule is configurable via `SYNC_CRON_SCHEDULE` env var (default: twice daily at 6 AM and 12 PM)
10. **And** sync can be disabled via `SYNC_ENABLED=false` env var (default: true)
11. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
12. **And** unit tests cover sync service, scheduler, controller, routes, and updated backlog service

## Tasks / Subtasks

- [ ] Task 1: Install `node-cron` dependency (AC: #1)
  - [ ] 1.1: Run `npm install node-cron` in `backend/` (v4.2.1+, has built-in TypeScript declarations)
  - [ ] 1.2: Verify `node-cron` appears in `backend/package.json` dependencies

- [ ] Task 2: Add sync environment variables (AC: #9, #10)
  - [ ] 2.1: Add `SYNC_CRON_SCHEDULE` and `SYNC_ENABLED` to `backend/.env.example` with comments
  - [ ] 2.2: Add same vars to root `.env.example` under the BACKEND section
  - [ ] 2.3: Document default values in comments: `SYNC_CRON_SCHEDULE=0 6,12 * * *` and `SYNC_ENABLED=true`

- [ ] Task 3: Create `SyncService` — sync orchestration (AC: #2, #3, #6, #8)
  - [ ] 3.1: Create `backend/src/services/sync/sync.service.ts`
  - [ ] 3.2: Implement `runSync()`: paginate through ALL issues via `linearClient.getIssuesByProject()`, transform with `toBacklogItemDtos()`, sort, store in `cachedItems`
  - [ ] 3.3: Implement pagination loop: fetch 50 items per page, follow `pageInfo.hasNextPage` / `endCursor` until all fetched
  - [ ] 3.4: Track sync status transitions: idle → syncing → success|error
  - [ ] 3.5: Implement `getCachedItems()`: returns cached `BacklogItemDto[]` or `null` if cache is empty
  - [ ] 3.6: Implement `getStatus()`: returns `SyncStatusResponse`
  - [ ] 3.7: Implement `clearCache()`: clears cached items (for testing and future manual sync invalidation)
  - [ ] 3.8: Log sync start, completion (with item count and duration), and errors
  - [ ] 3.9: Handle errors gracefully — a failed sync preserves the previous cache (don't wipe stale-but-valid data)
  - [ ] 3.10: Export singleton `syncService`
  - [ ] 3.11: Create `backend/src/services/sync/sync.service.test.ts` with tests for: successful sync, pagination, error handling, status transitions, cache preservation on failure, sort order

- [ ] Task 4: Create `SyncSchedulerService` — cron scheduling (AC: #1, #9, #10)
  - [ ] 4.1: Create `backend/src/services/sync/sync-scheduler.service.ts`
  - [ ] 4.2: Implement `start()`: validates cron expression, creates `node-cron` task, optionally runs initial sync
  - [ ] 4.3: Implement `stop()`: destroys cron task
  - [ ] 4.4: Implement `isRunning()`: returns boolean
  - [ ] 4.5: Read `SYNC_CRON_SCHEDULE` from env (default: `0 6,12 * * *` — 6 AM and 12 PM daily)
  - [ ] 4.6: Read `SYNC_ENABLED` from env (default: `true`); skip scheduling entirely if `false`
  - [ ] 4.7: Log schedule configuration on start, each cron tick, and on stop
  - [ ] 4.8: Export singleton `syncScheduler`
  - [ ] 4.9: Create `backend/src/services/sync/sync-scheduler.service.test.ts` with tests for: start/stop lifecycle, cron validation, disabled mode, sync invocation

- [ ] Task 5: Create sync controller and routes (AC: #7)
  - [ ] 5.1: Create `backend/src/controllers/sync.controller.ts` with `getSyncStatus` handler
  - [ ] 5.2: Create `backend/src/routes/sync.routes.ts` with `GET /sync/status` route
  - [ ] 5.3: Register sync routes in `backend/src/routes/index.ts`
  - [ ] 5.4: Create `backend/src/routes/sync.routes.test.ts` with tests for status endpoint
  - [ ] 5.5: Create `backend/src/controllers/sync.controller.test.ts` (optional, route tests may suffice)

- [ ] Task 6: Update `BacklogService` to use sync cache (AC: #4, #5)
  - [ ] 6.1: In `getBacklogItems()`, check `syncService.getCachedItems()` first
  - [ ] 6.2: If cache hit: apply in-memory pagination (`first`/`after` params) on cached array, return `PaginatedResponse`
  - [ ] 6.3: If cache miss: fall back to existing live-fetch behavior (unchanged)
  - [ ] 6.4: `getBacklogItemById()` stays unchanged — always fetches live for fresh comments/activities
  - [ ] 6.5: Update `backend/src/services/backlog/backlog.service.test.ts` with cache hit/miss tests

- [ ] Task 7: Initialize scheduler on server start (AC: #1)
  - [ ] 7.1: Update `backend/src/server.ts` to import and call `syncScheduler.start()` after server starts listening
  - [ ] 7.2: Log scheduler initialization status

- [ ] Task 8: Build and test verification (AC: #11, #12)
  - [ ] 8.1: Run `npm run build` in `backend/`
  - [ ] 8.2: Run `npm run test:run` in `backend/`
  - [ ] 8.3: Run `npm run build` in `frontend/` (should be unaffected)
  - [ ] 8.4: Run `npm run test:run` in `frontend/` (should be unaffected)

## Dev Notes

### What's Already Done (from Stories 1.x–5.2)

| Capability | Story | File |
|---|---|---|
| LinearClientService (singleton) | 2.1 | `backend/src/services/sync/linear-client.service.ts` |
| `getIssuesByProject(projectId, { first, after })` | 2.1 | `backend/src/services/sync/linear-client.service.ts` |
| `getIssueById(issueId)` | 2.1 | `backend/src/services/sync/linear-client.service.ts` |
| `getIssueComments(issueId)` | 2.1 | `backend/src/services/sync/linear-client.service.ts` |
| `getIssueHistory(issueId)` | 5.1 | `backend/src/services/sync/linear-client.service.ts` |
| Rate limiter (leaky bucket, pre-flight throttle) | 2.2 | `backend/src/services/sync/rate-limiter.ts` |
| Retry handler (exponential backoff + jitter) | 2.3 | `backend/src/services/sync/retry-handler.ts` |
| `toBacklogItemDtos()` transformer | 2.4 | `backend/src/services/sync/linear-transformers.ts` |
| `BacklogService.getBacklogItems()` (live fetch) | 3.1 | `backend/src/services/backlog/backlog.service.ts` |
| `BacklogService.getBacklogItemById()` (live fetch) | 5.1 | `backend/src/services/backlog/backlog.service.ts` |
| `SyncStatusResponse` type (defined, not implemented) | 2.4 | `backend/src/types/api.types.ts` |
| `SyncStatus` type (frontend, not implemented) | 3.1 | `frontend/src/features/backlog/types/backlog.types.ts` |
| Linear error types (LinearApiError, LinearNetworkError, LinearConfigError) | 2.3 | `backend/src/utils/linear-errors.ts` |
| Pino logger singleton | 1.2 | `backend/src/utils/logger.ts` |
| `sortBacklogItems()` helper | 3.1 | `backend/src/services/backlog/backlog.service.ts` |
| Express routes infrastructure (routes → controllers → services) | 1.2 | `backend/src/routes/index.ts` |
| Health route pattern | 1.2 | `backend/src/routes/health.routes.ts` |

### What This Story Creates

1. **`node-cron`** dependency in `backend/package.json`
2. **`sync.service.ts`** — Sync orchestration: fetches ALL Linear issues, transforms, caches in-memory, tracks status
3. **`sync-scheduler.service.ts`** — Cron wrapper: starts/stops scheduled sync, configurable via env
4. **`sync.controller.ts`** — HTTP handler for sync status
5. **`sync.routes.ts`** — `GET /api/sync/status` endpoint
6. **Updated `backlog.service.ts`** — Reads from sync cache for list view; falls back to live fetch
7. **Updated `server.ts`** — Starts scheduler after server listen
8. **Updated `.env.example`** files — New sync configuration variables

### CRITICAL: Data Flow Change

**Before this story (live fetch on every request):**
```
Frontend → GET /api/backlog-items → BacklogService → linearClient.getIssuesByProject() → Linear API → transform → response
```

**After this story (cache-first with scheduled sync):**
```
Scheduler (cron) → SyncService.runSync() → linearClient.getIssuesByProject() (ALL pages) → transform → in-memory cache

Frontend → GET /api/backlog-items → BacklogService → syncService.getCachedItems() → response (fast, no API call)
  └─ (if cache empty) → fall back to live fetch (existing behavior)

Frontend → GET /api/backlog-items/:id → BacklogService → linearClient.getIssueById() → Linear API (always live, fresh comments/activities)
```

### CRITICAL: Pagination Through All Issues

The `linearClient.getIssuesByProject()` returns paginated results (default 50 per page). The sync MUST paginate through ALL pages to build a complete cache.

```typescript
async function fetchAllIssues(projectId: string): Promise<Issue[]> {
  const allIssues: Issue[] = []
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const result = await linearClient.getIssuesByProject(projectId, {
      first: 50,  // Max reasonable batch size
      after: cursor,
    })
    allIssues.push(...result.data)
    hasMore = result.pageInfo?.hasNextPage ?? false
    cursor = result.pageInfo?.endCursor ?? undefined
  }

  return allIssues
}
```

**CRITICAL:** Each `getIssuesByProject` call resolves ~5 async SDK relations per issue (team, project, assignee, state, labels). The rate limiter (`rate-limiter.ts`) handles throttling automatically — do NOT add manual delays. The retry handler covers transient failures.

### CRITICAL: SyncService Implementation Pattern

Follow the existing singleton pattern used by `linearClient` and `backlogService`:

```typescript
// backend/src/services/sync/sync.service.ts
import type { BacklogItemDto } from '../../types/linear-entities.types.js'
import type { SyncStatusResponse } from '../../types/api.types.js'
import { linearClient } from './linear-client.service.js'
import { toBacklogItemDtos } from './linear-transformers.js'
import { logger } from '../../utils/logger.js'

class SyncService {
  private cachedItems: BacklogItemDto[] = []
  private syncStatus: SyncStatusResponse = {
    lastSyncedAt: null,
    status: 'idle',
    itemCount: null,
    errorMessage: null,
  }

  async runSync(): Promise<void> {
    if (this.syncStatus.status === 'syncing') {
      logger.warn({ service: 'sync' }, 'Sync already in progress, skipping')
      return
    }

    const startTime = Date.now()
    this.syncStatus = { ...this.syncStatus, status: 'syncing', errorMessage: null }

    const projectId = process.env.LINEAR_PROJECT_ID
    if (!projectId) {
      const msg = 'LINEAR_PROJECT_ID not configured — cannot sync'
      logger.error({ service: 'sync' }, msg)
      this.syncStatus = { ...this.syncStatus, status: 'error', errorMessage: msg }
      return
    }

    logger.info({ service: 'sync', projectId }, 'Sync started')

    try {
      // 1. Fetch ALL issues, paginating through the full dataset
      const allIssues = await this.fetchAllIssues(projectId)

      // 2. Transform SDK issues to DTOs
      const dtos = await toBacklogItemDtos(allIssues)

      // 3. Sort (reuse same logic as backlog.service.ts)
      const sorted = this.sortItems(dtos)

      // 4. Replace cache atomically
      this.cachedItems = sorted

      const durationMs = Date.now() - startTime
      this.syncStatus = {
        lastSyncedAt: new Date().toISOString(),
        status: 'success',
        itemCount: sorted.length,
        errorMessage: null,
      }

      logger.info(
        { service: 'sync', itemCount: sorted.length, durationMs },
        'Sync completed successfully',
      )
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'

      // CRITICAL: Preserve previous cache on failure (stale data > no data)
      this.syncStatus = {
        ...this.syncStatus,
        status: 'error',
        errorMessage,
      }

      logger.error(
        { service: 'sync', error, durationMs },
        'Sync failed',
      )
    }
  }

  // ... fetchAllIssues, getCachedItems, getStatus, clearCache, sortItems
}

export const syncService = new SyncService()
```

**CRITICAL patterns:**
- `runSync()` is idempotent — guards against concurrent runs with `status === 'syncing'`
- On failure, previous cache is preserved (stale data is better than no data)
- Status transitions: `idle → syncing → success|error`
- Sort uses same logic as existing `sortBacklogItems()` in `backlog.service.ts` — extract to shared utility or duplicate

### CRITICAL: SyncSchedulerService Pattern

```typescript
// backend/src/services/sync/sync-scheduler.service.ts
import cron from 'node-cron'
import { syncService } from './sync.service.js'
import { logger } from '../../utils/logger.js'

const DEFAULT_CRON_SCHEDULE = '0 6,12 * * *'  // 6 AM and 12 PM daily

class SyncSchedulerService {
  private task: cron.ScheduledTask | null = null

  start(): void {
    const enabled = process.env.SYNC_ENABLED !== 'false'  // Default true
    if (!enabled) {
      logger.info({ service: 'sync-scheduler' }, 'Sync scheduler disabled via SYNC_ENABLED=false')
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
      await syncService.runSync()
    })

    logger.info(
      { service: 'sync-scheduler', schedule },
      'Sync scheduler started',
    )

    // Run initial sync on startup so cache is populated immediately
    syncService.runSync().catch((error) => {
      logger.error({ service: 'sync-scheduler', error }, 'Initial sync failed')
    })
  }

  stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
      logger.info({ service: 'sync-scheduler' }, 'Sync scheduler stopped')
    }
  }

  isRunning(): boolean {
    return this.task !== null
  }
}

export const syncScheduler = new SyncSchedulerService()
```

**CRITICAL: Initial sync on startup.** The scheduler calls `syncService.runSync()` immediately on `start()` so the cache is populated without waiting for the first cron tick. This is fire-and-forget (`.catch()` logs but doesn't block server startup).

### CRITICAL: BacklogService Cache Integration

Update `getBacklogItems()` to check cache first:

```typescript
async getBacklogItems(options?: GetBacklogItemsOptions): Promise<PaginatedResponse<BacklogItemDto>> {
  // Try cache first (populated by sync scheduler)
  const cached = syncService.getCachedItems()
  if (cached) {
    // Apply in-memory pagination on cached data
    const first = options?.first ?? 50
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
    }
  }

  // Fall back to live fetch (existing behavior, unchanged)
  logger.debug(
    { service: 'backlog', source: 'live' },
    'Cache empty — fetching live from Linear',
  )

  // ... existing live-fetch code unchanged ...
}
```

**CRITICAL: Pagination on cached data.** The `after` cursor is the ID of the last item in the previous page. Find its index, then slice from there. This matches the cursor-based pagination pattern the frontend already uses.

**CRITICAL: `getBacklogItemById()` is UNCHANGED.** Detail view always fetches live for fresh comments and activities. The sync cache only serves the list view.

### CRITICAL: Sync Controller and Routes

Follow the existing `health.routes.ts` + `health.controller.ts` pattern exactly:

```typescript
// backend/src/controllers/sync.controller.ts
import type { Request, Response, NextFunction } from 'express'
import { syncService } from '../services/sync/sync.service.js'

export const getSyncStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(syncService.getStatus())
  } catch (error) {
    next(error)
  }
}
```

```typescript
// backend/src/routes/sync.routes.ts
import { Router } from 'express'
import { getSyncStatus } from '../controllers/sync.controller.js'

const router = Router()
router.get('/sync/status', getSyncStatus)

export default router
```

```typescript
// backend/src/routes/index.ts — ADD sync routes
import syncRoutes from './sync.routes.js'
// ... existing imports ...
router.use(syncRoutes)
```

### CRITICAL: Server Startup Integration

```typescript
// backend/src/server.ts — ADD scheduler start
import { syncScheduler } from './services/sync/sync-scheduler.service.js'

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started')
  syncScheduler.start()  // Start after server is listening
})
```

**CRITICAL:** `syncScheduler.start()` is called AFTER `app.listen()` callback fires, ensuring the server is ready before the initial sync runs. The initial sync is fire-and-forget — it doesn't block the server from accepting requests.

### CRITICAL: Sort Logic Extraction

Currently `sortBacklogItems()` is a private function in `backlog.service.ts`. The sync service needs the same sort logic. Options:

**Option A (recommended):** Extract `sortBacklogItems()` to a shared utility:
- Create or move to `backend/src/utils/backlog-helpers.ts` (or keep it inline in `backlog.service.ts` and export it)
- Import in both `backlog.service.ts` and `sync.service.ts`

**Option B:** Duplicate the function in `sync.service.ts` (acceptable since it's small, but less DRY).

Choose Option A — export the existing function from `backlog.service.ts` and import in `sync.service.ts`.

### CRITICAL: node-cron v4.x API

`node-cron` v4.2.1 has built-in TypeScript declarations. Key API:

```typescript
import cron from 'node-cron'

// Validate cron expression
cron.validate('0 6,12 * * *')  // returns boolean

// Schedule a task
const task = cron.schedule('0 6,12 * * *', () => { /* callback */ })

// Stop the task
task.stop()
```

**Import:** Use `import cron from 'node-cron'` (default import). The package is ESM-compatible.

**Cron syntax:** `0 6,12 * * *` = minute 0 of hours 6 and 12, every day. Standard 5-field cron (minute, hour, day-of-month, month, day-of-week).

### Architecture Compliance

**From architecture.md:**
- Services in `services/sync/` directory ✅
- Routes → Controllers → Services pattern ✅
- REST endpoint: `GET /api/sync/status` (plural noun not applicable — sync is a process) ✅
- `camelCase` JSON response fields ✅
- Pino structured logging ✅
- Singleton pattern for services ✅
- Centralized error handling via middleware ✅

**From project-context.md:**
- TypeScript strict mode ✅
- `camelCase` functions/variables, `PascalCase` types ✅
- `kebab-case` file names ✅
- Co-located tests ✅
- Never log sensitive data (API keys, tokens) ✅
- Specific, actionable error messages ✅
- ES modules (`import`/`export`) ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 2.1 Linear GraphQL Client | **HARD dependency** | Provides `linearClient.getIssuesByProject()` with pagination support |
| 2.2 Rate Limit Handling | **HARD dependency** | Rate limiter automatically throttles sync API calls |
| 2.3 Error Handling and Retry | **HARD dependency** | Retry handler covers transient failures during sync |
| 2.4 Linear Data Models | **HARD dependency** | Provides `toBacklogItemDtos()` transformer and DTO types |
| 3.1 Backlog List View | **Modified** | `backlog.service.ts` updated to check cache first |
| 5.1 Display Activities | Completed sibling | `getBacklogItemById()` unchanged — no conflict |
| 5.2 Display Comments | In review (current branch) | `getBacklogItemById()` unchanged — no conflict |
| 6.2 Manual Sync Trigger | **Future consumer** | Will call `syncService.runSync()` from a POST endpoint |
| 6.3 Display Sync Status | **Future consumer** | Will use `GET /api/sync/status` in frontend UI |

### Git Intelligence (Recent Patterns)

From recent commits:
- `9597d9f` — Merge PR #4 (story 4.3 sorting), most recent merge to main
- Current branch: `rhunnicutt/issue-5-2-display-comments-from-linear` with story 5.2 in review
- Pattern: features committed as single feat commits with issue ID reference
- Singleton services: `linearClient`, `backlogService`, `rateLimiter`, `retryHandler`
- Tests co-located with source files, using vitest
- `tsx watch` for dev, `tsc -b` for build, `vitest run` for tests

### Previous Story Intelligence (5.2)

**Key learnings from Story 5.2:**
- `Promise.allSettled` pattern works well for parallel fetch with graceful degradation
- Test mocks must include ALL fields — missing fields cause build errors (most common blocker)
- The `sortBacklogItems()` function in `backlog.service.ts` is private — needs to be exported or extracted for reuse in sync service
- Existing `SyncStatusResponse` type in `api.types.ts` is complete and matches the frontend `SyncStatus` type — use as-is, don't redefine

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SYNC_ENABLED` | `true` | Set to `false` to disable scheduled sync entirely |
| `SYNC_CRON_SCHEDULE` | `0 6,12 * * *` | Cron expression for sync schedule (default: 6 AM and 12 PM) |
| `LINEAR_PROJECT_ID` | (required) | Already exists — used by sync to know which project to fetch |

### Testing Strategy

**SyncService tests (`sync.service.test.ts`):**
- Mock `linearClient.getIssuesByProject()` to return paginated results
- Mock `toBacklogItemDtos()` to return test DTOs
- Test: successful sync populates cache and sets status to success
- Test: pagination loop fetches all pages
- Test: failed sync preserves previous cache
- Test: concurrent sync guard (returns early if already syncing)
- Test: missing `LINEAR_PROJECT_ID` sets error status
- Test: `getCachedItems()` returns null when empty, data when populated
- Test: `getStatus()` returns correct status after sync/error/idle
- Test: `clearCache()` empties the cache

**SyncSchedulerService tests (`sync-scheduler.service.test.ts`):**
- Mock `node-cron` module (schedule, validate, stop)
- Mock `syncService.runSync()`
- Test: `start()` creates cron task when enabled
- Test: `start()` skips when `SYNC_ENABLED=false`
- Test: `start()` logs error for invalid cron expression
- Test: `stop()` destroys cron task
- Test: `isRunning()` reflects state
- Test: initial sync fires on start

**Sync routes tests (`sync.routes.test.ts`):**
- Mock `syncService.getStatus()`
- Test: `GET /api/sync/status` returns sync status JSON
- Test: response matches `SyncStatusResponse` shape

**BacklogService cache tests (additions to `backlog.service.test.ts`):**
- Mock `syncService.getCachedItems()` to return cached data
- Test: `getBacklogItems()` returns from cache when available
- Test: `getBacklogItems()` with pagination params on cached data
- Test: `getBacklogItems()` falls back to live fetch when cache is empty
- Test: `getBacklogItemById()` always fetches live (unchanged)

### Project Structure After This Story

```
backend/src/
├── server.ts                                    (MODIFIED — add syncScheduler.start())
├── routes/
│   ├── index.ts                                 (MODIFIED — add syncRoutes)
│   ├── sync.routes.ts                           (NEW)
│   └── sync.routes.test.ts                      (NEW)
├── controllers/
│   └── sync.controller.ts                       (NEW)
├── services/
│   ├── sync/
│   │   ├── sync.service.ts                      (NEW — sync orchestration)
│   │   ├── sync.service.test.ts                 (NEW)
│   │   ├── sync-scheduler.service.ts            (NEW — cron scheduling)
│   │   ├── sync-scheduler.service.test.ts       (NEW)
│   │   ├── linear-client.service.ts             (UNCHANGED)
│   │   ├── linear-transformers.ts               (UNCHANGED)
│   │   ├── rate-limiter.ts                      (UNCHANGED)
│   │   └── retry-handler.ts                     (UNCHANGED)
│   └── backlog/
│       ├── backlog.service.ts                   (MODIFIED — cache-first for list view)
│       └── backlog.service.test.ts              (MODIFIED — add cache tests)
├── types/
│   └── api.types.ts                             (UNCHANGED — SyncStatusResponse already defined)
```

### What NOT To Do

- **Do NOT** create a database table for cached Linear items — in-memory cache is sufficient for MVP. Database-backed caching is a future optimization (Epic 9).
- **Do NOT** add database persistence for sync status — in-memory tracking is fine. Sync history table (`sync_history`) is future work.
- **Do NOT** modify `linear-client.service.ts` — it already handles pagination, rate limiting, and retries perfectly. The sync service composes on top of it.
- **Do NOT** modify `linear-transformers.ts` — transformers are correct as-is. The sync service uses them unchanged.
- **Do NOT** add a manual sync trigger endpoint — that's Story 6.2.
- **Do NOT** add frontend sync status UI — that's Story 6.3.
- **Do NOT** block server startup on initial sync — fire-and-forget with `.catch()` error logging.
- **Do NOT** add manual delays between pagination requests — the rate limiter handles throttling automatically.
- **Do NOT** wipe the cache on sync failure — preserve stale-but-valid data.
- **Do NOT** use `any` type — all data is properly typed with existing `BacklogItemDto`, `SyncStatusResponse`, etc.
- **Do NOT** hardcode cron schedules — read from env vars with sensible defaults.
- **Do NOT** create `utils/cache.ts` as a generic cache utility — the sync service holds its own state. Keep it simple.
- **Do NOT** change `getBacklogItemById()` — detail view must always fetch live for fresh comments/activities.
- **Do NOT** fetch more than 50 items per page from Linear — this is a sensible batch size that balances throughput and rate limit consumption.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 6, Story 6.1] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Caching strategy, in-memory cache, TTL based on sync schedule
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design] — REST patterns, response formats, error handling
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — Pino logging, monitoring
- [Source: _bmad-output/project-context.md] — Naming conventions, anti-patterns, testing rules
- [Source: backend/src/services/sync/linear-client.service.ts] — LinearClientService with getIssuesByProject pagination
- [Source: backend/src/services/sync/rate-limiter.ts] — Rate limiter handles throttling automatically
- [Source: backend/src/services/sync/retry-handler.ts] — Retry handler covers transient failures
- [Source: backend/src/services/sync/linear-transformers.ts] — toBacklogItemDtos transformer
- [Source: backend/src/services/backlog/backlog.service.ts] — BacklogService to update with cache-first logic
- [Source: backend/src/types/api.types.ts] — SyncStatusResponse type (already defined, ready to use)
- [Source: backend/src/routes/health.routes.ts] — Route registration pattern to follow
- [Source: backend/src/controllers/backlog.controller.ts] — Controller pattern to follow
- [Source: backend/src/server.ts] — Server startup where scheduler is initialized
- [Source: _bmad-output/implementation-artifacts/5-2-display-comments-from-linear.md] — Previous story context, patterns, and learnings

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
