# Story 15.3: Personalized "What's New" Badge with Per-User Seen Tracking

Linear Issue ID: VIX-436
Status: ready-for-dev

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

- [ ] Task 1: Backend — Add `last_seen_at` timestamp to users table (AC: #6)
  - [ ] Create database migration: `ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP`
  - [ ] Default to `NULL` (all items are "unseen" for first-time users)
  - [ ] Update `UserService` to expose `last_seen_at` in user profile data
- [ ] Task 2: Backend — Add seen tracking API endpoints (AC: #1, #2, #6)
  - [ ] `GET /api/user/unseen-count` — returns `{ unseenCount: number, lastSeenAt: string | null }`
  - [ ] Query: count backlog items where `created_at > user.last_seen_at` (or all items if `last_seen_at` is null)
  - [ ] `POST /api/user/mark-seen` — updates `last_seen_at` to current timestamp
  - [ ] Requires authentication (use existing auth middleware)
- [ ] Task 3: Frontend — Create `UnseenBadge` component (AC: #1, #3, #5)
  - [ ] Create `frontend/src/shared/components/unseen-badge.tsx`
  - [ ] Fetch unseen count from `/api/user/unseen-count` using TanStack Query
  - [ ] Display count as a Chakra `Badge` in the app header
  - [ ] When count > 0: show colored badge (e.g., `colorScheme="blue"`)
  - [ ] When count = 0: hide badge or show muted "0"
  - [ ] On click: toggle "show unseen only" filter on the backlog list
- [ ] Task 4: Frontend — Mark items as seen on view (AC: #2, #4)
  - [ ] Create `frontend/src/features/backlog/hooks/use-mark-seen.ts`
  - [ ] When user opens the backlog page, call `POST /api/user/mark-seen` after a brief delay (e.g., 2 seconds)
  - [ ] This updates `last_seen_at` to "now," so next time the user visits, only items created after this timestamp are "unseen"
  - [ ] Invalidate the unseen count query after marking seen
  - [ ] Alternative: use Intersection Observer to mark on scroll (Phase 2 enhancement)
- [ ] Task 5: Integrate badge into `AppHeader` (AC: #1)
  - [ ] Add `UnseenBadge` to `frontend/src/shared/components/layout/app-header.tsx`
  - [ ] Position next to navigation or page title
  - [ ] Ensure badge is visible and not clipped on all screen sizes
- [ ] Task 6: Write tests (AC: #7)
  - [ ] Backend: Test `GET /api/user/unseen-count` returns correct count
  - [ ] Backend: Test `POST /api/user/mark-seen` updates timestamp
  - [ ] Frontend: Test `UnseenBadge` renders count when > 0
  - [ ] Frontend: Test `UnseenBadge` hides when count = 0
  - [ ] Frontend: Test clicking badge toggles filter
  - [ ] Frontend: Test `useMarkSeen` calls API and invalidates query

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

### Debug Log References

### Completion Notes List

### File List
