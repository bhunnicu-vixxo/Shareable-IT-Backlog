# Story 4.1: Implement Business Unit Filter

Linear Issue ID: VIX-345
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to filter backlog items by business unit/department,
so that I can see only items relevant to my department.

## Acceptance Criteria

1. **Given** backlog items have business unit assignments (via `teamName`), **When** I select a business unit from the filter dropdown, **Then** the list updates instantly (<500ms) showing only items for that business unit
2. **And** the filter selection is visually indicated (Vixxo Green active state per UX spec)
3. **And** I can clear the filter to see all items (via "All" option or clear trigger)
4. **And** the filter persists during my session (component state)
5. **And** the filter dropdown is populated dynamically from the loaded backlog items' unique `teamName` values
6. **And** the results count updates to reflect filtered items (e.g., "Showing 12 items" → "Showing 5 items for Operations")
7. **And** when the filter returns no results, an EmptyStateWithGuidance-style message is shown with "Clear filter" action
8. **And** the filter is accessible: keyboard navigable, has ARIA label "Filter by business unit", and focus indicator uses Vixxo Green
9. **And** the existing "New only" filter continues to work in combination with the business unit filter
10. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
11. **And** unit tests cover the BusinessUnitFilter component, filter integration in BacklogList, and combined filter behavior

## Tasks / Subtasks

- [x] Task 1: Create BusinessUnitFilter component (AC: #1, #2, #3, #5, #8)
  - [x] 1.1: Create `frontend/src/features/backlog/components/business-unit-filter.tsx`
  - [x] 1.2: Use Chakra UI v3 `Select` (from `@chakra-ui/react`) with `createListCollection` (note: used `createListCollection` + `useMemo` instead of `useListCollection` for correct `.items` accessor)
  - [x] 1.3: Props: `items: BacklogItem[]`, `value: string | null`, `onChange: (value: string | null) => void`
  - [x] 1.4: Compute unique `teamName` values from `items` using `useMemo`, sort alphabetically, prepend "All Business Units" option
  - [x] 1.5: Style with Vixxo Green active state — use theme token `brand.green` for selected trigger border/accent
  - [x] 1.6: Include ARIA label "Filter by business unit" on `Select.Label` (visually hidden via CSS)
  - [x] 1.7: Support `Select.ClearTrigger` and "All Business Units" option to reset filter

- [x] Task 2: Integrate BusinessUnitFilter into BacklogList (AC: #1, #4, #6, #9)
  - [x] 2.1: Add `selectedBusinessUnit: string | null` state to `BacklogList` via `useState(null)`
  - [x] 2.2: Place `BusinessUnitFilter` above the list, before the "New only" toggle, in a filter bar `Flex`
  - [x] 2.3: Update `displayedItems` `useMemo` to chain both filters: business unit filter AND showNewOnly filter
  - [x] 2.4: Update results count text to reflect active filters (e.g., "Showing 5 items for Operations" or "Showing 3 new items for Operations")
  - [x] 2.5: Pass `items` (unfiltered) to `BusinessUnitFilter` so dropdown always shows all available business units

- [x] Task 3: Implement empty filter state (AC: #7)
  - [x] 3.1: When `displayedItems.length === 0` and business unit filter is active, show guidance message: "No items found for [Business Unit]. Try selecting a different business unit or clear the filter."
  - [x] 3.2: Include "Clear filter" button that resets `selectedBusinessUnit` to `null`
  - [x] 3.3: Reuse existing empty state pattern from story 3.3 (showNewOnly empty state) — extend to handle combined filter empty states

- [x] Task 4: Testing and verification (AC: #10, #11)
  - [x] 4.1: Create `frontend/src/features/backlog/components/business-unit-filter.test.tsx` — test render, selection, clear, keyboard nav, unique values extraction
  - [x] 4.2: Update `frontend/src/features/backlog/components/backlog-list.test.tsx` — test business unit filter integration, combined filters (business unit + new only), empty state, results count
  - [x] 4.3: Run `npm run build` in both backend and frontend — zero TypeScript errors
  - [x] 4.4: Run full test suite — 88 tests passed across 8 files

## Dev Notes

### What's Already Done (from Stories 1.1–3.4)

| Capability | Story | File |
|---|---|---|
| BacklogItemCard component (clickable, with onClick) | 3.1, 3.4 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| BacklogList component (with showNewOnly filter, result count) | 3.1, 3.3 | `frontend/src/features/backlog/components/backlog-list.tsx` |
| ItemDetailModal (Chakra UI Dialog) | 3.4 | `frontend/src/features/backlog/components/item-detail-modal.tsx` |
| StackRankBadge, NewItemBadge | 3.2, 3.3 | `frontend/src/shared/components/ui/stack-rank-badge.tsx`, inline in card |
| BacklogItem type (has `teamName` field) | 2.4 | `frontend/src/features/backlog/types/backlog.types.ts` |
| useBacklogItems hook (TanStack Query) | 3.1 | `frontend/src/features/backlog/hooks/use-backlog-items.ts` |
| Chakra UI v3 theme with Vixxo brand colors | 1.1 | `frontend/src/theme.ts` — `brand.green`, `brand.gray`, etc. |
| Status colors utility | 3.4 | `frontend/src/features/backlog/utils/status-colors.ts` |
| Shared date formatters | 3.4 | `frontend/src/utils/formatters.ts` |

### What This Story Adds

1. **BusinessUnitFilter component** — Chakra UI v3 Select dropdown populated from unique `teamName` values
2. **Filter integration in BacklogList** — Business unit filter combined with existing "New only" filter
3. **Filter bar UI** — Prominent filter area above the list (per UX spec: "Top filter bar with business unit dropdown")
4. **Empty filter state** — Guidance message when combined filters return no results

### CRITICAL: Business Unit = `teamName`

The `BacklogItem.teamName` field maps to the Linear team name. In this project context, Linear teams represent business units/departments. The filter dropdown dynamically extracts unique `teamName` values from loaded items.

**Important:** Do NOT hardcode business unit names. Extract them dynamically from the data so the filter automatically adapts as new teams/business units are added in Linear.

### CRITICAL: Chakra UI v3 Select API

Chakra UI v3 `Select` uses a compound component pattern with `useListCollection`. Key API:

```typescript
import { Select, useListCollection } from '@chakra-ui/react'

// Create collection from data
const collection = useListCollection({
  items: [
    { label: 'All Business Units', value: '__all__' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Finance', value: 'Finance' },
    // ... dynamically from teamName values
  ],
})

// Render
<Select.Root
  collection={collection}
  value={selectedValue ? [selectedValue] : []}
  onValueChange={(details) => onChange(details.value[0] ?? null)}
>
  <Select.HiddenSelect />
  <Select.Label>Filter by business unit</Select.Label>
  <Select.Control>
    <Select.Trigger>
      <Select.ValueText placeholder="All Business Units" />
    </Select.Trigger>
    <Select.IndicatorGroup>
      <Select.ClearTrigger />  {/* Optional: clear button */}
      <Select.Indicator />
    </Select.IndicatorGroup>
  </Select.Control>
  <Select.Positioner>
    <Select.Content>
      {collection.items.map((item) => (
        <Select.Item item={item} key={item.value}>
          {item.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Positioner>
</Select.Root>
```

**Key details:**
- `value` prop is `string[]` (even for single select)
- `onValueChange` gives `{ value: string[], items: T[] }`
- `collection` is created via `useListCollection({ items })`
- `deselectable` prop allows clicking selected item to clear (alternative to ClearTrigger)
- `Select.Label` provides accessibility label

### CRITICAL: Filter State Management

**Client-side filtering (mandatory for <500ms requirement):**
- Backend already returns all items via GET /api/backlog-items
- Frontend `useBacklogItems` hook loads all items with TanStack Query
- Filter state is local: `useState<string | null>(null)` in BacklogList
- Chain filters in single `useMemo`:

```typescript
const displayedItems = useMemo(() => {
  let filtered = items ?? []
  if (selectedBusinessUnit) {
    filtered = filtered.filter((item) => item.teamName === selectedBusinessUnit)
  }
  if (showNewOnly) {
    filtered = filtered.filter((item) => item.isNew)
  }
  return filtered
}, [items, selectedBusinessUnit, showNewOnly])
```

**Result count text logic:**
```typescript
const getResultCountText = () => {
  const count = displayedItems.length
  const parts: string[] = []
  if (showNewOnly) parts.push('new')
  const suffix = selectedBusinessUnit ? ` for ${selectedBusinessUnit}` : ''
  return `Showing ${count} ${parts.join(' ')}item${count !== 1 ? 's' : ''}${suffix}`
}
```

### CRITICAL: Visual Design per UX Spec

From UX design specification:
- **Location:** Top of page, prominent position (filter bar above list)
- **Active state:** Vixxo Green (#8E992E) — use `brand.green` theme token
- **Default state:** No filter active, shows "All Business Units" placeholder
- **Layout:** Filter bar as `HStack` or `Flex` containing BusinessUnitFilter + existing "New only" toggle
- **Results count:** "Showing X items" updates with active filter context

**Filter bar layout:**
```
[BusinessUnitFilter dropdown]  [New only (N) button]  "Showing X items for Y"
```

### CRITICAL: Accessibility Requirements

From UX spec and architecture:
- `Select.Label` with text "Filter by business unit" (use `VisuallyHidden` wrapper if design doesn't show visible label)
- Keyboard navigation: Arrow keys to navigate options, Enter to select, Escape to close
- Focus indicator: Vixxo Green outline (Chakra UI default focus ring, customized)
- ARIA: Chakra UI v3 Select has built-in ARIA roles and attributes
- Screen reader: Selection changes announced automatically by Select

### Architecture Compliance

**From architecture.md:**
- Feature component in `features/backlog/components/` ✅
- `kebab-case` file name (`business-unit-filter.tsx`) ✅
- `PascalCase` component name (`BusinessUnitFilter`) ✅
- Use theme tokens — no hardcoded hex ✅
- Client-side filtering for <500ms ✅
- TypeScript interfaces for props ✅
- Immutable state updates ✅

**From project-context.md:**
- Use `camelCase` for variables (`selectedBusinessUnit`, `teamName`) ✅
- Use TanStack Query for server state (existing `useBacklogItems`) ✅
- Use `useState` for local UI state (filter selection) ✅
- Error handling: provide specific, actionable guidance in empty state ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.1 Backlog List View | Depends on | BacklogList — add filter bar, modify displayedItems logic |
| 3.3 New Item Flagging | Depends on | Existing showNewOnly filter — combine with business unit filter |
| 3.4 Item Detail View | Related | ItemDetailModal unaffected — works with any filtered list |
| 4.2 Keyword Search | Forward | Will add search to same filter bar; design for extensibility |
| 4.3 Sorting | Forward | Will add sort controls; keep filter bar layout extensible |
| 4.4 Empty State | Forward | This story adds basic empty filter state; 4.4 will enhance with EmptyStateWithGuidance component |
| 8.5 BusinessUnitFilter component | Related | Epic 8.5 is a design system refinement of this component |

### Project Structure After This Story

```
frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── business-unit-filter.tsx      (NEW)
│       │   ├── business-unit-filter.test.tsx  (NEW)
│       │   ├── backlog-list.tsx               (MODIFIED — add filter bar, combine filters)
│       │   ├── backlog-list.test.tsx           (MODIFIED — add filter tests)
│       │   ├── backlog-item-card.tsx           (unchanged)
│       │   ├── item-detail-modal.tsx           (unchanged)
│       │   └── backlog-page.tsx                (unchanged)
│       ├── hooks/
│       │   └── use-backlog-items.ts            (unchanged)
│       └── types/
│           └── backlog.types.ts               (unchanged — teamName already exists)
```

### What NOT To Do

- **Do NOT** add backend filtering (query params like `?teamName=X`) — client-side is sufficient for MVP and meets <500ms. All data is already loaded by `useBacklogItems`
- **Do NOT** hardcode business unit names — extract dynamically from `items.map(i => i.teamName)`
- **Do NOT** use `NativeSelect` — use Chakra UI v3 `Select` (the collection-based one under "Collections" in docs) for richer UX and accessibility
- **Do NOT** hardcode hex colors — use `brand.green`, `brand.gray` from theme
- **Do NOT** create a separate API endpoint for business units — derive from loaded items
- **Do NOT** break the existing "New only" filter — combine both filters in the same `useMemo`
- **Do NOT** mutate the items array — use `items.filter()` to create new arrays
- **Do NOT** store filter state in URL params for MVP — `useState` is sufficient (URL params is a future enhancement)
- **Do NOT** use Redux/Zustand — per project-context.md, use `useState` for local UI state

### Performance Considerations

- **Client-side filter:** O(n) per filter — negligible for typical backlog sizes (<500 items)
- **Unique team extraction:** O(n) with `useMemo` — recomputed only when items change
- **No API call on filter change:** Instant re-render, well under <500ms target
- **`useListCollection`:** Recomputed only when unique teams change (memoized)

### Library/Framework Requirements

| Library | Version | Usage |
|---|---|---|
| `@chakra-ui/react` | v3.32.0+ (already installed) | Select component, layout components |
| TanStack Query | v5 (already installed) | useBacklogItems hook (existing) |
| React | 18+ (already installed) | useState, useMemo |

No new dependencies required for this story.

### Testing Strategy

**BusinessUnitFilter component tests:**
- Renders with placeholder text "All Business Units"
- Populates dropdown with unique teamName values from items
- Calls onChange with selected value when item chosen
- Calls onChange with null when cleared / "All" selected
- Handles empty items array gracefully
- Has accessible label "Filter by business unit"

**BacklogList integration tests:**
- BusinessUnitFilter renders in the filter bar
- Selecting a business unit filters the displayed items
- Clearing the filter shows all items
- Business unit filter + "New only" filter combine correctly
- Results count text reflects active filters
- Empty state shown when filters return no results
- "Clear filter" button in empty state resets filters

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 4.1] — Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — React + TanStack Query, feature-based organization
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#BusinessUnitFilter] — Component spec, Vixxo Green active state, top-level filter position
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Mechanics] — Filter → Scan → Understand flow, <500ms requirement
- [Source: _bmad-output/project-context.md] — Naming conventions, state management rules, anti-patterns
- [Source: frontend/src/theme.ts] — brand.green = #8E992E, brand.gray = #3E4543
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Current filter state (showNewOnly), displayedItems useMemo
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem.teamName field
- [Source: _bmad-output/implementation-artifacts/3-3-implement-new-item-flagging.md] — Client-side filter pattern, empty filter state pattern
- [Source: _bmad-output/implementation-artifacts/3-4-implement-item-detail-view.md] — Chakra UI v3 patterns, review fixes (DRY extraction)
- [Source: https://chakra-ui.com/docs/components/select] — Chakra UI v3 Select API (useListCollection, Select.Root, etc.)

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- Chakra UI v3 `useListCollection` returns an object without a `.items` accessor; switched to `createListCollection` + `useMemo`
- jsdom missing `ResizeObserver` and `Element.scrollTo` required by Zag.js/floating-ui; added polyfills to `vitest.setup.ts`
- Chakra UI v3 Select (Ark UI) requires realistic event sequences for item selection in tests; `@testing-library/user-event` + keyboard navigation used instead of `fireEvent.click`

### Completion Notes List

- **BusinessUnitFilter component** created with Chakra UI v3 Select using `createListCollection`. Dynamically extracts unique `teamName` values from items, sorted alphabetically, with "All Business Units" option prepended. Vixxo Green (`brand.green`) active state on trigger border when filter is active. ARIA label "Filter by business unit" is visually hidden. `Select.ClearTrigger` included.
- **BacklogList integration**: Added `selectedBusinessUnit` state via `useState(null)`. Filter bar uses `Flex` layout with BusinessUnitFilter + "New only" toggle + results count text. `displayedItems` useMemo chains both filters (business unit first, then showNewOnly). Results count dynamically includes filter context (e.g., "Showing 5 items for Operations").
- **Empty filter state**: Combined handler for business unit filter, "New only" filter, and both-active cases. Contextual message and buttons: "Clear filter" (resets BU), "Show all items" (resets new only).
- **Testing**: 8 unit tests for BusinessUnitFilter component + 6 new integration tests for BacklogList (19 total). Added `@testing-library/user-event` dev dependency for realistic event simulation. Added `ResizeObserver` and `scrollTo` polyfills to vitest.setup.ts.
- **Build**: `npm run build` passes with zero TypeScript errors in both frontend and backend.
- **Full suite**: 88 tests pass across 8 test files, zero regressions.

### File List

**New files:**
- `frontend/src/features/backlog/components/business-unit-filter.tsx` — BusinessUnitFilter component
- `frontend/src/features/backlog/components/business-unit-filter.test.tsx` — BusinessUnitFilter unit tests (8 tests)

**Modified files:**
- `frontend/src/features/backlog/components/backlog-list.tsx` — Added BU filter state, filter bar, chained filters, updated results count, combined empty states
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — Added 6 integration tests for BU filter (19 total)
- `frontend/vitest.setup.ts` — Added ResizeObserver, scrollTo, scrollIntoView polyfills for Zag.js/Chakra UI v3
- `frontend/package.json` — Added `@testing-library/user-event` dev dependency
- `package-lock.json` — Updated lockfile for new frontend dev dependency
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status: ready-for-dev → in-progress → review
- `_bmad-output/implementation-artifacts/4-1-implement-business-unit-filter.md` — Story file (this file)

## Change Log

- **2026-02-09**: Implemented Story 4.1 — Business Unit Filter. Created BusinessUnitFilter component with Chakra UI v3 Select, integrated into BacklogList with combined filter support, added empty filter states, and comprehensive tests (88 tests, 0 regressions).
