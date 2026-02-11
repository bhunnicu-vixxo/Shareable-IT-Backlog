# Story 6.6: Handle Partial Sync Failures

Linear Issue ID: VIX-359
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want to handle cases where some data updates successfully and some doesn't,
so that partial failures don't corrupt the entire dataset.

## Acceptance Criteria

1. **Given** a sync operation encounters partial failures during item transformation,
   **When** some items transform successfully and some throw errors,
   **Then** successfully transformed items are saved to the in-memory cache,
   **And** failed items are logged with their Linear issue identifiers and error details.

2. **Given** a sync completes with partial failures,
   **When** the sync status is queried,
   **Then** the status indicates `"partial"` (not `"success"` or `"error"`),
   **And** the response includes `itemsSynced` and `itemsFailed` counts.

3. **Given** a partial sync has occurred,
   **When** a user views the backlog sync status indicator,
   **Then** a yellow/warning indicator shows that some items failed to sync,
   **And** the indicator communicates partial success without alarming users.

4. **Given** a partial sync has occurred,
   **When** an admin views the sync control panel,
   **Then** admin can see the count of items that failed to sync,
   **And** the error code `SYNC_PARTIAL_SUCCESS` is displayed alongside the count.

## Tasks / Subtasks

- [x] Task 1: Add `'partial'` status and tracking fields to backend types (AC: #2)
  - [x] 1.1 Add `'partial'` to `SyncStatusResponse.status` union in `api.types.ts`
  - [x] 1.2 Add optional `itemsSynced` and `itemsFailed` number fields to `SyncStatusResponse`
  - [x] 1.3 Add `PARTIAL_SUCCESS: 'SYNC_PARTIAL_SUCCESS'` to `SYNC_ERROR_CODES` in `sync-error-classifier.ts`

- [x] Task 2: Make `toBacklogItemDtos` resilient to individual item failures (AC: #1)
  - [x] 2.1 Create `TransformResult` type: `{ items: BacklogItemDto[], failures: TransformFailure[] }`
  - [x] 2.2 Create `TransformFailure` type: `{ issueId: string, identifier: string, error: string }`
  - [x] 2.3 Wrap individual `toBacklogItemDto` calls in try/catch within batch loop
  - [x] 2.4 Return `TransformResult` from new `toBacklogItemDtosResilient()` function
  - [x] 2.5 Log each failure with Pino at `warn` level including issue identifier

- [x] Task 3: Update `SyncService.runSync()` for partial failure handling (AC: #1, #2)
  - [x] 3.1 Call `toBacklogItemDtosResilient()` instead of `toBacklogItemDtos()`
  - [x] 3.2 When failures exist but items also succeeded: set status `'partial'`, populate `itemsSynced`/`itemsFailed`
  - [x] 3.3 When ALL items fail: set status `'error'` (not partial)
  - [x] 3.4 Store failure details in a private field for admin status endpoint
  - [x] 3.5 Update `getStatus()` to include `itemsSynced`/`itemsFailed` counts
  - [x] 3.6 Initialize `itemsSynced`/`itemsFailed` as `null` in default status

- [x] Task 4: Add `'partial'` status to frontend types (AC: #3, #4)
  - [x] 4.1 Add `'partial'` to `SyncStatus.status` union in `backlog.types.ts`
  - [x] 4.2 Add optional `itemsSynced` and `itemsFailed` number fields to `SyncStatus`

- [x] Task 5: Add partial success message to frontend error messages (AC: #3)
  - [x] 5.1 Add `SYNC_PARTIAL_SUCCESS` entry to `ERROR_MESSAGES` in `sync-error-messages.ts`

- [x] Task 6: Update `SyncStatusIndicator` for partial status (AC: #3)
  - [x] 6.1 Handle `'partial'` status in `getStatusDotColor()` → return `'yellow.500'`
  - [x] 6.2 Add partial status rendering branch: yellow dot + "Synced with warnings" text
  - [x] 6.3 Show count of failed items if available

- [x] Task 7: Update `SyncControl` admin panel for partial status (AC: #4)
  - [x] 7.1 Handle `'partial'` status in transition detection (syncing → partial shows alert)
  - [x] 7.2 Add partial success alert with warning status showing items synced/failed counts
  - [x] 7.3 Include error code display for admin debugging

- [x] Task 8: Tests for all changes
  - [x] 8.1 Backend: Test `toBacklogItemDtosResilient` with mixed success/failure items
  - [x] 8.2 Backend: Test `SyncService.runSync()` partial failure → status is `'partial'`
  - [x] 8.3 Backend: Test all-items-fail scenario → status is `'error'` not `'partial'`
  - [x] 8.4 Backend: Test `getStatus()` returns correct `itemsSynced`/`itemsFailed` counts
  - [x] 8.5 Frontend: Test `SyncStatusIndicator` renders partial status with yellow dot
  - [x] 8.6 Frontend: Test `SyncControl` renders partial success alert with counts
  - [x] 8.7 Frontend: Test `getUserFriendlyErrorMessage('SYNC_PARTIAL_SUCCESS')` returns expected message

## Dev Notes

### Critical Implementation Context

**Current Gap (the bug this story fixes):**
`toBacklogItemDtos()` in `linear-transformers.ts` (line 478-491) uses `Promise.all()` per batch. If ANY single `toBacklogItemDto()` call throws (e.g., SDK lazy-loading fails for one issue's state/assignee/labels), the **entire batch rejects** and `runSync()` catches it as a complete failure. This means one bad issue corrupts the entire sync.

**Root Cause of Individual Transform Failures:**
`toBacklogItemDto()` (line 112-155) resolves 5 lazy-loading SDK relations via `Promise.all`: `issue.state`, `issue.assignee`, `issue.project`, `issue.team`, `issue.labels()`. Any of these can throw if the related entity was deleted, the API returns a transient error, or the SDK encounters a malformed response. The comment transformer already handles this pattern correctly — `toCommentDto()` uses `.catch(() => undefined)` for parent/user resolution.

**Design Decision: New function, don't break existing signature.**
Create `toBacklogItemDtosResilient()` returning `TransformResult` rather than modifying the existing `toBacklogItemDtos()` signature. This avoids breaking any other callers and keeps the change isolated. The sync service will call the new function.

**Status Transitions After This Story:**
`idle → syncing → success | error | partial`
- `partial`: Some items succeeded, some failed (items_synced > 0 AND items_failed > 0)
- `error`: Zero items succeeded (all failed) OR fetch/pagination failed entirely
- `success`: All items succeeded (items_failed === 0)

**Preserve Existing Cache on Partial Failure:**
On `partial` status, replace cache with successfully synced items (partial fresh data > fully stale data). This differs from `error` status where cache is preserved (stale data > no data). Rationale: partial results include the successfully synced items which are fresh.

**Do NOT add database persistence.** The architecture specifies in-memory cache for MVP. Failure details are tracked in-memory on the `SyncService` instance (volatile, lost on restart). This is acceptable for MVP.

### Anti-Patterns to Avoid

- **Do NOT wrap `fetchAllIssues` pagination in try/catch per page.** Pagination failures (network/auth/rate-limit) should still fail the entire sync — partial page fetching would produce incomplete/misleading data. Only transformation failures should be partial.
- **Do NOT use `any` type** for failure tracking. Use typed `TransformFailure` interface.
- **Do NOT expose raw error messages** to non-admin users. The frontend already maps error codes to user-friendly messages via `sync-error-messages.ts`.
- **Do NOT change the `toBacklogItemDtos` function signature.** Create a new `toBacklogItemDtosResilient` function to avoid breaking existing callers.

### Project Structure Notes

All changes align with existing project structure:

**Backend files to modify:**
- `backend/src/types/api.types.ts` — Add `'partial'` to status union, add fields
- `backend/src/services/sync/sync-error-classifier.ts` — Add `PARTIAL_SUCCESS` code
- `backend/src/services/sync/linear-transformers.ts` — Add `toBacklogItemDtosResilient()`
- `backend/src/services/sync/sync.service.ts` — Use resilient transformer, handle partial

**Frontend files to modify:**
- `frontend/src/features/backlog/types/backlog.types.ts` — Add `'partial'` to status union
- `frontend/src/utils/sync-error-messages.ts` — Add `SYNC_PARTIAL_SUCCESS` message
- `frontend/src/features/backlog/components/sync-status-indicator.tsx` — Handle partial state
- `frontend/src/features/admin/components/sync-control.tsx` — Handle partial state

**Test files to modify:**
- `backend/src/services/sync/linear-transformers.test.ts` — Tests for resilient transformer
- `backend/src/services/sync/sync.service.test.ts` — Tests for partial sync flow
- `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` — Partial state rendering
- `frontend/src/features/admin/components/sync-control.test.tsx` — Partial state rendering

No new files needed. No new dependencies.

### Technical Requirements

**Backend `SyncStatusResponse` changes** (`api.types.ts`):
```typescript
export interface SyncStatusResponse {
  lastSyncedAt: string | null
  status: 'idle' | 'syncing' | 'success' | 'error' | 'partial'  // ADD 'partial'
  itemCount: number | null
  errorMessage: string | null
  errorCode: string | null
  itemsSynced: number | null     // ADD — count of successfully synced items
  itemsFailed: number | null     // ADD — count of items that failed to transform
}
```

**New types in `linear-transformers.ts`:**
```typescript
export interface TransformFailure {
  issueId: string
  identifier: string
  error: string
}

export interface TransformResult {
  items: BacklogItemDto[]
  failures: TransformFailure[]
}
```

**Resilient transformer pattern** (`linear-transformers.ts`):
```typescript
export async function toBacklogItemDtosResilient(
  issues: Issue[],
  concurrency = 5,
): Promise<TransformResult> {
  const items: BacklogItemDto[] = []
  const failures: TransformFailure[] = []

  for (let i = 0; i < issues.length; i += concurrency) {
    const batch = issues.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map(toBacklogItemDto))

    settled.forEach((result, idx) => {
      const issue = batch[idx]
      if (result.status === 'fulfilled') {
        items.push(result.value)
      } else {
        failures.push({
          issueId: issue.id,
          identifier: issue.identifier,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        })
      }
    })
  }

  return { items, failures }
}
```

**Key pattern: Use `Promise.allSettled` instead of `Promise.all`.** This is the standard JS pattern for continuing processing when individual promises reject.

**SyncService `runSync()` partial handling:**
```typescript
// After fetching all issues:
const { items: dtos, failures } = await toBacklogItemDtosResilient(allIssues)

if (dtos.length === 0 && failures.length > 0) {
  // ALL items failed — treat as error, preserve previous cache
  this.syncStatus = { ...this.syncStatus, status: 'error', errorCode: 'SYNC_PARTIAL_SUCCESS', ... }
  return
}

const sorted = sortBacklogItems(dtos)
this.cachedItems = sorted  // Replace cache with successful items

if (failures.length > 0) {
  // Partial success
  this.syncStatus = {
    lastSyncedAt: new Date().toISOString(),
    status: 'partial',
    itemCount: sorted.length,
    itemsSynced: sorted.length,
    itemsFailed: failures.length,
    errorCode: 'SYNC_PARTIAL_SUCCESS',
    errorMessage: `${failures.length} item(s) failed to sync`,
  }
} else {
  // Full success (existing path)
  this.syncStatus = { ..., status: 'success', itemsSynced: sorted.length, itemsFailed: 0, ... }
}
```

### Architecture Compliance

- **Singleton pattern:** No new singletons. Changes are to existing `syncService` singleton.
- **Routes → Controllers → Services:** No routing changes. Status endpoint already returns `getStatus()`.
- **Error classification taxonomy:** New code `SYNC_PARTIAL_SUCCESS` follows existing pattern in `sync-error-classifier.ts`.
- **Frontend error message mapping:** New `SYNC_PARTIAL_SUCCESS` entry follows existing pattern in `sync-error-messages.ts`.
- **Chakra UI v3 compound components:** Continue using `Alert.Root`, `Alert.Title`, `Alert.Description`, `Alert.Indicator`.
- **TanStack Query v5:** No changes to query hooks — existing `useSyncStatus` already polls and returns status. Frontend just needs to handle the new `'partial'` status value.

### Library & Framework Requirements

- **No new dependencies.** All changes use existing libraries.
- **`Promise.allSettled`:** Native ES2020+ API, supported in Node 20+ and all modern browsers. No polyfill needed.
- **Pino logging:** Use `logger.warn()` for individual transform failures (not `error` — they're expected partial failures, not system errors).

### Testing Requirements

**Backend tests — co-located, vitest:**

1. `linear-transformers.test.ts`:
   - Test `toBacklogItemDtosResilient` with all items succeeding → `failures` is empty
   - Test with one item throwing → `items` contains rest, `failures` has 1 entry with correct `issueId`/`identifier`
   - Test with all items failing → `items` is empty, `failures` has all entries
   - Test failure captures error message correctly

2. `sync.service.test.ts`:
   - Test partial failure: mock `toBacklogItemDtosResilient` returning mix → status is `'partial'`, counts correct
   - Test all-fail: mock returning zero items + failures → status is `'error'`
   - Test cache replacement on partial: cached items update to successful subset
   - Test `getStatus()` includes `itemsSynced`/`itemsFailed` fields
   - Verify existing tests still pass (add `itemsSynced: null, itemsFailed: null` to default status assertions)

3. `sync-error-classifier.test.ts`:
   - Verify `SYNC_PARTIAL_SUCCESS` exists in `SYNC_ERROR_CODES`

**Frontend tests — co-located, vitest + React Testing Library:**

4. `sync-status-indicator.test.tsx`:
   - Test partial status renders yellow dot (not green/red)
   - Test partial status shows warning text about partial sync
   - Test partial status with `itemsFailed` count displayed

5. `sync-control.test.tsx`:
   - Test transition from `syncing` → `partial` shows warning alert
   - Test partial alert shows items synced/failed counts
   - Test partial alert shows error code `SYNC_PARTIAL_SUCCESS`

6. `sync-error-messages.test.ts`:
   - Test `getUserFriendlyErrorMessage('SYNC_PARTIAL_SUCCESS')` returns correct title/description/guidance

**Mock pattern:** Use `vi.hoisted()` + `vi.mock()` for module mocking (established pattern from Story 6.1+).

### Previous Story Intelligence

**From Story 6.4 (Sync Error Handling):**
- Error classification is backend-only; frontend maps codes to user messages
- `errorCode` was added to both `SyncStatusResponse` and frontend `SyncStatus`
- All existing test fixtures need `errorCode: null` — similarly, new fields `itemsSynced`/`itemsFailed` must be added as `null` to all existing test fixtures to avoid TypeScript errors
- Review flagged: backlog polling at 60s means errors may take up to 60s to appear — same applies to partial status

**From Story 6.5 (API Unavailability):**
- Graceful degradation pattern: backend returns empty paginated response instead of 500
- Cache fallback: preserve stale data when live fetch fails
- Frontend shows cached data even when refetch fails (`keepPreviousData` / stale-while-revalidate)
- "Refresh data" button invalidates TanStack Query cache, NOT a sync trigger
- Platform dependency issue (`@swc/core-darwin-arm64`) was cleaned up — don't re-introduce

**From Story 6.1 (Automatic Sync):**
- `vi.hoisted()` required for vitest module mocking — follow this pattern
- Pagination loop: fetch 50 items per page, follow `hasNextPage`/`endCursor`
- Idempotent guard: skip if already syncing — applies to partial failures too (don't double-sync)

### Git Intelligence

Recent commits follow pattern: `feat: description (VIX-XXX)`.
Branch naming: `rhunnicutt/issue-6-6-handle-partial-sync-failures`.
Current test counts: ~470 backend, ~252 frontend. All must continue passing.

### References

- [Source: backend/src/services/sync/sync.service.ts] — SyncService class, runSync(), cache management
- [Source: backend/src/services/sync/linear-transformers.ts#toBacklogItemDtos] — Current batch transform (lines 478-491), vulnerable to single-item failure
- [Source: backend/src/services/sync/sync-error-classifier.ts] — Error code taxonomy
- [Source: backend/src/types/api.types.ts#SyncStatusResponse] — Backend status type (needs 'partial')
- [Source: frontend/src/features/backlog/types/backlog.types.ts#SyncStatus] — Frontend status type (needs 'partial')
- [Source: frontend/src/utils/sync-error-messages.ts] — Error code → user message mapping
- [Source: frontend/src/features/backlog/components/sync-status-indicator.tsx] — User-facing status display
- [Source: frontend/src/features/admin/components/sync-control.tsx] — Admin sync panel
- [Source: _bmad-output/planning-artifacts/epics.md#Epic6-Story6.6] — Original requirements

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- **Task 1**: Added `'partial'` to `SyncStatusResponse.status` union; added `itemsSynced`/`itemsFailed` fields; added `SYNC_PARTIAL_SUCCESS` to `SYNC_ERROR_CODES`. Updated all existing test fixtures (sync.controller.test.ts, sync.routes.test.ts) to include new fields with `null` defaults.
- **Task 2**: Created `TransformFailure` and `TransformResult` types. Implemented `toBacklogItemDtosResilient()` using `Promise.allSettled` pattern to isolate individual transform failures. Logs each failure at `warn` level with Pino.
- **Task 3**: Replaced `toBacklogItemDtos` call with `toBacklogItemDtosResilient` in `runSync()`. Handles three paths: all-fail (error status, preserve cache), partial (partial status, replace cache with successful subset), full success. Added `getLastTransformFailures()` for admin visibility. Updated all existing sync.service.test.ts mocks.
- **Task 4**: Mirrored backend type changes in frontend `SyncStatus` type. Updated all frontend test fixtures across 5 test files.
- **Task 5**: Added `SYNC_PARTIAL_SUCCESS` entry to `ERROR_MESSAGES` with user-friendly "Synced with warnings" text.
- **Task 6**: Added `'partial'` handling to `getStatusDotColor()` returning `yellow.500`. Added rendering branch showing yellow dot + "Synced with warnings" + failed item count.
- **Task 7**: Added `showPartialAlert` state and transition detection in `SyncControl`. Added warning alert with synced/failed counts and error code.
- **Task 8**: Added 15 backend tests (6 transformer resilience, 8 sync service partial handling, 1 error classifier). Added 8 frontend tests (4 indicator partial status, 3 sync control partial alert, 1 error message mapping). All 505 backend + 264 frontend tests pass.
- **Code Review Fixes (AI)**: Corrected all-items-fail error classification to `SYNC_TRANSFORM_FAILED` (so error UI doesn’t incorrectly show partial-success messaging), reset `itemsSynced/itemsFailed` during `syncing` to avoid stale-count leakage, and truncated stored transform failure details in-memory (counts remain accurate).

### Change Log

- 2026-02-10: Implemented Story 6.6 — Handle Partial Sync Failures. Added resilient transformer using `Promise.allSettled`, partial sync status handling with `itemsSynced`/`itemsFailed` tracking, frontend yellow warning indicators, and admin panel partial success alerts. 23 new tests added, 0 regressions.
- 2026-02-10: Code review fixes — added `SYNC_TRANSFORM_FAILED`, corrected error-code semantics for all-transform-fail case, reset sync counts during `syncing`, and updated tests/mappings accordingly.

### File List

**Backend (modified):**
- backend/src/types/api.types.ts
- backend/src/services/sync/sync-error-classifier.ts
- backend/src/services/sync/sync-error-classifier.test.ts
- backend/src/services/sync/linear-transformers.ts
- backend/src/services/sync/sync.service.ts
- backend/src/services/sync/sync.service.test.ts
- backend/src/services/sync/linear-transformers.test.ts
- backend/src/controllers/sync.controller.test.ts
- backend/src/routes/sync.routes.test.ts
- backend/src/services/backlog/backlog.service.ts
- backend/src/services/backlog/backlog.service.test.ts

**Frontend (modified):**
- frontend/src/features/backlog/types/backlog.types.ts
- frontend/src/utils/sync-error-messages.ts
- frontend/src/utils/sync-error-messages.test.ts
- frontend/src/features/backlog/components/sync-status-indicator.tsx
- frontend/src/features/admin/components/sync-control.tsx
- frontend/src/features/backlog/components/sync-status-indicator.test.tsx
- frontend/src/features/admin/components/sync-control.test.tsx
- frontend/src/features/backlog/components/backlog-list.tsx
- frontend/src/features/backlog/components/backlog-list.test.tsx
- frontend/src/features/backlog/components/business-unit-filter.test.tsx
- frontend/src/features/backlog/components/sort-control.test.tsx
- frontend/src/features/backlog/hooks/use-sync-status.test.tsx
- frontend/src/features/admin/hooks/use-sync-status.test.tsx
- frontend/src/features/admin/hooks/use-sync-trigger.test.tsx

**Other:**
- _bmad-output/implementation-artifacts/sprint-status.yaml
- package-lock.json
