# Story 15.3: Personalized "What's New" Badge with Per-User Seen Tracking

Linear Issue ID: VIX-436
Status: done

## Story

As a business user,
I want to see a persistent count of new/unseen items in the header,
and have items I've viewed marked as "seen" so the count decreases,
so that I always know when there's something new to check and have a reason to come back regularly.

## Acceptance Criteria

1. **Given** I log into the app, **When** I look at the header/nav area, **Then** I see a badge showing the count of items I haven't seen yet (e.g., "5 new").
2. **Given** there are unseen items, **When** I scroll past them in the list or open their detail view, **Then** they are marked as "seen" and the badge count decrements.
3. **Given** I have seen all items, **When** I look at the header, **Then** the badge is hidden or shows "0" in a muted style.
4. **Given** a new item is added to the backlog (via sync), **When** I next visit, **Then** it appears as unseen and the badge count reflects it.
5. **Given** I click the badge, **When** the filter is applied, **Then** the list filters to show only unseen items.
6. Seen state must persist across sessions (not just in-memory).
7. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [x] Task 1: Backend — Add `last_seen_at` timestamp to users table (AC: #6)
  - [x] Create database migration: `ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP`
  - [x] Default to `NULL` (all items are "unseen" for first-time users)
  - [x] Update `UserService` to expose `last_seen_at` in user profile data
- [x] Task 2: Backend — Add seen tracking API endpoints (AC: #1, #2, #6)
  - [x] `GET /api/users/unseen-count` — returns `{ unseenCount: number, lastSeenAt: string | null }` (keeps `/api/user/unseen-count` as alias)
  - [x] Query: count backlog items where `created_at > user.last_seen_at` (or all items if `last_seen_at` is null)
  - [x] `POST /api/users/mark-seen` — updates `last_seen_at` to current timestamp (keeps `/api/user/mark-seen` as alias)
  - [x] Requires authentication (use existing auth middleware)
- [x] Task 3: Frontend — Create `UnseenBadge` component (AC: #1, #3, #5)
  - [x] Create `frontend/src/shared/components/unseen-badge.tsx`
  - [x] Fetch unseen count from `/api/user/unseen-count` using TanStack Query
  - [x] Display count as a Chakra `Badge` in the app header
  - [x] When count > 0: show colored badge (e.g., `colorScheme="blue"`)
  - [x] When count = 0: hide badge or show muted "0"
  - [x] On click: toggle "show unseen only" filter on the backlog list
- [x] Task 4: Frontend — Mark items as seen on view (AC: #2, #4)
  - [x] Create `frontend/src/features/backlog/hooks/use-mark-seen.ts`
  - [x] When user opens the backlog page, call `POST /api/user/mark-seen` after a brief delay (e.g., 2 seconds)
  - [x] This updates `last_seen_at` to "now," so next time the user visits, only items created after this timestamp are "unseen"
  - [x] Invalidate the unseen count query after marking seen
  - [x] Alternative: use Intersection Observer to mark on scroll (Phase 2 enhancement)
- [x] Task 5: Integrate badge into `AppHeader` (AC: #1)
  - [x] Add `UnseenBadge` to `frontend/src/shared/components/layout/app-header.tsx`
  - [x] Position next to navigation or page title
  - [x] Ensure badge is visible and not clipped on all screen sizes
- [x] Task 6: Write tests (AC: #7)
  - [x] Backend: Test `GET /api/user/unseen-count` returns correct count
  - [x] Backend: Test `POST /api/user/mark-seen` updates timestamp
  - [x] Frontend: Test `UnseenBadge` renders count when > 0
  - [x] Frontend: Test `UnseenBadge` hides when count = 0
  - [x] Frontend: Test clicking badge toggles filter
  - [x] Frontend: Test `useMarkSeen` calls API and invalidates query

## Dev Notes

### Architecture Compliance

- **Backend**: New endpoints in `backend/src/routes/` with controller/service pattern. Follow existing `auth.routes.ts` → `auth.controller.ts` → `auth.service.ts` layering.
- **Database**: Use existing migration pattern. Check `database/` folder for migration file conventions.
- **Frontend**: TanStack Query for API state, feature-based hook in `hooks/`, shared component in `shared/components/`.
- **Auth**: Endpoints require authenticated user. Use existing `authMiddleware` from `backend/src/middleware/auth.middleware.ts`.

### Critical Implementation Details

- **Simple timestamp approach (Phase 1)**: Store a single `last_seen_at` timestamp per user. Items created after that timestamp are "unseen." When the user visits the backlog, update the timestamp. This is the simplest approach and sufficient for MVP.
- **Database query**: `SELECT COUNT(*) FROM backlog_items WHERE created_at > $1` (where `$1` is the user's `last_seen_at`). If `last_seen_at` is NULL, count all items.
- **User table**: Check `backend/src/config/database.config.ts` or migration files for the exact users table schema. The `last_seen_at` column should be nullable timestamp.
- **TanStack Query**: Use `useQuery` for the unseen count with a reasonable `staleTime` (30 seconds). Use `useMutation` for marking seen, with `onSuccess` calling `queryClient.invalidateQueries({ queryKey: ['unseen-count'] })`.
- **Backlog item timestamps**: The `BacklogItem` model should already have `createdAt` from Linear sync. Verify the field name in `backlog.types.ts`.
- **Header integration**: `AppHeader` is at `frontend/src/shared/components/layout/app-header.tsx`. Add the badge next to existing header elements.

### Existing Code to Reuse

- Auth middleware at `backend/src/middleware/auth.middleware.ts` — protect new endpoints
- User service at `backend/src/services/users/user.service.ts` — extend with `last_seen_at` operations
- Database utility at `backend/src/utils/database.ts` — query execution pattern
- TanStack Query patterns from `use-backlog-items.ts` — useQuery/useMutation patterns
- `AppHeader` at `frontend/src/shared/components/layout/app-header.tsx` — badge placement
- Chakra `Badge` component — for the count display

### Anti-Patterns to Avoid

- Do NOT track individual item seen state in Phase 1 — use the simple timestamp approach
- Do NOT call `mark-seen` on every render — use a debounced/delayed call (2s after page load)
- Do NOT store seen state only in localStorage — it needs to be server-side for cross-device consistency
- Do NOT create a separate database table for Phase 1 — a single column on `users` is sufficient
- Do NOT block page rendering while fetching unseen count — load it asynchronously

### Project Structure Notes

**New files:**
- `backend/src/routes/user.routes.ts` (or extend existing auth routes)
- `frontend/src/shared/components/unseen-badge.tsx`
- `frontend/src/features/backlog/hooks/use-mark-seen.ts`
- Database migration file

**Modified files:**
- `backend/src/services/users/user.service.ts` (add last_seen_at operations)
- `backend/src/routes/index.ts` (register new routes)
- `frontend/src/shared/components/layout/app-header.tsx` (add UnseenBadge)

### References

- [Source: backend/src/middleware/auth.middleware.ts] — Authentication middleware pattern
- [Source: backend/src/services/users/user.service.ts] — User service, database operations
- [Source: backend/src/utils/database.ts] — Database query utility
- [Source: frontend/src/features/backlog/hooks/use-backlog-items.ts] — TanStack Query patterns
- [Source: frontend/src/shared/components/layout/app-header.tsx] — Header component for badge placement
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem type with createdAt field
- [Source: _bmad-output/planning-artifacts/architecture.md] — Layer architecture, TanStack Query, PostgreSQL

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

None — clean implementation, no blocking issues.

### Completion Notes List

- Implemented simple timestamp-based "What's New" tracking per the Phase 1 approach
- Added `last_seen_at` TIMESTAMPTZ column to users table via migration 012
- Backend: Two new endpoints (`GET /api/user/unseen-count`, `POST /api/user/mark-seen`) following existing routes → controller → service pattern
- Backend: Added plural REST routes (`GET /api/users/unseen-count`, `POST /api/users/mark-seen`) while keeping the original singular paths as aliases
- Frontend: `UnseenBadge` component in app header shows count of unseen items, clickable to filter
- Frontend: `useMarkSeen` marks items seen 2 seconds after *meaningful interaction* (first scroll or opening an item detail), preventing the unseen-only view from instantly clearing itself
- Frontend: `useUnseenCount` TanStack Query hook with 30s stale time for responsive badge updates
- Added `showUnseenOnly` filter param to `useFilterParams` with URL sync (`?unseen=1`)
- Extended `EmptyStateWithGuidance` to handle unseen-only empty state messaging
- All existing tests pass (787 frontend, 1211+ backend src tests)
- New tests: 12 (4 backend service, 4 unseen-count hook, 5 unseen-badge component, 3 mark-seen hook)
- `npm run build` passes with zero TypeScript errors in both backend and frontend

### Change Log

- 2026-02-17: Implemented VIX-436 — Personalized "What's New" badge with per-user seen tracking
- 2026-02-17: Senior dev review fixes — preserve filter params, interaction-based mark-seen, plural `/api/users/*` aliases, hardened unseen comparisons

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-17_

### Summary

- Adjusted seen tracking so it’s triggered by **actual user interaction** (scrolling the list or opening an item detail) instead of firing automatically on page load.
- Preserved existing URL params when enabling the unseen-only filter from the badge.
- Standardized to plural REST paths under `/api/users/*` while keeping the original `/api/user/*` paths as backwards-compatible aliases.
- Verified `npm run test:run` and `npm run build` pass.

### File List

**New files:**
- `database/migrations/012_add-last-seen-at-to-users.sql`
- `backend/src/controllers/user.controller.ts`
- `backend/src/routes/user.routes.ts`
- `frontend/src/shared/components/unseen-badge.tsx`
- `frontend/src/shared/components/unseen-badge.test.tsx`
- `frontend/src/features/backlog/hooks/use-unseen-count.ts`
- `frontend/src/features/backlog/hooks/use-unseen-count.test.tsx`
- `frontend/src/features/backlog/hooks/use-mark-seen.ts`
- `frontend/src/features/backlog/hooks/use-mark-seen.test.tsx`

**Modified files:**
- `backend/src/services/users/user.service.ts` (added getUnseenCount, markSeen)
- `backend/src/services/users/user.service.test.ts` (added tests for getUnseenCount, markSeen)
- `backend/src/routes/index.ts` (registered userRoutes in protected router)
- `frontend/src/shared/components/layout/app-header.tsx` (added UnseenBadge)
- `frontend/src/features/backlog/hooks/use-filter-params.ts` (added showUnseenOnly)
- `frontend/src/features/backlog/components/backlog-list.tsx` (unseen filter + useMarkSeen)
- `frontend/src/features/backlog/components/empty-state-with-guidance.tsx` (unseen empty state)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status: in-progress → review)
- `_bmad-output/implementation-artifacts/15-3-whats-new-badge-with-seen-tracking.md` (this file)
