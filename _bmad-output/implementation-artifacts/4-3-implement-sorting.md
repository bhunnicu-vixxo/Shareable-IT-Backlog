# Story 4.3: Implement Sorting

Linear Issue ID: VIX-347
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to sort backlog items by priority, date, or status,
so that I can view items in the order most useful to me.

## Acceptance Criteria

1. **Given** backlog items have sortable attributes **When** I select a sort option (priority, date created, date updated, status) **Then** the list re-sorts instantly (<500ms)
2. **And** the current sort is visually indicated (active option + direction)
3. **And** sort direction (ascending/descending) can be toggled
4. **And** sort preference persists during my session (no page reload)
5. **And** sort applies to the filtered list (BU + New only + keyword search) — sorting happens after filtering
6. **And** the sort control is accessible: keyboard focusable, screen reader label, focus indicator uses Vixxo Green (`brand.green`)
7. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
8. **And** unit/integration tests cover sort options, direction toggle, combined filters, and persistence

## Tasks / Subtasks

- [x] Task 1: Create SortControl component (AC: #1, #2, #3, #6)
  - [x] 1.1: Create `frontend/src/features/backlog/components/sort-control.tsx`
  - [x] 1.2: Use Chakra UI `Select` or `Menu` for sort option + direction toggle (e.g., two controls or combined)
  - [x] 1.3: Props:
    - `sortBy: SortField` (e.g., `'priority' | 'dateCreated' | 'dateUpdated' | 'status'`)
    - `sortDirection: 'asc' | 'desc'`
    - `onSortByChange: (field: SortField) => void`
    - `onSortDirectionChange: (dir: 'asc' | 'desc') => void`
  - [x] 1.4: Add visually-hidden label for screen readers, e.g. "Sort backlog items"
  - [x] 1.5: Apply `_focusVisible` styling to match BU filter: outline + border uses `brand.green`
  - [x] 1.6: Visual indicator: show arrow icon (↑/↓) for current direction; highlight active sort option

- [x] Task 2: Add sort state and apply sorting in BacklogList (AC: #1, #4, #5)
  - [x] 2.1: In `backlog-list.tsx`, add state: `sortBy`, `sortDirection` (default: `priority`, `asc`)
  - [x] 2.2: Extend `displayedItems` `useMemo` to apply sorting *after* filtering:
    - Chain: business unit → "New only" → keyword search → **sort**
  - [x] 2.3: Sort logic:
    - **priority**: ascending = lower number first ( urgent first); descending = higher number first
    - **dateCreated** / **dateUpdated**: ISO strings; ascending = oldest first; descending = newest first
    - **status**: alphabetical on `status` string; ascending = A–Z; descending = Z–A
  - [x] 2.4: Handle null/undefined: `createdAt`/`updatedAt` are required per BacklogItem; `status` is required
  - [x] 2.5: Persistence: keep in component state (session persists until page reload); no backend changes

- [x] Task 3: Integrate SortControl into filter bar (AC: #2, #6)
  - [x] 3.1: In `backlog-list.tsx`, render `<SortControl />` in the filter bar alongside BusinessUnitFilter and KeywordSearch
  - [x] 3.2: Layout: place sort control between filters and results count; filter bar already designed "extensible for future sort controls" (4-2)
  - [x] 3.3: On wide screens: BU dropdown, search input, New-only toggle, **sort control**, results count right-aligned
  - [x] 3.4: On small screens: allow wrap; ensure sort control remains usable

- [x] Task 4: Testing and verification (AC: #7, #8)
  - [x] 4.1: Add component tests for SortControl:
    - Renders options, respects sortBy/sortDirection props
    - Calls onSortByChange when option selected
    - Calls onSortDirectionChange when direction toggled
    - Accessible label and focus styling
  - [x] 4.2: Update `backlog-list.test.tsx`:
    - Changing sort reorders displayed items (priority asc vs desc, date asc vs desc)
    - Sort applies to filtered results (BU + keyword + sort)
    - Combined filters + sort: correct order and count
  - [x] 4.3: Run `npm run build` in both backend and frontend
  - [x] 4.4: Run `npm test` and ensure no regressions

## Dev Notes

### What's Already Done (from Stories 1.1–4.2)

| Capability | Story | File |
|---|---|---|
| BacklogList component + loading/error/empty + results count | 3.1 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| BacklogItemCard (title, status, teamName, labels, identifier) | 3.1 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| "New only" filter and empty-filter guidance | 3.3 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| BusinessUnitFilter component (Chakra UI v3 Select) | 4.1 | `frontend/src/features/backlog/components/business-unit-filter.tsx` |
| KeywordSearch component (debounced, accessible, highlight) | 4.2 | `frontend/src/features/backlog/components/keyword-search.tsx` |
| Filter chain: BU → New only → keyword | 4.2 | `backlog-list.tsx` `displayedItems` useMemo |

### What This Story Adds

1. **Sort control** in the filter bar (option + direction toggle)
2. **Client-side sorting** applied after filtering in the same `displayedItems` pipeline
3. **Visual indication** of current sort and direction (arrow icons, active state)
4. **Session persistence** via component state (no backend, no localStorage unless desired later)

### CRITICAL: Client-Side Sorting (No Backend Work)

- **Do NOT** add backend sort query params or change API ordering.
- **Do NOT** fetch on sort change.
- **Do** sort in-memory in `displayedItems` `useMemo` for consistent <500ms UX.
- Backend already returns items (default order from Linear); we re-sort client-side after filtering.

### CRITICAL: Sort Fields and Semantics

**BacklogItem** (from `backlog.types.ts`) has:

- `priority`: number (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low). Lower = higher priority.
- `createdAt`, `updatedAt`: ISO 8601 strings (required).
- `status`: string (e.g., "In Progress", "Backlog").

**Sort behavior:**

- **priority asc**: 1, 2, 3, 4 (urgent first). **priority desc**: 4, 3, 2, 1 (low first).
- **dateCreated/dateUpdated asc**: oldest first. **desc**: newest first.
- **status asc**: A–Z. **status desc**: Z–A.

### Architecture Compliance

**From `architecture.md` and `project-context.md`:**

- Feature components: `frontend/src/features/backlog/components/`
- File names: `kebab-case.tsx`; components: `PascalCase`
- Local UI state: `useState`; server state: TanStack Query
- Filtering/sorting: fast (<500ms), pure client-side transformations
- Avoid new state-management libraries; avoid `any`

### Previous Story Intelligence (4-2)

- **Filter bar layout**: Story 4-2 explicitly noted "extensible for future sort controls" — place SortControl in the same `Flex` as BU filter, search, New-only.
- **Chakra UI v3**: Use `Select` or `Menu`; `Box as="label"` does not expose `htmlFor` — use native `<label>` with visually-hidden text if needed.
- **Focus styling**: Match BusinessUnitFilter: `_focusVisible` with `brand.green`.
- **Testing**: Use real timers for backlog-list tests (Vitest fake timers interfere with React Query). Use `waitFor` for async assertions.
- **Lint**: Avoid non-component exports in component files; move helpers to `*.utils.ts` if needed.

### What NOT To Do

- **Do NOT** introduce a new dependency for sorting (use native `Array.sort` with comparators)
- **Do NOT** mutate the items array; use `[...filtered].sort()` or similar immutable pattern
- **Do NOT** hardcode hex colors; use theme tokens (`brand.green`, etc.)
- **Do NOT** degrade accessibility: controls must be labeled and keyboard usable

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 4.3] — Sort requirements + technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Client-side filtering, performance targets
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Existing filter chain; add sort as final step in displayedItems
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem fields (priority, createdAt, updatedAt, status)
- [Source: frontend/src/features/backlog/components/business-unit-filter.tsx] — Pattern for accessible Select + focus styling

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- Fixed test regressions: Adding SortControl introduced a second `combobox` role on the page, causing existing BU filter tests to fail with "multiple elements found". Fixed by adding `{ name: /filter by business unit/i }` to all BU combobox queries.
- Fixed sort integration tests: BacklogItemCard uses `role="button"` not `role="article"`. Updated sort order assertions to query `role="button"` with `{ name: /,\s*Priority/ }` pattern.

### Completion Notes List

- **Task 1:** Created `SortControl` component with Chakra UI v3 Select for sort field selection and IconButton for direction toggle. Exports `SortField` and `SortDirection` types. 10 unit tests covering rendering, interaction, accessibility.
- **Task 2:** Added `sortBy` and `sortDirection` state to `BacklogList`. Extended `displayedItems` useMemo to sort after filtering using immutable `[...filtered].sort()`. Sort comparators: priority (numeric), dateCreated/dateUpdated (ISO string comparison), status (alphabetical).
- **Task 3:** Integrated `SortControl` into the filter bar between New-only toggle and results count. Layout uses flexWrap for responsive behavior.
- **Task 4:** Added 5 sorting integration tests to `backlog-list.test.tsx`. Full suite: 121 tests pass (10 files). Both `npm run build` pass with zero TS errors.

### Change Log

- 2026-02-10: Story 4.3 implementation complete — sort control, client-side sorting, integration tests

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-10_

### Summary

- Verified story claims against implementation and tests.
- Ran `npm run build -w backend`, `npm run build -w frontend`, and `npm run test:run -w frontend`.

### Fixes Applied

- **Dev proxy correctness**: Updated `frontend/vite.config.ts` default proxy target to `http://localhost:3000` (matches backend/README defaults).
- **Docs/env consistency**: Updated root `.env.example` and `README.md` so the recommended dev setup uses the Vite proxy (`http://localhost:1576/api`) and copies per-project `.env.example` files.
- **Sorting semantics**: Ensured `priority=0` ("None") is always sorted last in both ascending and descending priority sorts.
- **Test robustness**: Hardened sorting assertions to use card roles/labels consistently and added a dedicated test for `priority=0` behavior.
- **Keyboard focus visibility**: Added `_focusVisible` styling using `brand.green` to clickable `BacklogItemCard` for consistent, visible keyboard focus.

### File List

- `frontend/src/features/backlog/components/sort-control.tsx` (new) — SortControl component
- `frontend/src/features/backlog/components/sort-control.test.tsx` (new) — SortControl unit tests (10 tests)
- `frontend/src/features/backlog/components/backlog-list.tsx` (modified) — Added sort state, sort logic in displayedItems, rendered SortControl in filter bar
- `frontend/src/features/backlog/components/backlog-list.test.tsx` (modified) — Added 5 sort integration tests, fixed combobox queries for dual-select disambiguation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — Story status updated to done
- `_bmad-output/implementation-artifacts/4-3-implement-sorting.md` (modified) — Story file updated with completion details
- `frontend/src/features/backlog/components/backlog-item-card.tsx` (modified) — Added keyboard focus-visible styling for clickable card
- `frontend/vite.config.ts` (modified) — Fix default dev proxy target (3000)
- `.env.example` (modified) — Align frontend dev API URL with Vite proxy
- `README.md` (modified) — Align env setup instructions with per-project `.env.example` files
