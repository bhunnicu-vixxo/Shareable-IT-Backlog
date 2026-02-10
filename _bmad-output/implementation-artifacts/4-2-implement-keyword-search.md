# Story 4.2: Implement Keyword Search

Linear Issue ID: VIX-346
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to search backlog items by keywords,
so that I can find specific items quickly.

## Acceptance Criteria

1. **Given** backlog items have titles and descriptions, **When** I type keywords in the search box, **Then** search results update as I type (debounced)
2. **And** search completes within 500ms (client-side; no network calls on each keystroke)
3. **And** search matches item titles, descriptions, and other searchable fields (at minimum: `title`, `description`, `teamName` (business unit), `status`; include `identifier` + `labels[].name` if available)
4. **And** search is case-insensitive and ignores leading/trailing whitespace
5. **And** matching terms are visually highlighted in the results (at minimum in the title; ideally also in the description snippet + metadata where displayed)
6. **And** I can clear the search quickly (clear button / escape / empty input returns full set)
7. **And** keyword search works in combination with existing filters (business unit + "New only") and results count text reflects combined filters
8. **And** when combined filters return no results, the existing guidance empty-state pattern is shown with actions to clear search and/or other filters
9. **And** the search input is accessible: has a label (screen-reader), keyboard-friendly, and focus indicator uses Vixxo Green (`brand.green`)
10. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
11. **And** unit/integration tests cover debouncing behavior, filtering behavior, highlight rendering, and combined-filter edge cases

## Tasks / Subtasks

- [x] Task 1: Create a KeywordSearch component (AC: #1, #4, #6, #9)
  - [x] 1.1: Create `frontend/src/features/backlog/components/keyword-search.tsx`
  - [x] 1.2: Use Chakra UI `Input` + a small clear button (e.g., `IconButton` or `Button`), with `aria-label="Search backlog items"`
  - [x] 1.3: Props:
    - `value: string`
    - `onChange: (value: string) => void`
    - `onClear: () => void`
    - optional `placeholder?: string` (default: "Search…")
  - [x] 1.4: Add visually-hidden label text "Search backlog items"
  - [x] 1.5: Apply `_focusVisible` styling to match BU filter: outline + border uses `brand.green`

- [x] Task 2: Add debounced keyword filtering in BacklogList (AC: #1, #2, #3, #4, #7)
  - [x] 2.1: In `frontend/src/features/backlog/components/backlog-list.tsx`, add `keywordQuery` state: `useState('')`
  - [x] 2.2: Implement debounce (300–500ms) so filtering only applies after a short pause:
    - Prefer a tiny local hook in `features/backlog/hooks/use-debounced-value.ts` or inline `useEffect + setTimeout`
    - Ensure timer cleanup on change/unmount
  - [x] 2.3: Update `displayedItems` `useMemo` to chain filters in a single pass:
    - business unit filter → "New only" filter → keyword filter
  - [x] 2.4: Keyword matching algorithm (token-friendly and predictable):
    - Normalize query: `trim()`, collapse internal whitespace
    - Split into tokens by whitespace; ignore empty tokens
    - For each item, create a single searchable string from:
      - `title`
      - `description ?? ''`
      - `teamName`
      - `status`
      - `identifier`
      - `labels.map(l => l.name).join(' ')`
    - Case-insensitive match
    - Recommended: require **all tokens** to match somewhere in the searchable string (AND semantics) to keep results tight
  - [x] 2.5: Ensure zero fetches on each keystroke (filtering is purely client-side)

- [x] Task 3: Highlight matching terms in results (AC: #5)
  - [x] 3.1: Add a small utility to safely highlight matches without regex footguns:
    - Create `frontend/src/features/backlog/utils/highlight.tsx`
    - Export `highlightText(text: string, tokens: string[]): React.ReactNode`
    - Escape tokens for regex, handle overlapping, preserve original casing
  - [x] 3.2: Update `BacklogItemCard` to accept `highlightTokens?: string[]` (or `highlightQuery?: string`)
  - [x] 3.3: Render highlighted content:
    - Title: wrap matches in a `Box as="mark"` or `Text as="mark"` with subtle background
    - If you choose to display a description preview line, also highlight within the snippet
  - [x] 3.4: Ensure highlighting does not break `truncate` behavior (if needed, use `noOfLines={1}` and keep markup minimal)

- [x] Task 4: Integrate KeywordSearch into the filter bar UI (AC: #6, #7, #9)
  - [x] 4.1: In `backlog-list.tsx`, render `<KeywordSearch />` alongside `<BusinessUnitFilter />` and the "New only" button
  - [x] 4.2: Layout guidance:
    - Keep filter bar top-of-list and extensible for future sort controls
    - On wide screens: BU dropdown, search input, New-only toggle, results count right-aligned
    - On small screens: allow wrap; ensure input remains usable (min width)
  - [x] 4.3: Update results count string to include search context when non-empty (example):
    - `Showing 4 items matching "vpn" for Operations`
    - Keep wording concise and consistent with existing count text

- [x] Task 5: Expand the empty-state guidance to support keyword search (AC: #8)
  - [x] 5.1: Reuse the existing empty-filter state in `BacklogList` (currently handles BU and/or New-only)
  - [x] 5.2: Extend messaging/actions when keyword search is active:
    - Headline: `No items found matching "<query>"`
    - Description: Suggest clearing search and/or adjusting other filters
    - Buttons:
      - `Clear search` (sets keywordQuery to empty string)
      - existing `Clear filter` and `Show all items` remain available when applicable

- [x] Task 6: Testing and verification (AC: #10, #11)
  - [x] 6.1: Add component tests for KeywordSearch:
    - Renders input with accessible label
    - Calls onChange on typing
    - Clear button calls onClear and empties input
  - [x] 6.2: Update `frontend/src/features/backlog/components/backlog-list.test.tsx`:
    - Typing a query filters results (after debounce) by title/description/teamName/status
    - Debounce: use `vi.useFakeTimers()` + `vi.advanceTimersByTime(350)` (or chosen delay) to assert update timing
    - Combined filters: BU + New-only + keyword search works together
    - Empty state appears for no matches and offers `Clear search`
    - Highlight rendering: verify a `<mark>` (or equivalent) exists when query matches title
  - [x] 6.3: Run `npm run build` in both backend and frontend
  - [x] 6.4: Run `npm test` (or `npm run test:run`) and ensure no regressions

## Dev Notes

### What's Already Done (from Stories 1.1–4.1)

| Capability | Story | File |
|---|---|---|
| BacklogList component + loading/error/empty + results count | 3.1 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| BacklogItemCard (title, status, teamName, labels, identifier) | 3.1 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| "New only" filter and empty-filter guidance | 3.3 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| BusinessUnitFilter component (Chakra UI v3 Select) | 4.1 | `frontend/src/features/backlog/components/business-unit-filter.tsx` |

### What This Story Adds

1. **Keyword search input** in the filter bar (debounced, accessible, clearable)
2. **Client-side keyword filtering** chained with existing BU + "New only" filters
3. **Highlighting of matching terms** in the list results so matches are visually scannable
4. **No-results guidance** that specifically addresses keyword search and allows one-click reset

### CRITICAL: Client-Side Search (No Backend Work)

This project already loads the backlog dataset via `useBacklogItems` and performs client-side filtering for BU and "New only". For this story:

- **Do NOT** add new backend query params or endpoints for keyword search.
- **Do NOT** fetch on each keystroke.
- **Do** filter in-memory in `BacklogList` for consistent <500ms UX.

### CRITICAL: Where to Search (Fields)

Per the epic requirements, keyword matching must include:

- `BacklogItem.title`
- `BacklogItem.description` (nullable; treat null as empty string)
- `BacklogItem.teamName` (business unit)
- `BacklogItem.status`

Recommended additional fields to reduce "why didn’t it match?" confusion:

- `BacklogItem.identifier` (e.g., VIX-123)
- `BacklogItem.labels[].name`

### CRITICAL: Highlighting Strategy

Highlighting must be **safe** (no regex injection), **case-insensitive**, and **token-aware**. Keep the highlight styling subtle and readable:

- Wrap matches in `<mark>` (or Chakra equivalent) with a light background
- Ensure WCAG contrast with `brand.gray` text
- Do not let highlighting break truncation/layout (prefer minimal wrappers)

### Architecture Compliance

**From `architecture.md` and `project-context.md`:**

- Feature component files live in `frontend/src/features/backlog/components/`
- File names are `kebab-case.tsx` and components are `PascalCase`
- Local UI state uses `useState`; server state uses TanStack Query (already in `useBacklogItems`)
- Filtering must be fast (<500ms) and should be pure client-side transformations
- Avoid new state-management libraries and avoid `any`

### What NOT To Do

- **Do NOT** introduce a new dependency for debounce or highlighting unless absolutely necessary
- **Do NOT** mutate the items array; use `.filter()` and derived memoized values
- **Do NOT** hardcode hex colors; use theme tokens (`brand.green`, etc.)
- **Do NOT** degrade accessibility: input must be labeled and keyboard usable

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 4.2] — Keyword search requirements + technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Client-side filtering, structure, performance targets
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns] — Search input expectations and accessibility patterns
- [Source: _bmad-output/project-context.md] — Rules: state management, naming, error handling, anti-patterns
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Existing chained filters + empty filter state pattern
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Where highlighting will be rendered

## Change Log

- 2026-02-09: Implemented keyword search with debounced client-side filtering, search highlight, combined filter support, and comprehensive test coverage (9 new tests for backlog-list, 8 new tests for keyword-search).
- 2026-02-10: Senior dev code review fixes — lint blocker resolved, Escape-to-clear added, and filtering memoization tightened.

## Dev Agent Record

### Agent Model Used

Claude 4.6 Opus (via Cursor)

### Debug Log References

- Fixed TypeScript build error: Chakra UI v3 `Box as="label"` does not expose `htmlFor` in the type system. Resolved by using a native `<label>` element with inline styles for the visually-hidden label.
- Fixed test timing issues: Vitest fake timers (`vi.useFakeTimers()`) interfere with React Query's async data loading. Switched tests to use real timers with `waitFor` polling (debounce completes within the 1s default timeout).
- Fixed duplicate "Clear search" buttons: When keyword search produces an empty state, both the KeywordSearch component's clear icon and the empty-state "Clear search" button coexist. Tests use `getAllByRole` to disambiguate.
- Fixed frontend lint blocker: moved non-component exports out of `stack-rank-badge.tsx` to satisfy `react-refresh/only-export-components`.

### Completion Notes List

- Created `KeywordSearch` component: accessible search input with clear button, Vixxo Green focus styling, visually-hidden label for screen readers.
- Added Escape-to-clear support in `KeywordSearch` for fast keyboard clearing.
- Created `useDebouncedValue` hook: generic 300ms debounce with timer cleanup on change/unmount.
- Created `highlightText` utility: regex-safe token highlighting with `<mark>` elements and `tokenizeQuery` helper.
- Updated `BacklogItemCard`: accepts `highlightTokens` prop to highlight matching terms in the title.
- Updated `BacklogList`: integrated keyword state, debounced filtering (chained with BU + New-only), search component in filter bar, updated results count text with search context, expanded empty-state guidance with "Clear search" action.
- All tests pass. `npm run build` passes. `npm run lint` passes after review fixes.
- `npm run build` passes with zero TypeScript errors in both frontend and backend.

### File List

- `frontend/src/features/backlog/components/keyword-search.tsx` (new) — KeywordSearch component
- `frontend/src/features/backlog/components/keyword-search.test.tsx` (new) — 8 unit tests for KeywordSearch
- `frontend/src/features/backlog/hooks/use-debounced-value.ts` (new) — useDebouncedValue hook
- `frontend/src/features/backlog/utils/highlight.tsx` (new) — highlightText utility and tokenizeQuery helper
- `frontend/src/features/backlog/components/backlog-list.tsx` (modified) — keyword state, debounced filter chain, search UI, empty-state expansion
- `frontend/src/features/backlog/components/backlog-list.test.tsx` (modified) — 9 new keyword search integration tests
- `frontend/src/features/backlog/components/backlog-item-card.tsx` (modified) — highlightTokens prop for title highlighting
- `frontend/src/shared/components/ui/stack-rank-badge.tsx` (modified) — moved helper export to utils for lint compatibility
- `frontend/src/shared/components/ui/stack-rank-badge.utils.ts` (new) — exported `getBadgeDimensions` helper
- `frontend/src/shared/components/ui/stack-rank-badge.test.tsx` (modified) — imports helper from utils
- `frontend/vitest.setup.ts` (modified) — jsdom polyfills for Chakra Select tests
- `frontend/package.json` (modified) — add `@testing-library/user-event`
- `package-lock.json` (modified) — lockfile updates
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story 4-2 status updated
- `_bmad-output/implementation-artifacts/4-2-implement-keyword-search.md` (modified) — tasks, dev record, status updates

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-10_

### Summary

- Verified story claims against implementation and tests.
- Ran `npm run test:run -w frontend`, `npm run build -w frontend`, `npm run build -w backend`.
- Fixed lint blocker and closed remaining AC gaps (Escape-to-clear).

### Fixes Applied

- **Lint**: Resolved `react-refresh/only-export-components` error by moving `getBadgeDimensions` into `stack-rank-badge.utils.ts`.
- **AC #6 (clear quickly)**: Added Escape-to-clear behavior on the search input and a unit test for it.
- **Filtering quality**: Lowercased/deduped search tokens once and stabilized `items` with `useMemo` to avoid hook dependency churn.

