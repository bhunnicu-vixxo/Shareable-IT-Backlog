# Story 6.5: Handle Linear API Unavailability

Linear Issue ID: VIX-358
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want to handle cases where Linear API is unavailable,
so that the application continues to function with cached data.

## Acceptance Criteria

1. **Given** Linear API is unavailable, **When** a sync is attempted, **Then** the sync failure is detected and classified as `SYNC_API_UNAVAILABLE` (already implemented in Story 6.4)
2. **And** cached backlog data continues to be displayed to users in the list view — the UI never replaces visible items with an error screen when stale data is available
3. **And** a freshness indicator is visible, showing data may be stale (e.g., "Data shown may be outdated — last synced [relative time]")
4. **And** an error message explains that Linear API is unavailable in user-friendly terms (already implemented in Story 6.4)
5. **And** a retry/refresh option is available to users (not only admins) so they can attempt to reload data
6. **And** the backlog list API returns an empty paginated response (not a 500 error) when the sync cache is empty and the live Linear fetch fails
7. **And** the backlog detail API degrades gracefully: if the live Linear fetch fails but the item exists in the sync cache, it returns the cached item with empty comments and activities arrays
8. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
9. **And** unit tests cover graceful degradation, stale-data preservation, and updated UI behaviour

## Tasks / Subtasks

- [x] Task 1: Backend — Graceful degradation for backlog list API (AC: #6)
  - [x] 1.1: In `BacklogService.getBacklogItems()`, wrap the live Linear fetch fallback (the code path after cache miss) in a try/catch
  - [x] 1.2: In the catch block, log the error with structured context (`{ service: 'backlog', operation: 'getBacklogItems', source: 'degraded-empty', error }`)
  - [x] 1.3: Return an empty paginated response: `{ items: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 }` instead of letting the error propagate to a 500
  - [x] 1.4: Preserve the existing background sync trigger (`syncService.runSync()`) so the cache gets populated on next successful sync
  - [x] 1.5: Add/update tests in `backend/src/services/backlog/backlog.service.test.ts` — cover: cache empty + live fetch throws → returns empty result (not throw); cache populated + live fetch would fail → serves from cache (existing); cache empty + live fetch succeeds → returns live data (existing)

- [x] Task 2: Backend — Graceful degradation for backlog detail API (AC: #7)
  - [x] 2.1: In `BacklogService.getBacklogItemById()`, when the `issueResult` Promise is rejected, check the sync cache for the item before re-throwing
  - [x] 2.2: Call `syncService.getCachedItems()` and search for the item by `id` (the `issueId` parameter)
  - [x] 2.3: If found in cache, return `{ item: cachedItem, comments: [], activities: [] }` and log `{ service: 'backlog', operation: 'getBacklogItemById', issueId, source: 'cache-fallback' }`
  - [x] 2.4: If NOT found in cache, re-throw the original error (preserving current 5xx behaviour)
  - [x] 2.5: Add/update tests in `backend/src/services/backlog/backlog.service.test.ts` — cover: live fetch fails + item in cache → returns cached item with empty comments/activities; live fetch fails + item NOT in cache → throws original error; live fetch returns null (not found) → returns null (existing 404 path unchanged)

- [x] Task 3: Frontend — Preserve stale data on background refetch failure (AC: #2, #3)
  - [x] 3.1: In `backlog-list.tsx`, change the `isError` guard so it only shows `BacklogErrorState` when there is NO cached data: `if (isError && (!data || data.items.length === 0))`
  - [x] 3.2: When `isError && data?.items?.length > 0`, fall through to the normal rendering path — the `SyncStatusIndicator` error banner already warns about staleness
  - [x] 3.3: Update `backlog-list.test.tsx` — add test: when `isError` is true but `data.items` has items, data is rendered (not error state)

- [x] Task 4: Frontend — User-facing "Refresh data" action in error banner (AC: #5)
  - [x] 4.1: In `sync-status-indicator.tsx`, add a "Refresh data" `Button` inside the error alert banner
  - [x] 4.2: The button calls `queryClient.invalidateQueries({ queryKey: ['backlog-items'] })` to trigger a TanStack Query refetch of the backlog list
  - [x] 4.3: Import `useQueryClient` from `@tanstack/react-query`
  - [x] 4.4: Button styling: `size="xs"`, `variant="outline"`, placed after the guidance text
  - [x] 4.5: Update `sync-status-indicator.test.tsx` — add test: error state renders a "Refresh data" button; clicking it calls `invalidateQueries`

- [x] Task 5: Build and test verification (AC: #8, #9)
  - [x] 5.1: Run `npm run build` in `backend/` — zero errors
  - [x] 5.2: Run `npm run test:run` in `backend/` — all tests pass
  - [x] 5.3: Run `npm run build` in `frontend/` — zero errors
  - [x] 5.4: Run `npm run test:run` in `frontend/` — all tests pass

## Dev Notes

### What's Already Done (from Stories 6.1–6.4)

| Capability | Story | File |
|---|---|---|
| SyncService with in-memory cache; preserves cache on failure (stale data > no data) | 6.1 | `backend/src/services/sync/sync.service.ts` |
| `SyncService.getCachedItems()` returns `BacklogItemDto[] \| null` | 6.1 | `backend/src/services/sync/sync.service.ts` |
| `BacklogService.getBacklogItems()` — cache-first with live-fetch fallback | 6.1 | `backend/src/services/backlog/backlog.service.ts` |
| `BacklogService.getBacklogItemById()` — always live fetch, no cache fallback | 5.1 | `backend/src/services/backlog/backlog.service.ts` |
| `SyncStatusResponse` type with `status`, `errorCode`, `errorMessage`, `lastSyncedAt` | 6.4 | `backend/src/types/api.types.ts` |
| Error classifier: `classifySyncError()` → `SYNC_API_UNAVAILABLE` etc. | 6.4 | `backend/src/services/sync/sync-error-classifier.ts` |
| User-friendly error messages for each error code | 6.4 | `frontend/src/utils/sync-error-messages.ts` |
| `SyncStatusIndicator` — error banner with user-friendly title, description, guidance, last sync time | 6.4 | `frontend/src/features/backlog/components/sync-status-indicator.tsx` |
| `SyncControl` admin component with retry button | 6.2 | `frontend/src/features/admin/components/sync-control.tsx` |
| `useSyncStatus` hook (5 s polling) | 6.3/6.4 | `frontend/src/features/backlog/hooks/use-sync-status.ts` |
| `useBacklogItems` hook (TanStack Query, key `['backlog-items']`) | 3.1 | `frontend/src/features/backlog/hooks/use-backlog-items.ts` |
| `BacklogList` — renders items with loading/error/empty states | 3.1 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| `BacklogPage` — renders header with `SyncStatusIndicator` + `BacklogList` | 3.1 | `frontend/src/features/backlog/components/backlog-page.tsx` |
| Sync scheduler with cron + initial sync on startup | 6.1 | `backend/src/services/sync/sync-scheduler.service.ts` |
| Linear error types (`LinearApiError`, `LinearNetworkError`, `LinearConfigError`) | 2.3 | `backend/src/utils/linear-errors.ts` |
| Error middleware maps errors to API error responses | 2.3 | `backend/src/middleware/error.middleware.ts` |
| Pino structured logger | 1.2 | `backend/src/utils/logger.ts` |
| Chakra UI v3 `Alert.Root`, `Alert.Indicator`, `Alert.Title`, `Alert.Description` | — | `@chakra-ui/react` |
| TanStack Query v5 with `useQueryClient`, `invalidateQueries` | — | `@tanstack/react-query` |

### What This Story Creates / Changes

1. **`BacklogService.getBacklogItems()` graceful degradation** — live-fetch fallback wrapped in try/catch; returns empty paginated response instead of 500 when cache is empty and Linear is down
2. **`BacklogService.getBacklogItemById()` cache fallback** — when live fetch fails, looks up item in sync cache; returns cached item with empty comments/activities if found
3. **`BacklogList` stale-data preservation** — error guard changed to only show error state when no cached data exists; stale data displayed normally when refetch fails
4. **`SyncStatusIndicator` user retry** — "Refresh data" button in the error alert banner; invalidates TanStack Query backlog cache to trigger refetch

### CRITICAL: BacklogService.getBacklogItems() Change

The current code in `backend/src/services/backlog/backlog.service.ts` has this flow when cache is empty:

```typescript
// Current (simplified):
const cached = syncService.getCachedItems()
if (cached) { /* serve from cache */ return ... }

// Cache miss — fire background sync, then serve live data
syncService.runSync().catch(...)

// ⚠️ THIS THROWS when Linear is down → 500 error to frontend
const result = await linearClient.getIssuesByProject(projectId, ...)
```

**Change to:**

```typescript
const cached = syncService.getCachedItems()
if (cached) { /* serve from cache — UNCHANGED */ return ... }

// Cache miss — fire background sync (UNCHANGED)
syncService.runSync().catch(...)

// NEW: wrap live fetch in try/catch for graceful degradation
try {
  const result = await linearClient.getIssuesByProject(projectId, { first, after: options?.after })
  const dtos = await toBacklogItemDtos(result.data)
  const sorted = sortBacklogItems(dtos)
  return {
    items: sorted,
    pageInfo: result.pageInfo ?? { hasNextPage: false, endCursor: null },
    totalCount: sorted.length,
  }
} catch (error) {
  logger.warn(
    { service: 'backlog', operation: 'getBacklogItems', source: 'degraded-empty', error },
    'Live Linear fetch failed and sync cache is empty — returning empty result',
  )
  return {
    items: [],
    pageInfo: { hasNextPage: false, endCursor: null },
    totalCount: 0,
  }
}
```

**CRITICAL:** Only the live-fetch fallback path (after cache miss) gets the try/catch. The cache-serve path is UNCHANGED. The background sync trigger is UNCHANGED.

### CRITICAL: BacklogService.getBacklogItemById() Change

The current code always fetches live from Linear. When Linear is down, the `issueResult` promise is rejected, and the error is re-thrown (resulting in a 500).

**Change the error handling for `issueResult`:**

```typescript
// Current:
if (issueResult.status === 'rejected') {
  logger.error(...)
  throw issueResult.reason
}

// NEW:
if (issueResult.status === 'rejected') {
  // Try sync cache before giving up
  const cachedItems = syncService.getCachedItems()
  const cachedItem = cachedItems?.find((item) => item.id === issueId) ?? null

  if (cachedItem) {
    logger.info(
      { service: 'backlog', operation: 'getBacklogItemById', issueId, source: 'cache-fallback' },
      'Live fetch failed — serving item from sync cache (no comments/activities)',
    )
    return { item: cachedItem, comments: [], activities: [] }
  }

  // Not in cache either — throw original error
  logger.error(
    { service: 'backlog', operation: 'getBacklogItemById', issueId, error: issueResult.reason },
    'Failed to fetch issue and item not in sync cache',
  )
  throw issueResult.reason
}
```

**CRITICAL:** The `null` return path (Linear returns null for non-existent issues) is UNCHANGED. The cache fallback only applies when the fetch itself fails (rejected promise), NOT when the issue genuinely doesn't exist.

### CRITICAL: BacklogList Stale-Data Preservation

The current `backlog-list.tsx` has:

```typescript
if (isError) {
  return <BacklogErrorState message={...} onRetry={...} />
}
```

This **hides cached data** when a background refetch fails. In TanStack Query v5, when a query has cached data and a refetch fails:
- `status: 'error'` → `isError: true`
- `data` still contains the previous successful response
- `fetchStatus: 'idle'`

**Change to:**

```typescript
if (isError && (!data || data.items.length === 0)) {
  return <BacklogErrorState message={...} onRetry={...} />
}
// When isError && data.items.length > 0: fall through to normal rendering.
// The SyncStatusIndicator error banner already warns "Data shown may be outdated".
```

**CRITICAL:** Do NOT add a separate staleness banner inside BacklogList. The `SyncStatusIndicator` in `BacklogPage` already handles this. The only change in BacklogList is the error guard condition.

### CRITICAL: SyncStatusIndicator "Refresh Data" Button

Add a small "Refresh data" button inside the existing error alert that invalidates the backlog items TanStack Query cache:

```typescript
import { useQueryClient } from '@tanstack/react-query'

export function SyncStatusIndicator() {
  const { syncStatus, isLoading } = useSyncStatus()
  const queryClient = useQueryClient()

  // ... existing code ...

  if (syncStatus?.status === 'error') {
    const errorDisplay = getUserFriendlyErrorMessage(syncStatus.errorCode ?? null)

    return (
      <VStack gap={2} align="stretch" w="full">
        <Alert.Root status="warning" variant="subtle" borderRadius="md" size="sm">
          <Alert.Indicator />
          <Box flex="1">
            <Alert.Title fontSize="sm" data-testid="sync-error-title">
              {errorDisplay.title}
            </Alert.Title>
            <Alert.Description fontSize="xs" color="fg.muted">
              {errorDisplay.description}{' '}
              {errorDisplay.guidance}
              {syncStatus.lastSyncedAt && (
                <> Last successful sync: {formatRelativeTime(syncStatus.lastSyncedAt)}.</>
              )}
            </Alert.Description>
          </Box>
          <Button
            size="xs"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['backlog-items'] })}
            aria-label="Refresh backlog data"
            data-testid="sync-error-refresh-btn"
            flexShrink={0}
          >
            Refresh data
          </Button>
        </Alert.Root>
      </VStack>
    )
  }

  // ... rest unchanged ...
}
```

**CRITICAL:** This does NOT trigger a sync (admin-only). It invalidates the TanStack Query cache for backlog items, causing a refetch from `GET /api/backlog-items`. If the sync cache has been repopulated since the last fetch, the user gets fresh data. If Linear is still down, the backend returns either cached data or an empty result (Task 1).

**CRITICAL:** Import `Button` from `@chakra-ui/react` (already in scope if it's in the imports — check current imports). Import `useQueryClient` from `@tanstack/react-query`.

### Architecture Compliance

| Requirement | Status |
|---|---|
| Services in `services/` directory | ✅ No new files — modifying existing services |
| `camelCase` JSON response fields | ✅ No new fields — existing response shapes |
| Pino structured logging | ✅ All new log statements use structured context |
| Error middleware unchanged | ✅ Graceful degradation prevents errors from reaching middleware |
| TanStack Query for server state | ✅ Using `invalidateQueries` (standard pattern) |
| Co-located tests | ✅ Test updates in same directory as source |
| Feature-based frontend organization | ✅ Changes in `features/backlog/` |
| Layer-based backend organization | ✅ Changes in `services/backlog/` |

### Library & Framework Requirements

- **TanStack Query v5**: `useQueryClient().invalidateQueries({ queryKey: ['backlog-items'] })` — standard cache invalidation API
- **Chakra UI v3**: `Button` component with `size="xs"`, `variant="outline"` — already used throughout the codebase
- **No new dependencies** — all imports are from packages already in `package.json`

### File Structure (After This Story)

```
backend/src/
├── services/
│   └── backlog/
│       ├── backlog.service.ts           (MODIFIED — try/catch for live fetch, cache fallback for detail)
│       └── backlog.service.test.ts      (MODIFIED — add graceful degradation tests)

frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── backlog-list.tsx              (MODIFIED — stale-data-preserving error guard)
│       │   ├── backlog-list.test.tsx         (MODIFIED — add stale data preservation test)
│       │   ├── sync-status-indicator.tsx     (MODIFIED — add "Refresh data" button + useQueryClient)
│       │   └── sync-status-indicator.test.tsx (MODIFIED — add refresh button tests)
```

**No new files.** This story modifies 4 source files and 4 test files.

### Testing Strategy

**Backend — `backlog.service.test.ts` additions:**

| Test | Scenario | Expected |
|---|---|---|
| `getBacklogItems` graceful degradation | Cache empty, `linearClient.getIssuesByProject` throws `LinearNetworkError` | Returns `{ items: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 }` — no throw |
| `getBacklogItems` graceful degradation logging | Same as above | `logger.warn` called with `source: 'degraded-empty'` |
| `getBacklogItems` live fetch still works | Cache empty, `linearClient.getIssuesByProject` succeeds | Returns transformed + sorted items (existing test — verify still passes) |
| `getBacklogItemById` cache fallback | `linearClient.getIssueById` rejects, item exists in sync cache | Returns `{ item: cachedItem, comments: [], activities: [] }` |
| `getBacklogItemById` cache fallback — not in cache | `linearClient.getIssueById` rejects, item NOT in sync cache | Throws original error |
| `getBacklogItemById` null return unchanged | `linearClient.getIssueById` resolves with `null` | Returns `null` (404 path unchanged) |

**Frontend — `backlog-list.test.tsx` additions:**

| Test | Scenario | Expected |
|---|---|---|
| Stale data preserved on refetch error | `useBacklogItems` returns `isError: true` AND `data.items` with items | Items rendered (not error state) |
| Error state when truly no data | `useBacklogItems` returns `isError: true` AND `data: undefined` | `BacklogErrorState` rendered |

**Frontend — `sync-status-indicator.test.tsx` additions:**

| Test | Scenario | Expected |
|---|---|---|
| Refresh button present in error state | `syncStatus.status === 'error'` | Button with `data-testid="sync-error-refresh-btn"` is rendered |
| Refresh button triggers query invalidation | Click the refresh button | `queryClient.invalidateQueries` called with `{ queryKey: ['backlog-items'] }` |

### Previous Story Intelligence (6.4)

**Key learnings from Story 6.4:**

- `LinearApiError` uses `type: LinearApiErrorType` (not HTTP status code) for classification — use `instanceof` checks + `.type` property
- `vi.hoisted()` is needed for mocking modules in vitest
- Existing test fixtures for `SyncStatusResponse` and `SyncStatus` already include `errorCode: null` — no need to update test fixtures for this story
- `SyncStatusIndicator` uses `data-testid` attributes for testing — follow this pattern for new elements
- Both builds (frontend + backend) must pass with zero errors — verify after each task
- `@chakra-ui/react` imports: use `Alert.Root`, `Alert.Indicator`, `Alert.Title`, `Alert.Description` (Chakra v3 compound pattern)
- Frontend tests mock `useSyncStatus` via `vi.mock('../hooks/use-sync-status')`
- Backend tests mock `syncService` and `linearClient` via `vi.mock` with `vi.hoisted()`

**Review follow-ups from 6.4 (informational — do NOT implement these in 6.5):**
- AC#1 timing was addressed by changing polling to 5s
- UX/layout risk with error banner in header HStack — monitor but out of scope for 6.5
- Admin-only error detail enforced by UI, not API — out of scope for 6.5

### Git Intelligence

- **Branch pattern:** `rhunnicutt/issue-6-5-handle-linear-api-unavailability`
- **Commit pattern:** `feat:` prefix with Linear issue ID, e.g., `feat: handle Linear API unavailability with graceful degradation (VIX-358)`
- **Recent merge:** `185b561` — Story 6.4 merged to main
- **Test counts (as of 6.4):** 470 backend tests, 252 frontend tests — expect these as baseline
- **Vitest** for both frontend and backend testing
- **ES module imports:** Use `.js` extension in backend imports (e.g., `from './sync.service.js'`)

### What NOT To Do

- **Do NOT** create new API endpoints — existing `GET /api/backlog-items`, `GET /api/backlog-items/:id`, and `GET /api/sync/status` are sufficient
- **Do NOT** add database persistence for cached data — in-memory sync cache is sufficient for MVP
- **Do NOT** modify `SyncService`, `sync-error-classifier`, or `sync-error-messages` — error classification and messaging are complete from 6.4
- **Do NOT** modify `useSyncStatus` or `useBacklogItems` hooks — they already fetch the right data; changes are in the components that consume them
- **Do NOT** add a staleness banner inside `BacklogList` — the `SyncStatusIndicator` in `BacklogPage` already handles staleness display
- **Do NOT** add a sync trigger button for regular users — sync triggering is admin-only (`POST /api/sync/trigger`). The "Refresh data" button only invalidates the TanStack Query cache (client-side refetch)
- **Do NOT** modify the sync scheduler, cron logic, or retry handler — automatic retry is already working
- **Do NOT** add `date-fns` — `formatRelativeTime()` already exists using native `Intl.RelativeTimeFormat`
- **Do NOT** change the TanStack Query configuration or create new query keys
- **Do NOT** change the `PaginatedResponse` type or add new fields to the API response shape

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 6, Story 6.5] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 6, Story 6.6] — Related: Handle Partial Sync Failures (next story)
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Standards] — Consistent error format, user-friendly messages, graceful degradation
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — Error response shape, caching strategy
- [Source: _bmad-output/project-context.md] — Naming conventions, anti-patterns, error handling rules
- [Source: backend/src/services/backlog/backlog.service.ts] — BacklogService to modify (list + detail)
- [Source: backend/src/services/sync/sync.service.ts] — SyncService with getCachedItems()
- [Source: backend/src/types/api.types.ts] — SyncStatusResponse, PaginatedResponse types
- [Source: backend/src/utils/linear-errors.ts] — LinearApiError, LinearNetworkError, LinearConfigError
- [Source: backend/src/middleware/error.middleware.ts] — Error middleware (unchanged)
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — BacklogList to modify
- [Source: frontend/src/features/backlog/components/sync-status-indicator.tsx] — SyncStatusIndicator to modify
- [Source: frontend/src/features/backlog/hooks/use-backlog-items.ts] — useBacklogItems hook (unchanged)
- [Source: frontend/src/features/backlog/hooks/use-sync-status.ts] — useSyncStatus hook (unchanged)
- [Source: frontend/src/utils/sync-error-messages.ts] — getUserFriendlyErrorMessage (unchanged)
- [Source: frontend/src/utils/formatters.ts] — formatRelativeTime (unchanged)
- [Source: _bmad-output/implementation-artifacts/6-4-implement-sync-error-handling-and-messages.md] — Previous story context, design decisions, review follow-ups

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

- Backend builds clean: `npm run build` in `backend/` — zero TypeScript errors
- Frontend builds clean: `npm run build` in `frontend/` — zero TypeScript errors
- Backend tests: `npm run test:run` in `backend/` — all tests pass
- Frontend tests: `npm run test:run` in `frontend/` — all tests pass

### Completion Notes List

- ✅ Task 1: Wrapped live Linear fetch fallback in try/catch in `getBacklogItems()`. Returns empty paginated response when cache is empty and Linear is down (AC #6). Background sync trigger preserved. Added 4 tests.
- ✅ Task 2: Added cache fallback to `getBacklogItemById()`. When live fetch fails, checks sync cache for the item and returns it with empty comments/activities (AC #7). If not in cache, original error propagates. Added 3 tests.
- ✅ Task 3: Changed error guard in `BacklogList` from `if (isError)` to `if (isError && (!data || data.items.length === 0))`. Stale cached data is now preserved on refetch failure (AC #2, #3). SyncStatusIndicator handles staleness display. Added 1 test.
- ✅ Task 4: Added "Refresh data" button to SyncStatusIndicator error alert banner. Uses `useQueryClient().invalidateQueries({ queryKey: ['backlog-items'] })` for client-side cache refresh (AC #5). Not a sync trigger — only invalidates TanStack Query cache. Added 3 tests.
- ✅ Task 5: Both builds pass with zero TypeScript errors. All new tests pass. No regressions introduced.

### File List

- `backend/src/services/backlog/backlog.service.ts` — MODIFIED (try/catch for live fetch graceful degradation, cache fallback for detail)
- `backend/src/services/backlog/backlog.service.test.ts` — MODIFIED (added 6 new tests: 4 graceful degradation, 2 cache fallback + 1 updated)
- `frontend/src/features/backlog/components/backlog-list.tsx` — MODIFIED (stale-data-preserving error guard)
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — MODIFIED (added stale data preservation test; stabilized Select interactions)
- `frontend/src/features/backlog/components/business-unit-filter.test.tsx` — MODIFIED (stabilized Chakra Select interactions in tests)
- `frontend/src/features/backlog/components/sort-control.test.tsx` — MODIFIED (stabilized Chakra Select interactions in tests)
- `frontend/src/features/backlog/components/sync-status-indicator.tsx` — MODIFIED (added "Refresh data" button + useQueryClient)
- `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` — MODIFIED (added 3 refresh button tests + useQueryClient mock)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (status: ready-for-dev → in-progress → review)
- `_bmad-output/implementation-artifacts/6-5-handle-linear-api-unavailability.md` — MODIFIED (task checkboxes, Dev Agent Record, File List, Change Log, Status)
- `package-lock.json` — MODIFIED (workspace lock updated)

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-10_

### Review Summary

- Verified graceful degradation behavior in `BacklogService` aligns with AC #6/#7.
- Confirmed UI behavior preserves stale data (AC #2/#3) and provides a user retry action (AC #5).
- Verified builds and unit tests pass for both `backend/` and `frontend/` (AC #8/#9).

### Fixes Applied During Review

- Removed an accidental platform-specific dependency (`@swc/core-darwin-arm64`) from the frontend dependency graph and refreshed the workspace lockfile.
- Stabilized Chakra `Select` interactions in unit tests by selecting options via rendered listbox options (avoids brittle keyboard simulation in JSDOM).
- Tightened backend graceful-degradation logic so it only degrades on *live Linear fetch* failure (does not swallow DTO transform bugs).

## Change Log

- **2026-02-10**: Implemented graceful degradation for Linear API unavailability (VIX-358). Backend returns empty paginated response instead of 500 when cache empty and Linear down; detail API falls back to sync cache. Frontend preserves stale data on refetch failure and adds "Refresh data" button in error banner. All builds pass, all new tests pass.
- **2026-02-10**: Senior developer review fixes applied: removed platform-specific dependency, stabilized frontend Select tests, and tightened backend degradation error scope. Builds/tests re-verified passing.
