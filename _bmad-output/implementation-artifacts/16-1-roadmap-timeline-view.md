# Story 16.1: Roadmap / Timeline View for Annual IT Planning

Linear Issue ID: VIX-437
Status: ready-for-dev

## Story

As a business stakeholder or IT leader,
I want to see a visual timeline/roadmap of planned and in-progress work across the year,
so that I can understand what's coming, when it's expected, and how the IT portfolio is shaped — without relying on a PowerPoint slide deck.

## Acceptance Criteria

1. **Given** backlog items have start and/or target dates set in Linear, **When** I navigate to the Roadmap view (`/roadmap`), **Then** I see items rendered on a horizontal timeline grouped by quarter or month.
2. **Given** I am viewing the roadmap, **When** I look at an item, **Then** I see its title, status color indicator, and date range (bar spanning start → end).
3. **Given** items can be grouped, **When** I toggle grouping, **Then** I can view the roadmap by team, by project, or by label.
4. **Given** an item has no dates, **When** I view the roadmap, **Then** it appears in an "Unscheduled" section below the timeline.
5. **Given** I click on a roadmap item, **When** the detail view opens, **Then** I see the full item details (same as the backlog detail modal).
6. **Given** the roadmap is rendered, **When** I scroll horizontally, **Then** I can navigate across months/quarters smoothly.
7. The view supports at minimum a 12-month horizon (current year or rolling 12 months).
8. Items in progress are visually distinct from planned/not-started items (using status colors from Story 15.2).
9. A vertical "today" line is visible for date orientation.
10. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Backend — Extend sync to capture date fields (AC: #1, #2)
  - [ ] Update Linear sync transformer to map `startedAt` and `dueDate` fields from Linear issues
  - [ ] Add `started_at` and `due_date` columns to backlog_items table (nullable timestamps)
  - [ ] Update `BacklogItemDto` to include `startedAt?: string` and `dueDate?: string`
  - [ ] Update `GET /api/backlog-items` response to include the new date fields
  - [ ] Create database migration for new columns
- [ ] Task 2: Frontend — Create roadmap page and route (AC: #1, #6, #7, #9)
  - [ ] Create `frontend/src/features/roadmap/` feature directory
  - [ ] Create `frontend/src/features/roadmap/components/roadmap-page.tsx`
  - [ ] Add `/roadmap` route to `App.tsx` router configuration
  - [ ] Add "Roadmap" navigation link to `AppHeader`
  - [ ] Implement horizontal timeline grid using CSS Grid:
    - Column per month (12 columns for rolling year)
    - Quarter headers above month columns
    - Vertical "today" marker line
    - Horizontal scroll container for overflow
- [ ] Task 3: Frontend — Create timeline item bars (AC: #2, #5, #8)
  - [ ] Create `frontend/src/features/roadmap/components/timeline-item.tsx`
  - [ ] Render items as horizontal bars spanning from `startedAt` to `dueDate`
  - [ ] If only `dueDate`, render as a point/milestone marker
  - [ ] If only `startedAt`, render as an open-ended bar to "present"
  - [ ] Apply status color (from `getStatusColor()` in Story 15.2 or standalone)
  - [ ] On click: open `ItemDetailModal` with full item details
  - [ ] Show item title, identifier on the bar (truncated if needed)
- [ ] Task 4: Frontend — Implement grouping controls (AC: #3)
  - [ ] Create `frontend/src/features/roadmap/components/roadmap-controls.tsx`
  - [ ] Add grouping dropdown: "By Team", "By Project", "By Label", "None"
  - [ ] Implement swimlane rendering: each group gets its own row section
  - [ ] Default grouping: "By Team" (most useful for stakeholder view)
- [ ] Task 5: Frontend — Handle unscheduled items (AC: #4)
  - [ ] Create an "Unscheduled" section below the timeline
  - [ ] List items without start/end dates in a compact list format
  - [ ] Include item title, status, and a "click to view" action
- [ ] Task 6: Frontend — Create `useRoadmapItems` hook (AC: #1)
  - [ ] Create `frontend/src/features/roadmap/hooks/use-roadmap-items.ts`
  - [ ] Fetch backlog items with date fields using TanStack Query
  - [ ] Separate items into "scheduled" (has dates) and "unscheduled" (no dates)
  - [ ] Compute timeline date range (rolling 12 months from current date)
  - [ ] Provide grouping logic (group by team, project, or label)
- [ ] Task 7: Write tests (AC: #10)
  - [ ] Test: roadmap page renders timeline grid with month columns
  - [ ] Test: items with dates render as bars at correct positions
  - [ ] Test: items without dates appear in Unscheduled section
  - [ ] Test: clicking an item opens detail modal
  - [ ] Test: grouping controls switch between views
  - [ ] Test: "today" marker is positioned correctly
  - [ ] Backend: test sync captures startedAt and dueDate fields

## Dev Notes

### Architecture Compliance

- **Feature directory**: `frontend/src/features/roadmap/` — new feature folder following established pattern
- **Routing**: Add `/roadmap` to `App.tsx` routes alongside `/backlog` and `/admin`
- **Backend extension**: Extend existing sync service (no new service needed). New columns on existing table.
- **Shared components**: Reuse `ItemDetailModal` from backlog feature for item click-through.

### Critical Implementation Details

- **CSS Grid timeline** (recommended over third-party library): Use a CSS Grid with columns representing months. Each item bar spans grid columns based on its date range. This gives full control over styling without adding a heavy dependency.
  ```
  grid-template-columns: [label-col] 200px repeat(12, minmax(120px, 1fr))
  ```
- **Date calculation**: For each item, calculate which month columns it spans. Use `Date` comparison to map `startedAt`/`dueDate` to column indices.
- **Linear date fields**: Linear API provides `startedAt` (when issue moved to "started") and `dueDate` (explicit deadline). These map to our timeline bar start/end. Check `@linear/sdk` types for exact field names.
- **Sync transformer**: Located at `backend/src/services/sync/linear-transformers.ts`. This transforms Linear API responses to our BacklogItem format. Add `startedAt` and `dueDate` to the transformation.
- **Responsive considerations**: Desktop-only for Phase 1. Use `overflow-x: auto` on the timeline container. Consider min-width per month column (120px) so the timeline is scrollable.
- **Performance**: With 50-200 items, CSS Grid rendering should be fast. No virtualization needed for Phase 1.

### Existing Code to Reuse

- `ItemDetailModal` from `frontend/src/features/backlog/components/item-detail-modal.tsx` — reuse for item click
- `getStatusColor()` from Story 15.2 (or create standalone if 15.2 isn't done yet)
- Linear sync transformer at `backend/src/services/sync/linear-transformers.ts` — extend for dates
- `BacklogItem` type at `frontend/src/features/backlog/types/backlog.types.ts` — extend with date fields
- TanStack Query patterns from `use-backlog-items.ts` — data fetching
- `useVisibleLabels` at `frontend/src/shared/hooks/use-visible-labels.ts` — label data for grouping

### Anti-Patterns to Avoid

- Do NOT add a heavy Gantt chart library (vis-timeline, react-calendar-timeline) for Phase 1 — CSS Grid gives full control and avoids large dependencies
- Do NOT create a separate API endpoint for roadmap data — extend the existing `/api/backlog-items` response with date fields
- Do NOT make this mobile-responsive in Phase 1 — desktop viewport is sufficient for the stakeholder audience
- Do NOT duplicate the `ItemDetailModal` — import and reuse the existing one from the backlog feature
- Do NOT sync ALL Linear fields — only add `startedAt` and `dueDate` for now

### Project Structure Notes

**New files:**
- `frontend/src/features/roadmap/components/roadmap-page.tsx`
- `frontend/src/features/roadmap/components/timeline-item.tsx`
- `frontend/src/features/roadmap/components/roadmap-controls.tsx`
- `frontend/src/features/roadmap/hooks/use-roadmap-items.ts`
- Database migration file for `started_at` and `due_date` columns

**Modified files:**
- `frontend/src/App.tsx` (add /roadmap route)
- `frontend/src/shared/components/layout/app-header.tsx` (add Roadmap nav link)
- `backend/src/services/sync/linear-transformers.ts` (add date field mapping)
- `backend/src/types/api.types.ts` or `linear-entities.types.ts` (extend DTO with dates)
- `frontend/src/features/backlog/types/backlog.types.ts` (extend BacklogItem with dates)

### References

- [Source: backend/src/services/sync/linear-transformers.ts] — Linear data transformer
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Reusable detail modal
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem type to extend
- [Source: frontend/src/App.tsx] — Router configuration
- [Source: frontend/src/shared/components/layout/app-header.tsx] — Navigation header
- [Source: _bmad-output/planning-artifacts/architecture.md] — Feature-based organization, routing, layer architecture

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
