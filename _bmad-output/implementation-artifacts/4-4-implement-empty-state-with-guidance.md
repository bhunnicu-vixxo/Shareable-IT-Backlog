# Story 4.4: Implement Empty State with Guidance

Linear Issue ID: VIX-348
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want helpful guidance when filters return no results,
so that I understand why no items are shown and how to adjust my filters.

## Acceptance Criteria

1. **Given** I have applied filters that return no results **When** the filtered list is empty **Then** a reusable `EmptyStateWithGuidance` component is displayed (replacing the current inline empty-filter block in `backlog-list.tsx`)
2. **And** the component shows an icon appropriate to the context (search icon when keyword active, filter icon otherwise)
3. **And** the heading explains why no results were found, varying by active filter combination (keyword, business unit, new-only, or mixed)
4. **And** the description provides actionable suggestions to adjust filters or check business unit assignment
5. **And** a "Clear all filters" button is always shown plus individual clear buttons for each active filter
6. **And** the component uses Chakra UI v3 `EmptyState` parts (`EmptyState.Root`, `EmptyState.Content`, `EmptyState.Indicator`, `EmptyState.Title`, `EmptyState.Description`) with Vixxo brand styling
7. **And** the component is accessible: has ARIA `role="status"`, meaningful heading, keyboard-focusable action buttons, and screen-reader-friendly text
8. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
9. **And** unit tests cover all filter combinations, button actions, icon selection, and accessibility attributes

## Tasks / Subtasks

- [x] Task 1: Create EmptyStateWithGuidance component (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 1.1: Create `frontend/src/features/backlog/components/empty-state-with-guidance.tsx`
  - [x] 1.2: Build on Chakra UI v3 `EmptyState.Root` / `.Content` / `.Indicator` / `.Title` / `.Description`
  - [x] 1.3: Props interface:
    - `keyword: string` (active search term, empty string if none)
    - `businessUnit: string | null` (selected BU or null)
    - `showNewOnly: boolean` (new-only toggle state)
    - `onClearKeyword: () => void`
    - `onClearBusinessUnit: () => void`
    - `onClearNewOnly: () => void`
    - `onClearAll: () => void`
  - [x] 1.4: Contextual icon: use search icon (`SearchX` from Lucide) when keyword is active, filter icon (`FilterX`) otherwise
  - [x] 1.5: Contextual heading logic (priority order):
    - Keyword active: `No items found matching "{keyword}"`
    - BU only: `No items found for {businessUnit}`
    - New-only only: `No new items`
    - BU + new-only: `No new items for {businessUnit}`
    - Mixed (keyword + others): `No items found matching "{keyword}"`
  - [x] 1.6: Contextual description with actionable suggestions
  - [x] 1.7: Action buttons: always show "Clear all filters"; conditionally show per-filter clear buttons
  - [x] 1.8: Add `role="status"` on root for screen readers to announce empty state

- [x] Task 2: Integrate into BacklogList (AC: #1)
  - [x] 2.1: In `backlog-list.tsx`, replace the inline empty-filter `<Flex>` block (lines ~278-330) with `<EmptyStateWithGuidance />`
  - [x] 2.2: Pass all required props from existing state variables
  - [x] 2.3: Add `onClearAll` handler that resets `keywordQuery`, `selectedBusinessUnit`, and `showNewOnly` in one call
  - [x] 2.4: Verify existing `BacklogEmptyState` (no-data state) remains unchanged — only the filter-empty state is replaced

- [x] Task 3: Unit tests for EmptyStateWithGuidance (AC: #9)
  - [x] 3.1: Create `frontend/src/features/backlog/components/empty-state-with-guidance.test.tsx`
  - [x] 3.2: Test cases:
    - Renders search icon when keyword active
    - Renders filter icon when keyword not active
    - Shows correct heading for each filter combination (keyword, BU, new-only, BU+new-only, mixed)
    - Shows correct description for each combination
    - "Clear all filters" button always visible and calls `onClearAll`
    - Individual clear buttons appear only when respective filter is active
    - Has `role="status"` on the component root
  - [x] 3.3: Update `backlog-list.test.tsx` to verify:
    - EmptyStateWithGuidance renders when filters yield zero results
    - "Clear all filters" resets all filters
    - Existing no-data empty state still renders when items array is empty

- [x] Task 4: Build verification (AC: #8)
  - [x] 4.1: Run `npm run build` in both `backend/` and `frontend/`
  - [x] 4.2: Run `npm test` and ensure no regressions

## Dev Notes

### What's Already Done (from Stories 1.1–4.3)

| Capability | Story | File |
|---|---|---|
| BacklogList + loading/error/empty + results count | 3.1 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| BacklogItemCard (title, status, teamName, labels, identifier) | 3.1 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| "New only" filter and inline empty-filter guidance | 3.3 | `backlog-list.tsx` (lines 278-330) |
| BusinessUnitFilter component (Chakra UI v3 Select) | 4.1 | `frontend/src/features/backlog/components/business-unit-filter.tsx` |
| KeywordSearch component (debounced, accessible, highlight) | 4.2 | `frontend/src/features/backlog/components/keyword-search.tsx` |
| SortControl (sort by priority/date/status, direction toggle) | 4.3 | `frontend/src/features/backlog/components/sort-control.tsx` |
| Filter chain: BU → New only → keyword → sort | 4.2–4.3 | `backlog-list.tsx` `displayedItems` useMemo |
| Inline empty-filter state with contextual messages | 3.3 | `backlog-list.tsx` lines 278-330 |

### What This Story Adds

1. **Reusable `EmptyStateWithGuidance` component** extracted from the inline empty-filter block
2. **Chakra UI v3 `EmptyState` parts** (`Root`, `Content`, `Indicator`, `Title`, `Description`) instead of raw `Flex`/`Text`
3. **Contextual icons** (search vs filter) based on active filter type
4. **"Clear all filters" button** — one-click reset for all active filters
5. **Vixxo brand styling** and proper accessibility (`role="status"`, ARIA)

### CRITICAL: This Is a Refactor + Enhancement, Not Greenfield

The empty-filter state **already exists** inline in `backlog-list.tsx` (lines 278-330). This story:
- **Extracts** it into a standalone, reusable component
- **Enhances** it with Chakra UI v3 `EmptyState` parts and contextual icons
- **Adds** a "Clear all filters" button
- **Preserves** the existing contextual heading/description logic (keyword, BU, new-only combos)
- **Does NOT change** the `BacklogEmptyState` component (no-data state, lines 36-62) — that is a different state

### CRITICAL: Chakra UI v3 EmptyState API

Chakra UI v3 (3.32.0) has a built-in `EmptyState` component with these parts:

```tsx
import { EmptyState } from '@chakra-ui/react'

<EmptyState.Root size="md">
  <EmptyState.Content>
    <EmptyState.Indicator>
      {/* icon goes here */}
    </EmptyState.Indicator>
    <EmptyState.Title>Title</EmptyState.Title>
    <EmptyState.Description>Description</EmptyState.Description>
  </EmptyState.Content>
</EmptyState.Root>
```

**Props on `EmptyState.Root`:**
- `size`: `'sm' | 'md' | 'lg'` (default `'md'`)
- `colorPalette`: `'gray' | 'green' | 'teal'` etc.

Use `size="md"` or `size="lg"` for comfortable display in the backlog list area.

### CRITICAL: Icon Strategy

- Use Lucide React icons (`lucide-react` is already a Chakra UI v3 peer dependency)
- Search context: `LuSearchX` (search with X) or `LuSearch` (magnifying glass)
- Filter context: `LuFilterX` (filter with X) or `LuFilter` (filter funnel)
- Check what icons are already imported in the project; if `lucide-react` is not installed, use Chakra UI's built-in icon system or inline SVG

### Architecture Compliance

**From `architecture.md` and `project-context.md`:**

- Feature components: `frontend/src/features/backlog/components/`
- File names: `kebab-case.tsx`; components: `PascalCase`
- Local UI state: `useState`; server state: TanStack Query
- Immutable state updates only
- No `any` types; define TypeScript interfaces for all props
- Avoid new state-management libraries
- Vixxo brand colors via theme tokens (`brand.green`, `brand.teal`, `gray.*`)
- Focus styling: `_focusVisible` with `brand.green`

### Previous Story Intelligence (4-3)

- **Filter bar layout**: All filter/sort controls live in a `<Flex>` with `flexWrap="wrap"` and `gap="3"` — the empty state replaces the item list area below the filter bar, not the filter bar itself
- **Chakra UI v3**: Components use Chakra v3 patterns (slot-based like `Select.Root` / `Select.Content`). EmptyState follows same pattern
- **Testing**: Use real timers for backlog-list tests (Vitest fake timers interfere with React Query). Use `waitFor` for async assertions. When multiple Select components exist, disambiguate with `{ name: /pattern/i }` on combobox queries
- **Focus styling**: Match existing pattern: `_focusVisible` with `brand.green` outline
- **Lint**: Avoid non-component exports in component files; move helper types to a separate file or co-locate in the same file with the component

### Git Intelligence

- Recent commit `075c0d5`: "feat: add backlog filtering, search, and sorting controls" — this is the last commit on the current branch containing stories 4.1-4.3
- All Epic 4 filter/sort work is in `frontend/src/features/backlog/components/`
- The `backlog-list.test.tsx` file is large (~1063 lines) with comprehensive filter tests — new tests should follow existing patterns

### What NOT To Do

- **Do NOT** create a new page or route — this is a component within the existing backlog list
- **Do NOT** change the no-data `BacklogEmptyState` (lines 36-62) — only refactor the filter-empty inline block
- **Do NOT** add backend changes — this is purely frontend
- **Do NOT** introduce new state management (no Zustand, no Redux) — pass props from parent
- **Do NOT** hardcode hex colors — use theme tokens (`brand.green`, `brand.teal`, `gray.200`, etc.)
- **Do NOT** use `any` type — define proper TypeScript interfaces
- **Do NOT** break existing tests — the existing filter-empty tests in `backlog-list.test.tsx` should still pass (update selectors if needed after refactoring)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 4.4] — Empty state requirements + technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Component patterns, naming, feature-based organization
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#EmptyStateWithGuidance] — UX spec: icon, heading, helpful message, "Clear filters" action, suggestions
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States] — Empty state patterns: no results found + system empty
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Existing inline empty-filter block (lines 278-330) to extract
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem fields
- [Source: _bmad-output/implementation-artifacts/4-3-implement-sorting.md] — Previous story learnings (Chakra v3 patterns, testing, focus styling)
- [Source: https://chakra-ui.com/docs/components/empty-state] — Chakra UI v3 EmptyState component API

## Change Log

- 2026-02-09: Implemented EmptyStateWithGuidance component, integrated into BacklogList, added 29 unit tests + 3 integration tests. All 154 frontend tests pass. Both frontend and backend builds pass with zero TS errors.
- 2026-02-10: Addressed code review findings: added Vixxo brand styling + focus styles to EmptyStateWithGuidance, improved actionable guidance copy (incl. business unit assignment), resolved duplicate button accessible names, and strengthened icon tests to assert correct icon via test IDs. All frontend/backend tests and builds pass.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- lucide-react icons use `SearchX`/`FilterX` naming (not `LuSearchX`/`LuFilterX` which is the react-icons/lu prefix convention). Fixed on first test run.

### Completion Notes List

- Created `EmptyStateWithGuidance` component using Chakra UI v3 `EmptyState` parts (Root, Content, Indicator, Title, Description)
- Contextual icons: `SearchX` (keyword active) vs `FilterX` (filter-only) from `lucide-react`
- Contextual headings cover all filter combinations: keyword, BU-only, new-only, BU+new-only, mixed
- Contextual descriptions provide actionable suggestions for each combination, including reminders to check business unit assignment
- "Clear all filters" button always visible; individual clear buttons conditional on active filter
- `role="status"` on component root for screen reader accessibility
- Added Vixxo brand styling to the EmptyState (brand token-based colors, focus-visible outlines)
- Updated button labels for clarity and to avoid duplicate accessible names (e.g., "Clear search filter", "Turn off New only")
- Updated KeywordSearch clear icon button accessible name to "Clear search input"
- Replaced inline empty-filter block (lines 278-330) in `backlog-list.tsx` with the new component
- `onClearAll` handler resets `keywordQuery`, `selectedBusinessUnit`, and `showNewOnly` in one call
- Existing `BacklogEmptyState` (no-data state) preserved unchanged
- Updated existing `backlog-list.test.tsx` tests to match new button labels
- Added 3 new integration tests in `backlog-list.test.tsx`: "Clear all filters" reset, EmptyStateWithGuidance role="status" rendering, no-data empty state still works
- 29 unit tests in `empty-state-with-guidance.test.tsx` covering icons, headings, descriptions, buttons, callbacks, accessibility (icon assertions now verify correct icon via test IDs)
- Installed `lucide-react` as a new dependency for contextual icons
- Frontend: 154 tests pass, 0 regressions
- Backend: 137 tests pass, 0 regressions

### File List

- `frontend/src/features/backlog/components/empty-state-with-guidance.tsx` (new) — EmptyStateWithGuidance component
- `frontend/src/features/backlog/components/empty-state-with-guidance.test.tsx` (new) — 29 unit tests
- `frontend/src/features/backlog/components/backlog-list.tsx` (modified) — Replaced inline empty-filter block with EmptyStateWithGuidance, added import
- `frontend/src/features/backlog/components/backlog-list.test.tsx` (modified) — Updated button labels, added 3 integration tests
- `frontend/src/features/backlog/components/keyword-search.tsx` (modified) — Updated clear button accessible name to avoid duplicates
- `frontend/src/features/backlog/components/keyword-search.test.tsx` (modified) — Updated tests for clear button accessible name
- `frontend/package.json` (modified) — Added `lucide-react` dependency
- `package-lock.json` (modified) — Updated lockfile for new dependency
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — Story status synced to done
- `_bmad-output/implementation-artifacts/4-4-implement-empty-state-with-guidance.md` (modified) — Story file updated

## Senior Developer Review (AI)

- ✅ Implemented Vixxo brand styling and focus-visible styling for the filter-empty state component.
- ✅ Improved empty-state descriptions to include actionable suggestions, including checking business unit assignment.
- ✅ Resolved duplicate accessible button names between filter bar and empty state (e.g., KeywordSearch clear icon now uses "Clear search input").
- ✅ Strengthened unit tests to assert the correct icon is rendered (search vs filter) using stable `data-testid` selectors.
