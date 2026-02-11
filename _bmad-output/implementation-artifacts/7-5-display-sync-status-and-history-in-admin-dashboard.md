# Story 7.5: Display Sync Status and History in Admin Dashboard

Linear Issue ID: VIX-365
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to view sync status and history,
so that I can monitor sync health and troubleshoot issues.

## Acceptance Criteria

1. **Given** I am an admin user, **When** I view the Sync tab in the admin dashboard, **Then** I see: last sync time, current sync status (success/failure/partial), and a sync history list
2. **And** the sync history list shows at least: timestamp, status, duration, items synced, and errors (if present)
3. **And** I can trigger a manual sync from this section
4. **And** failed syncs show error details (admin-facing, not user-facing)
5. **And** the UI uses clear color coding: green (success), red (failure), yellow (partial)
6. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
7. **And** unit tests cover new backend endpoints/service logic and the updated admin UI

## Tasks / Subtasks

- [x] Task 1: Define sync history API contract + frontend types (AC: #1, #2, #5)
  - [x] 1.1: Add backend type(s) in `backend/src/types/api.types.ts` (or a new `backend/src/types/sync-history.types.ts`) for:
    - `SyncHistoryStatus = 'syncing' | 'success' | 'error' | 'partial'`
    - `SyncTriggerType = 'scheduled' | 'manual' | 'startup'`
    - `SyncHistoryEntry` (camelCase fields; ISO 8601 timestamps)
  - [x] 1.2: Add matching frontend type(s) in `frontend/src/features/admin/types/admin.types.ts` (or a new `sync-history.types.ts`)
  - [x] 1.3: Confirm all JSON fields are `camelCase` and use `null` (not `undefined`) per project rules

- [x] Task 2: Implement backend sync history data access (AC: #1, #2, #4)
  - [x] 2.1: Create `backend/src/services/sync/sync-history.service.ts`
  - [x] 2.2: Implement `createSyncHistoryEntry()`:
    - Inserts into `sync_history` with `status='syncing'`, `trigger_type`, `triggered_by` (nullable), `started_at=NOW()`
    - Returns the inserted `id`
  - [x] 2.3: Implement `completeSyncHistoryEntry()`:
    - Updates `sync_history` row by `id` with: `status`, `completed_at`, `duration_ms`, `items_synced`, `items_failed`, `error_message`, `error_details`
    - Preserve `error_details` as JSON (e.g., `{ errorCode, errorMessage, raw?: ... }`) but ensure no secrets are stored
  - [x] 2.4: Implement `listSyncHistory({ limit })`:
    - Query newest-first: `ORDER BY started_at DESC`
    - Default limit: 50; max limit: 200 (guard against huge responses)
    - Returns `SyncHistoryEntry[]` with `camelCase` mapping
  - [x] 2.5: Create `backend/src/services/sync/sync-history.service.test.ts` using the existing pattern (mock `query` and `pool.connect()` like `user.service.test.ts`)

- [x] Task 3: Persist sync runs into `sync_history` from SyncService (AC: #1, #2, #4)
  - [x] 3.1: Update `backend/src/services/sync/sync.service.ts` to accept optional metadata:
    - `runSync(options?: { triggerType?: 'scheduled' | 'manual' | 'startup'; triggeredBy?: number | null }): Promise<void>`
  - [x] 3.2: At the start of `runSync()`:
    - Create a `sync_history` row via `createSyncHistoryEntry({ triggerType, triggeredBy })`
    - Store the returned `historyId` locally for completion update
  - [x] 3.3: On success:
    - Update the row via `completeSyncHistoryEntry({ id: historyId, status: 'success', completedAt, durationMs, itemsSynced })`
  - [x] 3.4: On error:
    - Reuse existing `classifySyncError()` to get `errorCode` + sanitized `errorMessage`
    - Update the row via `completeSyncHistoryEntry({ id: historyId, status: 'error', completedAt, durationMs, errorMessage, errorDetails: { errorCode } })`
    - **CRITICAL**: preserve current behavior: keep previous cached items (stale data > no data)
  - [x] 3.5: Ensure the in-memory `syncStatus` still behaves exactly as today (`idle → syncing → success|error`), but add **history** persistence in parallel
  - [x] 3.6: Update `backend/src/services/sync/sync.service.test.ts`:
    - Mock `sync-history.service.ts` and verify create+complete calls happen for success + error
    - Verify `triggerType` passed for manual/scheduled flows

- [x] Task 4: Attach correct trigger types (scheduled vs manual) (AC: #2, #3)
  - [x] 4.1: Update scheduler calls in `backend/src/services/sync/sync-scheduler.service.ts`:
    - Cron tick: `syncService.runSync({ triggerType: 'scheduled', triggeredBy: null })`
    - Startup initial sync: `syncService.runSync({ triggerType: 'startup', triggeredBy: null })`
  - [x] 4.2: Create an admin-protected manual trigger endpoint (recommended) so `triggered_by` is captured:
    - Add `POST /api/admin/sync/trigger` (requires `requireAuth`, `requireApproved`, `requireAdmin`)
    - Handler reads `adminId = Number(req.session.userId)` and calls `syncService.runSync({ triggerType: 'manual', triggeredBy: adminId })`
    - Return `202` with `syncService.getStatus()` (same semantics as existing `/api/sync/trigger`)
  - [x] 4.3: Keep existing `/api/sync/trigger` behavior for non-breaking compatibility; it can call `runSync({ triggerType: 'manual', triggeredBy: null })`

- [x] Task 5: Add backend endpoint to list sync history for admins (AC: #1, #2, #4)
  - [x] 5.1: Add `GET /api/admin/sync/history` route in `backend/src/routes/admin.routes.ts`
  - [x] 5.2: Add controller handler in `backend/src/controllers/admin.controller.ts` (or a new admin-sync controller file):
    - Accept optional `?limit=` query param
    - Validate as integer; clamp to \([1, 200]\)
    - Call `listSyncHistory({ limit })`
    - `res.json(history)` (direct array, no wrapper)
  - [x] 5.3: Add integration tests similar to existing admin route/controller tests:
    - `backend/src/controllers/admin.controller.test.ts`
    - `backend/src/routes/admin.routes.test.ts`

- [x] Task 6: Add frontend hook to fetch sync history (AC: #1, #2)
  - [x] 6.1: Create `frontend/src/features/admin/hooks/use-sync-history.ts`
  - [x] 6.2: TanStack Query fetching `GET /api/admin/sync/history` with `credentials: 'include'`
  - [x] 6.3: Return `{ history, isLoading, error, refetch }`
  - [x] 6.4: Add `frontend/src/features/admin/hooks/use-sync-history.test.tsx` (mock `fetch`, verify endpoint + error handling)

- [x] Task 7: Render sync history list in Sync tab (AC: #1, #2, #4, #5)
  - [x] 7.1: Extend `frontend/src/features/admin/components/sync-control.tsx` to include a “Sync History” section below the existing status/alerts
  - [x] 7.2: Implement a table UI using Chakra UI v3 `Table` compound components:
    - `Table.Root` + `Table.Header` + `Table.Body` + `Table.Row` + `Table.ColumnHeader` + `Table.Cell`
    - Wrap with `Table.ScrollArea` if needed for overflow
  - [x] 7.3: Columns (minimum):
    - **Started** (relative time + exact timestamp tooltip)
    - **Status** (Badge color-coded: green success, red error, yellow partial, blue/gray syncing)
    - **Duration** (ms → human-friendly, e.g. “2.1s”)
    - **Items** (itemsSynced; optionally “X failed” if itemsFailed > 0)
    - **Error** (only for error/partial rows; show errorCode + errorMessage)
  - [x] 7.4: Ensure admin-only error detail visibility stays in admin UI (do not reuse this component in backlog pages)
  - [x] 7.5: Add tests in `frontend/src/features/admin/components/sync-control.test.tsx`:
    - History renders rows
    - Status badges color-code correctly
    - Error details appear for failed rows only

- [x] Task 8: Build + test verification (AC: #6, #7)
  - [x] 8.1: Run `npm run build` in `backend/`
  - [x] 8.2: Run `npm run test:run` in `backend/`
  - [x] 8.3: Run `npm run build` in `frontend/`
  - [x] 8.4: Run `npm run test:run` in `frontend/`

## Dev Notes

### What’s Already Done (relevant existing implementation)

- **Admin dashboard Sync tab exists**: `frontend/src/features/admin/components/admin-page.tsx` renders `<SyncControl />` under the `sync` tab.
- **Sync status + trigger already implemented**:
  - Backend:
    - `GET /api/sync/status`: `backend/src/routes/sync.routes.ts`, `backend/src/controllers/sync.controller.ts`
    - `POST /api/sync/trigger`: `backend/src/routes/sync.routes.ts`, `backend/src/controllers/sync.controller.ts`
    - In-memory orchestration: `backend/src/services/sync/sync.service.ts`
    - Scheduler: `backend/src/services/sync/sync-scheduler.service.ts`
  - Frontend:
    - `useSyncStatus`: `frontend/src/features/admin/hooks/use-sync-status.ts`
    - `useSyncTrigger`: `frontend/src/features/admin/hooks/use-sync-trigger.ts`
    - UI: `frontend/src/features/admin/components/sync-control.tsx`
- **Database schema for history already exists**:
  - `sync_history` migration: `database/migrations/004_create-sync-history-table.sql`
  - **CRITICAL**: current code does **not** write to `sync_history` yet (this story adds that)

### Database Schema (sync_history)

From `database/migrations/004_create-sync-history-table.sql`:

- `status` (VARCHAR) — currently default `pending`; this story should standardize values to a small set (`syncing`, `success`, `error`, `partial`)
- `trigger_type` (VARCHAR) — store `scheduled`, `manual`, or `startup`
- `triggered_by` (INTEGER, nullable) — FK to `users(id)`; use `NULL` for scheduled/startup sync
- `started_at`, `completed_at`, `duration_ms`
- `items_synced`, `items_failed`
- `error_message`, `error_details` (JSONB)

### UX / UI Guardrails

- **Make it scannable**: Admins should be able to answer “is sync healthy?” in seconds (UX: “trust through transparency”).
- **Color isn’t the only signal**: always show status text + badge; color is supplemental (accessibility).
- **Performance**: history list should load quickly; default 50 rows.

### Architecture Compliance

- **Backend layering**: Routes → Controllers → Services (`backend/src/routes/*` → `backend/src/controllers/*` → `backend/src/services/*`)
- **DB access**: Use `backend/src/utils/database.ts` (`query`, `pool`) and parameterized SQL only
- **API shapes**: Success responses return data directly (arrays are arrays); errors use `{ error: { message, code } }`
- **JSON naming**: `camelCase` fields in API responses; `snake_case` in DB

### Testing Patterns to Follow

- Backend DB services use mocked `query`/`pool.connect()` in unit tests (see `backend/src/services/users/user.service.test.ts`).
- Frontend tests use `vitest` + `@testing-library/react` and mock hooks/fetch (see `sync-control.test.tsx` and existing admin hooks tests).

### What NOT To Do

- **Do NOT** add new dependencies just to format tables/dates; use existing `formatRelativeTime()` / `formatDateTime()` from `frontend/src/utils/formatters.ts`.
- **Do NOT** expose admin-only error details in non-admin pages/APIs.
- **Do NOT** change the existing `/api/sync/status` response shape (beyond what already exists) in a breaking way.
- **Do NOT** store secrets in `sync_history.error_details` (e.g., tokens, headers, raw Linear payloads).
- **Do NOT** build a “log viewer” UI; keep it a simple history list with the required fields.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 7, Story 7.5] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/prd.md#FR22] — Admin can view sync status and history
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2: IT Lead Sync Management] — Sync management UX expectations
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — sync history in PostgreSQL, patterns for services/routes
- [Source: database/migrations/004_create-sync-history-table.sql] — sync_history schema
- [Source: backend/src/services/sync/sync.service.ts] — runSync(), in-memory status/caching behavior
- [Source: backend/src/controllers/sync.controller.ts] — existing status + trigger semantics (202/409)
- [Source: frontend/src/features/admin/components/sync-control.tsx] — current Sync tab UI to extend
- [Source: https://chakra-ui.com/docs/components/table] — Chakra UI v3 `Table.Root` compound-component pattern

## Dev Agent Record

### Agent Model Used

Claude 4.6 Opus (Cursor Agent)

### Completion Notes List

- Ultimate context engine created: planning artifacts + existing codebase patterns + DB schema reviewed; story includes concrete file paths, API contracts, and test guidance.
- **Task 1**: Defined `SyncHistoryStatus`, `SyncTriggerType`, and `SyncHistoryEntry` types in both backend (`api.types.ts`) and frontend (`admin.types.ts`). All fields use camelCase with null (not undefined).
- **Task 2**: Created `sync-history.service.ts` with `createSyncHistoryEntry`, `completeSyncHistoryEntry`, and `listSyncHistory` functions. Full test coverage with 14 unit tests mocking `query` and `pool.connect`.
- **Task 3**: Integrated sync history persistence into `SyncService.runSync()`. History entry created at start, completed on success/error. In-memory `syncStatus` behavior preserved. 22 tests pass including new history verification.
- **Task 4**: Updated `sync-scheduler.service.ts` to pass `triggerType: 'scheduled'`/`'startup'`. Created admin-protected `POST /api/admin/sync/trigger` endpoint capturing `triggeredBy` admin ID. Kept existing `/api/sync/trigger` for backward compatibility.
- **Task 5**: Added `GET /api/admin/sync/history` route with optional `?limit=` param (clamped 1–200, default 50). Controller + integration tests added. Fixed rate-limiter exhaustion issue in integration tests by caching auth cookies.
- **Task 6**: Created `useSyncHistory` TanStack Query hook with 30s stale time. 5 unit tests covering success, loading, error, and refetch scenarios.
- **Task 7**: Extended `SyncControl` component with a "Sync History" section using Chakra UI v3 Table components. Color-coded status badges (green/red/yellow/blue), duration formatting, error detail display. 10 new tests added.
- **Task 8**: Both `backend` and `frontend` build with zero TypeScript errors. All 352 backend tests and 331 frontend tests pass (683 total).

### Change Log

- 2026-02-10: Implemented full sync history feature — backend persistence, admin API endpoints, frontend data fetching hook, and admin dashboard UI with color-coded history table.
- 2026-02-11: Code review fixes — admin “Sync Now” now uses `POST /api/admin/sync/trigger` so `triggeredBy` is captured; sync history DB row mapping hardened for timestamp/JSON parsing edge cases.

### File List

**New files:**
- `backend/src/services/sync/sync-history.service.ts`
- `backend/src/services/sync/sync-history.service.test.ts`
- `frontend/src/features/admin/types/admin.types.ts`
- `frontend/src/features/admin/hooks/use-sync-history.ts`
- `frontend/src/features/admin/hooks/use-sync-history.test.tsx`

**Modified files:**
- `backend/src/types/api.types.ts`
- `backend/src/services/sync/sync.service.ts`
- `backend/src/services/sync/sync.service.test.ts`
- `backend/src/services/sync/sync-scheduler.service.ts`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/controllers/admin.controller.test.ts`
- `backend/src/controllers/sync.controller.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/routes/admin.routes.test.ts`
- `frontend/src/features/admin/components/sync-control.tsx`
- `frontend/src/features/admin/components/sync-control.test.tsx`
- `frontend/src/features/admin/hooks/use-sync-trigger.ts`
- `frontend/src/features/admin/hooks/use-sync-trigger.test.tsx`

## Senior Developer Review (AI)

### Outcome

- **Status**: Changes applied (no blockers remain)

### Findings addressed

1. **Admin trigger attribution**: Admin UI previously called the non-admin sync trigger endpoint, which would not capture `triggeredBy` for `sync_history`. Fixed by using `POST /api/admin/sync/trigger` with `credentials: 'include'` and invalidating `admin-sync-history` on success.
2. **DB row parsing robustness**: `sync-history.service.ts` previously assumed timestamp fields were `Date` instances and that `error_details` was always an object. Hardened mapping to safely coerce timestamps/ints and parse JSON strings.

### Verification

- `backend/`: `npm run build` ✅, `npm run test:run` ✅
- `frontend/`: `npm run build` ✅, `npm run test:run` ✅

