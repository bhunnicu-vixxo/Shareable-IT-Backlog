# Story 19.1: Stakeholder Voting and Prioritization Input

Linear Issue ID: VIX-440
Status: ready-for-dev

## Story

As a business stakeholder,
I want to upvote or express priority on backlog items that matter to my team,
so that IT has structured, data-driven signal about what the business values most — instead of relying on whoever is loudest in the room.

## Acceptance Criteria

1. **Given** I am viewing a backlog item (list or detail view), **When** I click the upvote button, **Then** my vote is recorded and the count increments.
2. **Given** I have already upvoted an item, **When** I click the upvote button again, **Then** my vote is removed (toggle behavior).
3. **Given** I am viewing the backlog list, **When** I look at an item, **Then** I see the total upvote count.
4. **Given** I am viewing the backlog list, **When** I sort by "Business Priority" (votes), **Then** items are ordered by vote count descending.
5. **Given** I am an admin, **When** I view an item's votes, **Then** I can see which users upvoted it (not just the count).
6. **Given** items have votes, **When** IT reviews the backlog, **Then** business priority (vote count) is visible alongside technical priority.
7. Users cannot vote multiple times on the same item.
8. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Backend — Create votes data model and migrations (AC: #7)
  - [ ] Create migration: `item_votes` table with columns:
    - `id` (UUID primary key)
    - `user_id` (FK to users, required)
    - `item_identifier` (varchar, Linear issue identifier e.g., "VIX-338")
    - `created_at` (timestamp)
  - [ ] Add unique constraint on `(user_id, item_identifier)` — prevents duplicate votes
  - [ ] Add index on `item_identifier` for efficient count queries
- [ ] Task 2: Backend — Create voting API endpoints (AC: #1, #2, #3, #5, #7)
  - [ ] Create `backend/src/routes/votes.routes.ts`
  - [ ] Create `backend/src/controllers/votes.controller.ts`
  - [ ] Create `backend/src/services/votes/vote.service.ts`
  - [ ] `POST /api/backlog-items/:identifier/vote` — toggle vote (add if not exists, remove if exists)
  - [ ] `GET /api/backlog-items/:identifier/voters` — admin only, returns list of users who voted
  - [ ] Return `{ voteCount, userHasVoted }` on the toggle response
- [ ] Task 3: Backend — Extend backlog items API with vote data (AC: #3, #4, #6)
  - [ ] Modify `GET /api/backlog-items` to include `voteCount` and `userHasVoted` per item
  - [ ] Use a LEFT JOIN or subquery to aggregate vote counts
  - [ ] `userHasVoted` is personalized per authenticated user
  - [ ] Add support for `sort=votes` query parameter for business priority sorting
- [ ] Task 4: Frontend — Create `UpvoteButton` component (AC: #1, #2, #3)
  - [ ] Create `frontend/src/features/backlog/components/upvote-button.tsx`
  - [ ] Accept props: `identifier: string`, `voteCount: number`, `userHasVoted: boolean`
  - [ ] Render: upvote icon (Lucide `ThumbsUp` or `ChevronUp`) + count
  - [ ] Filled/highlighted state when `userHasVoted` is true
  - [ ] On click: call `POST /api/backlog-items/:identifier/vote` via TanStack mutation
  - [ ] Optimistic update: immediately toggle UI, revert on error
  - [ ] ARIA label: "Upvote {identifier}" / "Remove upvote from {identifier}"
- [ ] Task 5: Frontend — Integrate into `BacklogItemCard` and `ItemDetailModal` (AC: #1, #3, #6)
  - [ ] Add `UpvoteButton` to `BacklogItemCard` — positioned consistently (e.g., right side of card)
  - [ ] Add `UpvoteButton` to `ItemDetailModal` — in the header or metadata area
  - [ ] Show vote count even when 0 (subtle/muted display)
- [ ] Task 6: Frontend — Add "Business Priority" sort option (AC: #4)
  - [ ] Add `votes` option to the sort dropdown in `BacklogList`
  - [ ] When sorting by votes, use `voteCount` descending as the sort key
  - [ ] Update the sort control UI to show "Business Priority" as the sort label
- [ ] Task 7: Frontend — Admin voter list view (AC: #5)
  - [ ] In the item detail view (for admin users), add a "See who voted" expandable section
  - [ ] Call `GET /api/backlog-items/:identifier/voters` to fetch voter list
  - [ ] Display user names in a simple list
  - [ ] Only visible to admin/IT users (use existing role checks)
- [ ] Task 8: Extend `BacklogItem` types (AC: #3, #6)
  - [ ] Add `voteCount: number` and `userHasVoted: boolean` to `BacklogItem` type
  - [ ] Update `BacklogItemDto` in backend types to include vote fields
- [ ] Task 9: Write tests (AC: #8)
  - [ ] Backend: Test vote toggle (add/remove)
  - [ ] Backend: Test unique constraint prevents duplicates
  - [ ] Backend: Test vote count in backlog items response
  - [ ] Backend: Test voters endpoint returns user list (admin only)
  - [ ] Backend: Test sort by votes
  - [ ] Frontend: Test UpvoteButton renders count and toggle state
  - [ ] Frontend: Test optimistic update on vote
  - [ ] Frontend: Test Business Priority sort option
  - [ ] Frontend: Test admin voter list visibility

## Dev Notes

### Architecture Compliance

- **Backend**: Follow routes → controllers → services pattern. New `backend/src/services/votes/` directory.
- **Frontend**: Component in existing backlog feature (not a new feature directory — voting is an enhancement to the backlog).
- **Database**: New `item_votes` table with unique constraint.
- **Auth**: Vote endpoint requires authentication. Voters list requires admin middleware.

### Critical Implementation Details

- **Phase 1 scope**: Simple upvoting only. No weighted priority budget. No prioritization sessions.
- **Toggle pattern**: A single `POST` endpoint handles both add and remove. Server checks if vote exists: if yes → delete (returns `userHasVoted: false`), if no → insert (returns `userHasVoted: true`).
- **Item reference**: Use `item_identifier` (e.g., "VIX-338") not an internal database ID. This keeps votes independent of sync cycles. If an item is re-synced, votes persist because the identifier is stable.
- **Vote count in list query**: For efficiency, use a subquery or JOIN:
  ```sql
  SELECT bi.*,
    COALESCE(v.vote_count, 0) as vote_count,
    CASE WHEN uv.id IS NOT NULL THEN true ELSE false END as user_has_voted
  FROM backlog_items bi
  LEFT JOIN (SELECT item_identifier, COUNT(*) as vote_count FROM item_votes GROUP BY item_identifier) v
    ON bi.identifier = v.item_identifier
  LEFT JOIN item_votes uv
    ON bi.identifier = uv.item_identifier AND uv.user_id = $1
  ```
- **Optimistic updates**: Use TanStack Query's `useMutation` with `onMutate` for optimistic UI. Cache the previous state in `onMutate`, update optimistically, and revert in `onError`.
- **Political framing**: The UI should label this as "Business Priority" or "Stakeholder Interest" — not just "votes." This positions it as input/signal, not democratic decision-making.
- **Equal weight**: All authenticated users' votes count equally. No weighting by role.

### Existing Code to Reuse

- Auth middleware at `backend/src/middleware/auth.middleware.ts`
- Admin middleware at `backend/src/middleware/admin.middleware.ts`
- Database utility at `backend/src/utils/database.ts`
- `BacklogItemCard` at `frontend/src/features/backlog/components/backlog-item-card.tsx`
- `ItemDetailModal` at `frontend/src/features/backlog/components/item-detail-modal.tsx`
- Sort control patterns in `backlog-list.tsx`
- `usePermissions` hook at `frontend/src/features/auth/hooks/use-permissions.ts` — admin visibility check
- TanStack Query mutation patterns from existing hooks
- Lucide icons (`ThumbsUp`, `ChevronUp`, `ArrowUp`) from `lucide-react`

### Anti-Patterns to Avoid

- Do NOT allow unauthenticated voting — all votes need user attribution
- Do NOT use internal database IDs for item references — use Linear identifiers (stable across syncs)
- Do NOT skip optimistic updates — voting must feel instant
- Do NOT expose voter identities to non-admin users — only admins see who voted
- Do NOT add vote counts to the Linear sync — votes are app-specific data, not Linear data
- Do NOT use WebSocket for real-time updates in Phase 1 — TanStack Query refetch on focus is sufficient
- Do NOT create a new feature directory — this enhances the existing backlog feature

### Project Structure Notes

**New files:**
- `backend/src/routes/votes.routes.ts`
- `backend/src/controllers/votes.controller.ts`
- `backend/src/services/votes/vote.service.ts`
- `frontend/src/features/backlog/components/upvote-button.tsx`
- `frontend/src/features/backlog/components/upvote-button.test.tsx`
- Database migration for `item_votes` table

**Modified files:**
- `backend/src/routes/index.ts` (register vote routes)
- `backend/src/services/backlog/backlog.service.ts` (add vote count JOIN to items query)
- `backend/src/types/api.types.ts` (extend BacklogItemDto with vote fields)
- `frontend/src/features/backlog/types/backlog.types.ts` (add voteCount, userHasVoted)
- `frontend/src/features/backlog/components/backlog-item-card.tsx` (add UpvoteButton)
- `frontend/src/features/backlog/components/item-detail-modal.tsx` (add UpvoteButton + admin voter list)
- `frontend/src/features/backlog/components/backlog-list.tsx` (add Business Priority sort option)

### References

- [Source: backend/src/services/backlog/backlog.service.ts] — Backlog items query to extend
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Card to add upvote button
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Modal to add upvote + voter list
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Sort control to extend
- [Source: frontend/src/features/auth/hooks/use-permissions.ts] — Role-based visibility
- [Source: backend/src/middleware/admin.middleware.ts] — Admin authorization
- [Source: backend/src/utils/database.ts] — Database query patterns
- [Source: _bmad-output/planning-artifacts/architecture.md] — Layer architecture, PostgreSQL, TanStack Query

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
