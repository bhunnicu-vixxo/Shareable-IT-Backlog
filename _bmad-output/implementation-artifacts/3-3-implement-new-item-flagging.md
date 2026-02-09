# Story 3.3: Implement New Item Flagging

Linear Issue ID: VIX-342
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to see which items are new and need prioritization discussion,
so that I can focus on items requiring attention.

## Acceptance Criteria

1. **Given** items can be flagged as new, **When** I view the backlog list, **Then** new items are visually flagged with indicators (badge, icon, or highlight)
2. **And** I can filter to see only new items (FR5)
3. **And** new item indicators are clear but not overwhelming
4. **And** the "new" flag uses Vixxo Yellow (#EDA200) for attention/flagging per UX spec
5. **And** filter updates instantly (<500ms) when toggling between all items and new items only
6. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
7. **And** unit tests cover the new item indicator and filter behavior

## Tasks / Subtasks

- [x] Task 1: Add `isNew` to backend data model and API (AC: #1)
  - [x] 1.1: Add `isNew: boolean` to `BacklogItemDto` in `backend/src/types/linear-entities.types.ts`
  - [x] 1.2: Compute `isNew` in `linear-transformers.ts` based on `createdAt` (e.g., items created within last 7 days)
  - [x] 1.3: Add configurable `NEW_ITEM_DAYS_THRESHOLD` env var (default: 7)
  - [x] 1.4: Ensure backlog controller passes through `isNew` in API response
- [x] Task 2: Add `isNew` to frontend types and display indicator (AC: #1, #3, #4)
  - [x] 2.1: Add `isNew: boolean` to `BacklogItem` in `frontend/src/features/backlog/types/backlog.types.ts`
  - [x] 2.2: Add "New" indicator to `BacklogItemCard` using Vixxo Yellow (badge or icon)
  - [x] 2.3: Use theme token `brand.yellow` for styling (not hardcoded hex)
  - [x] 2.4: Ensure indicator is accessible (ARIA label, color not sole indicator)
- [x] Task 3: Implement "Show only new items" filter (AC: #2, #5)
  - [x] 3.1: Add filter toggle/tab to `BacklogList` (e.g., "All" | "New only")
  - [x] 3.2: Implement client-side filtering when "New only" selected
  - [x] 3.3: Ensure filter updates instantly (<500ms) — client-side only
  - [x] 3.4: Show result count: "Showing X items" or "Showing X new items"
- [x] Task 4: Testing and verification (AC: #6, #7)
  - [x] 4.1: Add unit tests for `isNew` computation in backend
  - [x] 4.2: Add tests for BacklogItemCard with `isNew` indicator
  - [x] 4.3: Add tests for BacklogList filter behavior
  - [x] 4.4: Run `npm run build` in both backend and frontend
  - [x] 4.5: Run full test suite

## Dev Notes

### What's Already Done (from Stories 1.1–3.2)

| Capability | Story | File |
|---|---|---|
| BacklogItemCard component | 3.1 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| BacklogList component | 3.1 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| StackRankBadge with size hierarchy | 3.2 | `frontend/src/shared/components/ui/stack-rank-badge.tsx` |
| BacklogItem type | 2.4 | `frontend/src/features/backlog/types/backlog.types.ts` |
| BacklogItemDto type | 2.4 | `backend/src/types/linear-entities.types.ts` |
| Linear transformer (toBacklogItemDto) | 2.4 | `backend/src/services/sync/linear-transformers.ts` |
| Chakra UI v3 theme with Vixxo brand colors | 1.1 | `frontend/src/theme.ts` — `brand.yellow` = #EDA200 |

### What This Story Adds

1. **`isNew` flag** — Backend computes and frontend displays items created within configurable threshold (default 7 days)
2. **Visual indicator** — "New" badge or icon on BacklogItemCard using Vixxo Yellow
3. **Filter for new items** — Toggle to show only new items (client-side, instant)

### CRITICAL: "New" Definition

**Time-based approach (MVP):**
- Items created within last N days are "new" (default N=7)
- Configurable via `NEW_ITEM_DAYS_THRESHOLD` env var
- Computation: `isNew = (now - createdAt) < N * 24 * 60 * 60 * 1000`

**Rationale:** PRD says "flag new items that need prioritization discussion." Without a sync/metadata database, time-based is simplest. Future enhancement: store "last prioritization meeting" date and flag items added since.

### CRITICAL: Visual Indicator Specification

From UX design spec (epics-and-stories, ux-design-specification):
- **Use Vixxo Yellow (#EDA200) for attention/flagging**
- **Clear but not overwhelming**
- **Color not sole indicator** (accessibility)

**Implementation options:**
- **Option A:** Small badge "New" next to status badge — compact, scannable
- **Option B:** Icon (e.g., asterisk, sparkle) — minimal, subtle
- **Option C:** Left border accent + small "New" label — more prominent

**Recommendation:** Option A — Badge with "New" text, `brand.yellow` background, dark text for contrast (Vixxo Yellow on white is ~1.8:1 — use `brand.yellow` bg with `brand.gray` or dark text per WCAG)

From UX spec: "Vixxo Yellow (#EDA200) on white: ~1.8:1 contrast ratio (does not meet WCAG AA - use with dark text or as accent only)"

**Solution:** Use `brand.yellow` as background with `brand.gray` (#3E4543) or white text if contrast sufficient. Verify: yellow bg + dark gray text meets WCAG AA.

### CRITICAL: Backend Implementation

**linear-transformers.ts:**
```typescript
// Add helper
const NEW_ITEM_DAYS = parseInt(process.env.NEW_ITEM_DAYS_THRESHOLD ?? '7', 10)
const MS_PER_DAY = 24 * 60 * 60 * 1000

function isItemNew(createdAt: Date): boolean {
  const now = Date.now()
  const created = createdAt.getTime()
  return (now - created) < NEW_ITEM_DAYS * MS_PER_DAY
}

// In toBacklogItemDto, add:
isNew: isItemNew(issue.createdAt),
```

**Note:** `issue.createdAt` is a Date from Linear SDK. Use it directly.

### CRITICAL: Frontend Filter Implementation

**Client-side filtering (recommended for MVP):**
- Backend returns all items with `isNew` computed
- Frontend stores filter state: `showNewOnly: boolean`
- When `showNewOnly`, filter `items.filter(i => i.isNew)` before render
- Instant (<500ms) — no API call, no loading state

**Filter UI options:**
- Chakra UI Tabs: "All" | "New only"
- Toggle switch: "Show only new items"
- Dropdown in same area as "Showing X items"

**Recommendation:** Simple toggle or segmented control above the list. Keep it minimal.

### CRITICAL: BacklogItemCard Layout

Current layout:
```
[StackRankBadge]  Title
                  Status | Team | Identifier
                  Labels
```

With New indicator:
```
[StackRankBadge]  [New] Title
                  Status | Team | Identifier
                  Labels
```

Or:
```
[StackRankBadge]  Title                    [New]
                  Status | Team | Identifier
                  Labels
```

**Recommendation:** Add "New" badge in metadata row (HStack with StatusBadge) — keeps it visible but not overwhelming. Use `HStack` with `StatusBadge`, "New" badge, team, identifier.

### Architecture Compliance

**From architecture.md:**
- Component-based frontend ✅
- Feature components in `features/backlog/components/` ✅
- Backend: DTOs in `types/`, transformers in `services/sync/` ✅
- Use theme tokens (`brand.yellow`) — no hardcoded hex ✅

**From project-context.md:**
- Use `camelCase` for JSON fields (`isNew`) ✅
- Immutable state updates ✅
- Client-side filtering for instant response (<500ms) ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.1 Backlog List View | Depends on | Uses BacklogItemCard, BacklogList |
| 3.2 Priority Visualization | Depends on | BacklogItemCard already has StackRankBadge |
| 4.1 Business Unit Filter | Related | Similar filter pattern; this story adds "new" filter |
| 4.4 Empty State | Related | When "New only" returns 0 items, show helpful message |

### Project Structure After This Story

```
backend/src/
├── types/
│   └── linear-entities.types.ts    (MODIFIED — add isNew to BacklogItemDto)
├── services/
│   └── sync/
│       └── linear-transformers.ts  (MODIFIED — compute isNew)

frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── backlog-item-card.tsx   (MODIFIED — New badge)
│       │   ├── backlog-list.tsx        (MODIFIED — filter toggle)
│       │   └── *.test.tsx              (MODIFIED — new tests)
│       └── types/
│           └── backlog.types.ts        (MODIFIED — add isNew to BacklogItem)
```

### What NOT To Do

- **Do NOT** add backend query param for filtering yet — client-side is sufficient for MVP and meets <500ms
- **Do NOT** hardcode hex values — use `brand.yellow` from theme
- **Do NOT** make the New indicator too large — "clear but not overwhelming"
- **Do NOT** use color as sole indicator — include "New" text or icon
- **Do NOT** add database tables for "new" — time-based computation is sufficient for MVP
- **Do NOT** mutate `items` array when filtering — use `items.filter()` to create new array

### Performance Considerations

- **Backend:** `isNew` computation is O(1) per item — trivial
- **Frontend:** Client-side filter is O(n) — negligible for typical backlog sizes (<500 items)
- **Filter toggle:** No API call, instant re-render

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 3.3] — Story requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — Vixxo Yellow for attention
- [Source: _bmad-output/implementation-artifacts/3-2-implement-priority-stack-rank-visualization.md] — Previous story, BacklogItemCard structure
- [Source: frontend/src/theme.ts] — brand.yellow = #EDA200
- [Source: backend/src/services/sync/linear-transformers.ts] — toBacklogItemDto

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- **Task 1 — Backend `isNew` field:** Added `isNew: boolean` to `BacklogItemDto` interface and Zod schema. Implemented `isItemNew()` helper in `linear-transformers.ts` that computes new status based on `createdAt` date against configurable `NEW_ITEM_DAYS_THRESHOLD` env var (default: 7 days). Added env var to `.env.example`. Controller passes through transparently since the service already returns DTOs.
- **Task 2 — Frontend "New" badge:** Added `isNew: boolean` to frontend `BacklogItem` type. Created `NewItemBadge` component using `brand.yellow` background with `brand.gray` text for WCAG AA contrast. Badge includes "New" text label (not color-only) and `aria-label="New item"`. Card `aria-label` includes ", New item" suffix when applicable.
- **Task 3 — New items filter:** Added client-side `showNewOnly` state to `BacklogList` with `useMemo` for filtered items. Filter toggle button shows "New only (N)" count, toggles to "Show all" when active. Result count updates to "Showing X new items" when filtered. Empty filter state provides "Show all items" button. All filtering is client-side with zero API calls — instant (<500ms).
- **Task 4 — Testing:** Added 5 backend `isNew` computation tests (1-day, 6-day, 8-day, 30-day, just-now). Added 4 frontend `BacklogItemCard` tests (badge renders/hides, aria-label, accessible label). Added 5 frontend `BacklogList` filter tests (button visibility, filter toggle, toggle back, singular count). Updated all existing mock data to include `isNew`. Both `npm run build` pass with zero TS errors. Full test suite: Frontend 51/51, Backend 250/250 new tests pass (4 pre-existing failures unrelated to this story).
- **Code Review (2026-02-09):** Fixed M1 — NEW_ITEM_DAYS_THRESHOLD parsing now validates input; invalid values (NaN, negative) fall back to 7. Added boundary comment for 7-day threshold. Added update-linear-issue.js to File List.

### File List

- `backend/src/types/linear-entities.types.ts` — MODIFIED (added `isNew: boolean` to `BacklogItemDto`)
- `backend/src/types/linear-entities.schemas.ts` — MODIFIED (added `isNew: z.boolean()` to Zod schema)
- `backend/src/services/sync/linear-transformers.ts` — MODIFIED (added `isItemNew()`, `NEW_ITEM_DAYS`, `MS_PER_DAY` constants, `isNew` in DTO return)
- `backend/src/services/sync/linear-transformers.test.ts` — MODIFIED (added 5 `isNew` computation tests, updated mock expectations)
- `backend/src/services/backlog/backlog.service.test.ts` — MODIFIED (added `isNew` to mock data)
- `backend/src/routes/backlog.routes.test.ts` — MODIFIED (added `isNew` to mock data)
- `backend/.env.example` — MODIFIED (added `NEW_ITEM_DAYS_THRESHOLD` env var)
- `frontend/src/features/backlog/types/backlog.types.ts` — MODIFIED (added `isNew: boolean` to `BacklogItem`)
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — MODIFIED (added `NewItemBadge` component, conditional rendering, updated aria-label)
- `frontend/src/features/backlog/components/backlog-list.tsx` — MODIFIED (added `useState`/`useMemo` imports, filter state, filter toggle UI, filtered result count, empty filter state)
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — MODIFIED (added 4 new tests for New badge, updated mock data)
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — MODIFIED (added 5 new filter tests, updated mock data)
- `frontend/src/features/backlog/hooks/use-backlog-items.test.tsx` — MODIFIED (updated mock data with `isNew`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (story 3-3 status: ready-for-dev → review)
- `_bmad-output/implementation-artifacts/3-3-implement-new-item-flagging.md` — MODIFIED (this file — tasks marked complete, dev agent record, file list, change log, status)
- `update-linear-issue.js` — MODIFIED (utility script; touched during story work)

### Change Log

- **2026-02-09:** Implemented Story 3.3 — New Item Flagging. Added time-based `isNew` computation (configurable via `NEW_ITEM_DAYS_THRESHOLD` env var, default 7 days) to backend transformer, "New" badge with Vixxo Yellow and accessible design to BacklogItemCard, client-side "New only" filter toggle to BacklogList. Added 14 new tests across backend and frontend.
- **2026-02-09:** Code review fixes — NEW_ITEM_DAYS_THRESHOLD validation (fallback to 7 for invalid/negative), boundary documentation, File List update.
