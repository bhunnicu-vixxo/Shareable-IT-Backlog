# Story 9.2: Implement Virtual Scrolling or Pagination

Linear Issue ID: VIX-375
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want virtual scrolling for the backlog list so that only visible items are rendered in the DOM,
so that the application performs well with hundreds of backlog items, page load completes within 2 seconds, and scrolling remains smooth regardless of list size.

## Acceptance Criteria

1. **Given** the backlog contains hundreds of items, **When** the user views the backlog list, **Then** only the visible items (plus a small overscan buffer) are rendered in the DOM — not all items at once
2. **Given** the backlog list uses virtual scrolling, **When** the user scrolls up or down, **Then** scrolling is smooth (no jank or blank areas) and new items render seamlessly as they enter the viewport
3. **Given** the virtual list is active, **When** the user applies or changes filters (business unit, keyword, new-only), **Then** the virtual list resets scroll position and re-renders with the filtered subset — filtering still completes within 500ms
4. **Given** the virtual list is active, **When** the user changes sort order, **Then** the virtual list updates with reordered items — sorting still completes within 500ms
5. **Given** the backlog list renders with virtual scrolling, **When** initial page load occurs, **Then** page load completes within 2 seconds (only visible items rendered)
6. **Given** the virtual list is displayed, **When** the user clicks on a backlog item card, **Then** the detail modal opens correctly and focus returns to the clicked card on close (existing behavior preserved)
7. **Given** the virtual list is displayed, **When** the total item count is available, **Then** a summary is displayed showing the count of displayed items vs total items (e.g., "Showing 47 of 230 items")
8. **Given** the backlog list is empty (no items or all filtered out), **When** the list renders, **Then** the EmptyStateWithGuidance component displays correctly (not inside the virtual scroller)
9. **And** `npm run build` passes with zero TypeScript errors in `frontend/`
10. **And** all existing tests continue to pass (no regressions)
11. **And** new tests verify: virtual scrolling renders only visible items, scroll behavior, filter/sort reset, empty state handling

## Tasks / Subtasks

- [x] Task 1: Install @tanstack/react-virtual (AC: #1, #2)
  - [x] 1.1: Run `npm install @tanstack/react-virtual` in `frontend/`
  - [x] 1.2: Verify package installs successfully and TypeScript types are included (built-in, no @types package needed)
  - [x] 1.3: Verify compatibility with React 19 and existing TanStack Query v5

- [x] Task 2: Create a fixed-height scrollable container in backlog-list.tsx (AC: #1, #2, #5)
  - [x] 2.1: Replace the current `<VStack>` item map with a fixed-height scrollable container `<Box>` that uses `ref={parentRef}` for the virtualizer
  - [x] 2.2: Set container height to fill available viewport space using CSS `calc(100vh - <header+filters height>)` or a measured approach — the list MUST have a known, constrained height for virtualization to work
  - [x] 2.3: Set `overflow: 'auto'` on the container for scroll behavior
  - [x] 2.4: Ensure the container is responsive and works at all supported breakpoints

- [x] Task 3: Integrate useVirtualizer in backlog-list.tsx (AC: #1, #2, #3, #4)
  - [x] 3.1: Import `useVirtualizer` from `@tanstack/react-virtual`
  - [x] 3.2: Initialize virtualizer with: `count: displayedItems.length`, `getScrollElement: () => parentRef.current`, `estimateSize: () => ESTIMATED_CARD_HEIGHT` (estimate ~120-160px per BacklogItemCard based on current card height)
  - [x] 3.3: Set `overscan: 5` to pre-render 5 items above/below the viewport for smoother scrolling
  - [x] 3.4: Render the virtual list: outer `<div>` with `height: virtualizer.getTotalSize()`, inner items positioned absolutely using `virtualizer.getVirtualItems()` with `transform: translateY(item.start)`
  - [x] 3.5: Each virtual row renders `<BacklogItemCard>` with existing props (item, highlightTokens, onClick)
  - [x] 3.6: Preserve the `cardRefs` pattern for focus management on modal close — store refs by item ID on the virtual row elements

- [x] Task 4: Handle dynamic item heights (AC: #2)
  - [x] 4.1: Use `measureElement` callback from virtualizer to measure actual rendered item heights: pass `data-index={virtualItem.index}` and `ref={virtualizer.measureElement}` on each row wrapper
  - [x] 4.2: Set `estimateSize` to a reasonable default (e.g., 140px) — virtualizer will correct this as items are measured
  - [x] 4.3: Verify that items with different content lengths (long titles, labels, description) render correctly without overlap or gaps

- [x] Task 5: Handle filter/sort changes with scroll reset (AC: #3, #4)
  - [x] 5.1: When `displayedItems` changes (due to filter or sort changes), call `virtualizer.scrollToOffset(0)` to reset scroll position to top
  - [x] 5.2: Use a `useEffect` or integrate into existing memoization to detect when `displayedItems` identity changes and trigger scroll reset
  - [x] 5.3: Verify filtering and sorting still complete within 500ms (client-side operations — should be unaffected)

- [x] Task 6: Handle empty state correctly (AC: #8)
  - [x] 6.1: When `displayedItems.length === 0`, render `EmptyStateWithGuidance` directly — do NOT render the virtual scroller container
  - [x] 6.2: When `displayedItems.length > 0`, render the virtual scroller — do NOT render EmptyStateWithGuidance
  - [x] 6.3: Verify transition between empty and non-empty states works smoothly when filters change

- [x] Task 7: Display item count summary (AC: #7)
  - [x] 7.1: Add a subtle text element above or below the virtual list showing "Showing X of Y items" where X = displayedItems.length and Y = total items count (from the `items` array before filtering)
  - [x] 7.2: Only show this when filters are active (X !== Y) to avoid noise
  - [x] 7.3: Use Chakra UI `Text` with subtle styling (small font, muted color)

- [x] Task 8: Preserve focus management for detail modal (AC: #6)
  - [x] 8.1: Verify that clicking a virtualized item opens the detail modal correctly
  - [x] 8.2: On modal close, focus should return to the clicked card — since virtual items may be unmounted/remounted, use `virtualizer.scrollToIndex(clickedIndex)` before focusing the card ref
  - [x] 8.3: If the previously clicked card is not in the current virtual window, scroll it into view first, then focus

- [x] Task 9: Write tests (AC: #10, #11)
  - [x] 9.1: Test: Virtual list renders only a subset of items when given many items (mock large dataset, verify DOM node count is much less than total items)
  - [x] 9.2: Test: Virtual list displays all items when dataset is smaller than viewport (should gracefully handle small lists)
  - [x] 9.3: Test: Empty state renders EmptyStateWithGuidance when displayedItems is empty
  - [x] 9.4: Test: Item click handler works on virtualized items (opens detail modal)
  - [x] 9.5: Test: Filter changes update the virtual list (displayedItems change reflects in rendered output)
  - [x] 9.6: Test: All existing backlog-list tests continue to pass
  - [x] 9.7: Test: Item count summary shows correct counts when filters are active

- [x] Task 10: Build verification and manual testing (AC: #9, #10)
  - [x] 10.1: Run `npx tsc --noEmit` — zero TypeScript errors
  - [x] 10.2: Run `npx vitest run` — all tests pass (note pre-existing flaky keyboard tests)
  - [x] 10.3: If dev server is available, manually verify scrolling is smooth with the full dataset

## Dev Notes

### What's Already Done (CRITICAL — do not break existing behavior)

The following infrastructure is **already implemented** and must be preserved:

- **TanStack Query v5** — `QueryClient` configured with `gcTime: 10min`, smart retry (skip 4xx), `refetchOnWindowFocus: false`
- **Client-side filtering/sorting** — All filtering (business unit, keyword, new-only) and sorting happens client-side via `useMemo` in `backlog-list.tsx`. This MUST remain client-side — do NOT switch to server-side filtering/pagination
- **React.memo** — `BacklogItemCard`, `StackRankBadge`, `SyncStatusIndicator`, `EmptyStateWithGuidance`, `BusinessUnitFilter` are all wrapped with `React.memo`
- **useCallback** — 7 handlers in `backlog-list.tsx` are wrapped with `useCallback`: `handleClearKeyword`, `handleClearBusinessUnit`, `handleClearNewOnly`, `handleClearAll`, `handleToggleNewOnly`, `handleItemClick`, `handleCloseDetail`
- **useMemo** — 3 memoizations in `backlog-list.tsx`: `searchTokens`, `items` array, `displayedItems` (filtered + sorted)
- **cardRefs + lastClickedCardRef** — Used for focus management when detail modal closes. The card that was clicked is refocused. This pattern needs adaptation for virtual scrolling since items can be unmounted
- **apiFetchJson** — All API calls use `frontend/src/utils/api-fetch.ts` with consistent error handling
- **All items fetched in one request** — `useBacklogItems` fetches `GET /backlog-items` (default 50 items, but the frontend uses the full set). The backend serves from sync cache when populated. For virtual scrolling, we keep this approach since all data is needed for client-side filtering

**Existing backlog-list.tsx structure (key elements):**

| Element | Purpose | Virtual Scrolling Impact |
|---------|---------|------------------------|
| `displayedItems` useMemo | Filtered + sorted items | Becomes the `count` for virtualizer |
| `cardRefs` useRef | Focus management on modal close | Must adapt — virtual items unmount |
| `lastClickedCardRef` useRef | Tracks which card was clicked | Keep — used with scrollToIndex |
| `.map()` over displayedItems | Renders all items | REPLACE with virtual rows |
| `<VStack gap="4">` | Item container | REPLACE with fixed-height scroll container |
| `handleItemClick` | Opens detail modal | Keep — works on virtual items |
| `handleCloseDetail` | Closes modal, refocuses card | Adapt — scroll to index first |

**Current data flow (do NOT change):**

```
useBacklogItems() → items (all backlog items)
  → useMemo: displayedItems (filtered + sorted)
    → Virtual rows (NEW: only visible items rendered)
      → BacklogItemCard (React.memo'd)
```

### What This Story ADDS

1. **@tanstack/react-virtual** — New dependency for headless virtual scrolling
2. **Fixed-height scroll container** — Replace VStack with a height-constrained scrollable Box
3. **useVirtualizer** — Hook managing which items are visible and their positions
4. **Dynamic measurement** — `measureElement` callback for accurate item heights
5. **Scroll reset on filter/sort changes** — `scrollToOffset(0)` when displayedItems change
6. **Focus management adaptation** — `scrollToIndex` before refocusing card after modal close
7. **Item count display** — "Showing X of Y items" when filters are active

### Architecture Compliance

- **Virtual scrolling library**: `@tanstack/react-virtual` v3.13.18 — aligns with TanStack ecosystem (already using TanStack Query v5). Headless approach works with any UI library including Chakra UI [Source: architecture.md#Performance Optimization]
- **State management**: NO changes to state management — TanStack Query for server state, React hooks for local UI state. Virtual scrolling is purely a rendering optimization [Source: architecture.md#Frontend Architecture]
- **Client-side filtering preserved**: All filtering/sorting remains client-side in `useMemo`. Virtual scrolling only changes what is rendered, not the data flow [Source: architecture.md#Communication Patterns]
- **File locations**: All modifications in existing files except one new dependency
- **Naming**: kebab-case files, PascalCase components, camelCase functions/variables [Source: architecture.md#Naming Patterns]
- **Co-located tests**: Tests alongside source files [Source: architecture.md#Structure Patterns]

### Technical Requirements

**Why @tanstack/react-virtual over other options:**

| Option | Verdict | Rationale |
|--------|---------|-----------|
| `@tanstack/react-virtual` v3.13.18 | **SELECTED** | TanStack ecosystem alignment, headless (works with Chakra UI), supports dynamic heights, actively maintained, built-in TypeScript types |
| `react-window` | Rejected | Fixed-size items only (BacklogItemCard has variable height). Would require FixedSizeList which doesn't match our cards |
| `react-virtualized` | Rejected | Heavier, older, less maintained. CellMeasurer for dynamic heights is complex |
| Server-side pagination | Rejected | Would break client-side filtering UX. All items must be in memory for instant filter/sort |

**useVirtualizer Configuration (CRITICAL):**

```typescript
// In backlog-list.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = useRef<HTMLDivElement>(null)

const virtualizer = useVirtualizer({
  count: displayedItems.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 140, // Estimated card height in px
  overscan: 5,             // Pre-render 5 items above/below viewport
})
```

**Virtual List Render Pattern (CRITICAL):**

```typescript
<Box
  ref={parentRef}
  height="calc(100vh - 220px)" // Adjust based on header + filters height
  overflowY="auto"
>
  <div
    style={{
      height: `${virtualizer.getTotalSize()}px`,
      width: '100%',
      position: 'relative',
    }}
  >
    {virtualizer.getVirtualItems().map((virtualItem) => {
      const item = displayedItems[virtualItem.index]
      return (
        <div
          key={item.id}
          data-index={virtualItem.index}
          ref={virtualizer.measureElement}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualItem.start}px)`,
          }}
        >
          <BacklogItemCard
            item={item}
            highlightTokens={searchTokens}
            onClick={() => handleItemClick(item.id)}
          />
        </div>
      )
    })}
  </div>
</Box>
```

**Scroll Reset on Filter/Sort Changes:**

```typescript
// Reset scroll when displayed items change
const displayedItemsRef = useRef(displayedItems)
useEffect(() => {
  if (displayedItemsRef.current !== displayedItems) {
    displayedItemsRef.current = displayedItems
    virtualizer.scrollToOffset(0)
  }
}, [displayedItems, virtualizer])
```

**Focus Management on Modal Close:**

```typescript
const handleCloseDetail = useCallback(() => {
  setSelectedItemId(null)
  // Scroll the previously clicked card into view, then focus
  if (lastClickedIndex.current !== null) {
    virtualizer.scrollToIndex(lastClickedIndex.current, { align: 'center' })
    // Use requestAnimationFrame to wait for scroll + render
    requestAnimationFrame(() => {
      const cardEl = cardRefs.current[lastClickedId.current]
      cardEl?.focus()
    })
  }
}, [virtualizer])
```

### Library / Framework Requirements

| Library | Version | Purpose | New? |
|---------|---------|---------|------|
| `@tanstack/react-virtual` | `^3.13.18` | Headless virtual scrolling | **YES — install** |
| `@tanstack/react-query` | `^5.90.20` | Server state (existing) | No |
| `react` | `^19.2.0` | React hooks (existing) | No |
| `vitest` | existing | Testing framework | No |
| `@testing-library/react` | existing | Component testing | No |

### File Structure Requirements

**Files to MODIFY:**

| File | Changes |
|------|---------|
| `frontend/package.json` | Add `@tanstack/react-virtual` dependency |
| `frontend/src/features/backlog/components/backlog-list.tsx` | Replace `.map()` with virtual scrolling, add fixed-height container, useVirtualizer, scroll reset, focus management adaptation, item count display |
| `frontend/src/features/backlog/components/backlog-list.test.tsx` | Add virtual scrolling tests, update existing tests if DOM structure changes |

**Files to verify (not modify unless needed):**

| File | Verification |
|------|-------------|
| `frontend/src/features/backlog/components/backlog-item-card.tsx` | Verify React.memo works correctly inside virtual rows |
| `frontend/src/features/backlog/hooks/use-backlog-items.ts` | Verify all items are still fetched (no pagination in hook) |
| `frontend/src/features/backlog/types/backlog.types.ts` | Types already support pagination (PaginationInfo exists) |

**No new files needed** — all changes are in existing files plus one npm dependency.

### Testing Requirements

- Use `vitest` + `@testing-library/react`
- Import `render`, `screen` from `@/utils/test-utils` (includes ChakraProvider + QueryClientProvider)
- **All existing tests MUST pass unchanged** — backward compatibility is critical
- **Known flaky tests**: 4-7 keyboard-based Chakra Select interaction tests — pre-existing, not related to this story

**Testing @tanstack/react-virtual in jsdom:**

jsdom does not implement real layout (no `getBoundingClientRect`, no scroll events). To test virtual scrolling:

1. **Mock `useVirtualizer`** — For unit tests, mock the virtualizer to return all items (disable virtualization in test). This preserves existing test behavior
2. **Verify virtualizer integration** — Test that `useVirtualizer` is called with correct params (count, estimateSize, overscan)
3. **Test empty state** — Verify EmptyStateWithGuidance renders when no items
4. **Test item count** — Verify "Showing X of Y items" renders correctly
5. **Keep existing tests working** — If mocking virtualizer, existing tests that check for rendered items should still pass

```typescript
// Mock approach for existing tests
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 140,
        size: 140,
        key: i,
      })),
    getTotalSize: () => count * 140,
    scrollToOffset: vi.fn(),
    scrollToIndex: vi.fn(),
    measureElement: vi.fn(),
  }),
}))
```

### Performance Targets (from NFR)

| Metric | Target | How This Story Helps |
|--------|--------|---------------------|
| Page load | <2 seconds | Only visible items rendered — DOM size stays small regardless of total items |
| Filtering | <500ms | Client-side filtering unchanged — virtual list re-renders only visible subset |
| Interactions | <100ms | Fewer DOM nodes = faster re-renders. Combined with React.memo from 9.1 |
| Scrolling | Smooth (60fps) | Virtual scrolling renders only ~15-20 items at a time, not hundreds |

### What NOT To Do

- **Do NOT** switch to server-side pagination for filtering — all items must remain in memory for client-side filter/sort to work instantly
- **Do NOT** use `useInfiniteQuery` — we need all items loaded for client-side filtering. The current single-fetch approach is correct
- **Do NOT** remove the `displayedItems` useMemo — it's still needed to compute the filtered/sorted list that feeds into the virtualizer
- **Do NOT** use `react-window` FixedSizeList — BacklogItemCard has variable height (different title lengths, labels, etc.)
- **Do NOT** hard-code item heights — use `measureElement` for dynamic measurement with `estimateSize` as fallback
- **Do NOT** remove React.memo from BacklogItemCard — it prevents re-renders of items that haven't changed, which is even more important with virtual scrolling
- **Do NOT** remove useCallback wrappers from handlers — they prevent re-render cascades through memoized children
- **Do NOT** remove cardRefs — they're needed for focus management. Adapt the pattern, don't remove it
- **Do NOT** break the existing EmptyStateWithGuidance behavior — render it outside the virtual scroller when list is empty
- **Do NOT** add any new state management (Redux, Zustand, etc.) — architecture specifies TanStack Query + React hooks only
- **Do NOT** change query keys or cache configuration from Story 9.1
- **Do NOT** add infinite scroll (continuously loading more data from API) — we already have all data client-side

### Project Structure Notes

- All changes within `frontend/src/features/backlog/` — no backend changes
- Feature-based organization maintained
- One new npm dependency: `@tanstack/react-virtual`
- No new directories needed

### Previous Story Intelligence

**From Story 9.1 (Client-Side Caching and State Management) — CRITICAL CONTEXT:**

- `backlog-list.tsx` already has 7 `useCallback` wrappers, 3 `useMemo` blocks, and `useRef` for cardRefs and lastClickedCardRef
- BacklogItemCard is wrapped with `React.memo` — this is critical for virtual scrolling performance (prevents re-render of items whose props haven't changed)
- `displayedItems` useMemo dependency array: `[items, selectedBusinessUnit, showNewOnly, searchTokens, sortBy, sortDirection]` — this feeds directly into `virtualizer.count`
- `handleItemClick` uses inline closure per item to capture `item.id` and update refs — this pattern needs to work inside virtual rows
- `handleCloseDetail` refocuses the previously clicked card via `cardRefs.current[id]` — needs adaptation since virtual items unmount
- All items are fetched in a single request via `useBacklogItems()` — no changes needed to data fetching
- 551 tests passing (7 pre-existing flaky keyboard tests)

**From Story 8.3 (BacklogItemCard):**
- BacklogItemCard has variable content height (title can be 1-3 lines, labels vary, description preview)
- Card uses Chakra UI Box, HStack, VStack, Text components
- Card is clickable with hover/focus styles
- Skeleton variant (`BacklogItemCardSkeleton`) exists for loading states

**From Story 8.6 (EmptyStateWithGuidance):**
- Component receives callbacks: `onClearKeyword`, `onClearBusinessUnit`, `onClearNewOnly`, `onClearAll`
- Renders when `displayedItems.length === 0`
- Must NOT be inside the virtual scroller

### Git Intelligence

Recent commit pattern:
- `feat:` prefix with story number and Linear ID (e.g., `feat: implement client-side caching and state management optimizations (Story 9.1, VIX-374)`)
- Single commit per story implementation
- All changes in existing files where possible

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 9.2] — Story requirements and AC
- [Source: _bmad-output/planning-artifacts/architecture.md#Performance Optimization] — Memoization, lazy loading, <2s page load
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — State Management: TanStack Query + React hooks
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — Immutable updates, loading states
- [Source: _bmad-output/implementation-artifacts/9-1-implement-client-side-caching-and-state-management.md] — Previous story with all optimization context
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Current list implementation (343 lines)
- [Source: frontend/src/features/backlog/hooks/use-backlog-items.ts] — Current data fetching (32 lines, single fetch)
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Card component (248 lines, React.memo wrapped)
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — PaginationInfo, BacklogListResponse types
- [Source: backend/src/services/backlog/backlog.service.ts] — Backend supports cursor pagination (first/after)
- [Source: backend/src/controllers/backlog.controller.ts] — API supports first (1-250), after query params
- [Source: https://tanstack.com/virtual/latest] — @tanstack/react-virtual v3 documentation
- [Source: https://www.npmjs.com/package/@tanstack/react-virtual] — Package: v3.13.18, MIT, built-in TypeScript

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking (Cursor Agent)

### Debug Log References

- No debug issues encountered during implementation

### Completion Notes List

- Installed `@tanstack/react-virtual` v3.13.18 — compatible with React 19 and TanStack Query v5
- Replaced `<VStack>` item mapping with virtual scrolling using `useVirtualizer` hook
- Created fixed-height scrollable container with `calc(100vh - 220px)` height and `overflowY: auto`
- Implemented dynamic item height measurement via `measureElement` callback with `estimateSize: 140px` default
- Added scroll reset on filter/sort changes via `useEffect` tracking `displayedItems` identity changes
- Enhanced `getResultCountText()` to show "Showing X of Y items" when filters are active (X !== Y)
- Adapted focus management for virtual scrolling: `handleCloseDetail` uses `scrollToIndex` to bring clicked card into view, then `requestAnimationFrame` for manual focus restoration
- Added `lastClickedItemId` ref to track clicked item ID across virtual row unmount/remount cycles
- EmptyStateWithGuidance renders outside the virtual scroller when `displayedItems.length === 0`
- Updated `BacklogItemCard` to forward refs so focus restoration targets the actual clickable card element (not a wrapper)
- Fixed TypeScript build failure by typing `queryDefaults` as `DefaultOptions['queries']` (avoids requiring `queryKey`)
- Improved virtual scrolling tests: keep default “render all” behavior for most tests, but add a test that proves only a visible subset is rendered, plus a scroll reset assertion
- `npm --prefix frontend run test:run` passes (556 tests)
- `npm --prefix frontend run build` passes with zero TypeScript errors

### Change Log

- 2026-02-11: Implemented virtual scrolling for backlog list (Story 9.2, VIX-375)
- 2026-02-12: Addressed code review findings (build fix, stronger virtualization tests, focus restoration ref fix)

### File List

- `frontend/package.json` — Added `@tanstack/react-virtual` dependency
- `package-lock.json` — Updated lock file with new dependency
- `frontend/src/features/backlog/components/backlog-list.tsx` — Replaced VStack with virtual scrolling, added useVirtualizer, scroll container, scroll reset, focus management, item count summary
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — Added controllable virtualizer mock; tests for subset rendering + scroll reset; updated assertions for "X of Y" format
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — Added forwardRef support so list can focus the actual card element after modal close
- `frontend/src/utils/query-client-defaults.ts` — Fixed QueryClient default options typing so `npm run build` passes
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status
- `_bmad-output/implementation-artifacts/9-2-implement-virtual-scrolling-or-pagination.md` — Updated tasks, dev record, status

## Senior Developer Review (AI)

### Findings Addressed

- **Build blocker:** `npm --prefix frontend run build` previously failed due to incorrect `queryDefaults` type requiring `queryKey`. Fixed by typing defaults as `DefaultOptions['queries']`.
- **Test gap:** Virtualization tests previously mocked the virtualizer to return all items, so they didn’t prove “only visible items render”. Updated mock to allow a limited visible window and added a test verifying off-window items are not in the DOM.
- **Focus restore risk:** Refocusing after modal close previously targeted a wrapper element; updated `BacklogItemCard` to forward refs so focus restoration targets the actual clickable card.

### Verification

- `npm --prefix frontend run test:run` ✅
- `npm --prefix frontend run build` ✅
