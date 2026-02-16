# Story 15.2: Add Status Color Indicators to Backlog List Items

Linear Issue ID: VIX-435
Status: done

## Story

As a business user,
I want to see a color indicator on each backlog item that represents its status,
so that I can visually scan a long list and instantly distinguish "In Progress" vs. "Planned" vs. "Blocked" items without reading the status text.

## Acceptance Criteria

1. **Given** an item with `statusType: "started"`, **When** I view it in the list, **Then** it displays a green color indicator (left-border or dot).
2. **Given** an item with `statusType: "unstarted"`, **When** I view it in the list, **Then** it displays a blue/gray color indicator.
3. **Given** an item with `statusType: "backlog"`, **When** I view it in the list, **Then** it displays a neutral/light gray indicator.
4. **Given** an item with `statusType: "completed"`, **When** I view it in the list, **Then** it displays a muted green indicator.
5. **Given** an item with `statusType: "cancelled"`, **When** I view it in the list, **Then** it displays a muted red indicator.
6. Colors must be distinguishable for colorblind users (use both hue and brightness differences).
7. A tooltip on hover explains what the color means (e.g., "Status: In Progress").
8. The indicator must not disrupt the existing layout — subtle left-border (3-4px) or small dot before the title.
9. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [x] Task 1: Create status color mapping constant (AC: #1-#5, #6)
  - [x] Create `frontend/src/features/backlog/utils/status-colors.ts`
  - [x] Define `STATUS_COLOR_MAP` mapping `WorkflowStateType` → `{ color, bg, label }`:
    - `backlog` → light gray, "Not yet planned"
    - `unstarted` → blue, "Planned / Ready"
    - `started` → green, "In Progress"
    - `completed` → muted green, "Done"
    - `cancelled` → muted red, "Cancelled"
  - [x] Export `getStatusColor(statusType: string)` function with fallback for unknown types
  - [x] Ensure colors pass WCAG AA contrast and are distinguishable with color vision deficiency
- [x] Task 2: Add status indicator to `BacklogItemCard` (AC: #1-#5, #7, #8)
  - [x] Add a 3-4px left border to the card using `borderLeft` style with the status color
  - [x] Add a tooltip (Chakra `Tooltip`) on the colored border area or a small dot showing the status label
  - [x] Alternatively: add a small colored dot (`8px` circle) before the item title with tooltip
  - [x] Ensure it works in both light and dark mode (check theme tokens)
- [x] Task 3: Write tests (AC: #9)
  - [x] Create `frontend/src/features/backlog/utils/status-colors.test.ts`
  - [x] Test: each status type returns correct color values
  - [x] Test: unknown status type returns fallback
  - [x] Test: all colors have sufficient contrast ratio
  - [x] Update `backlog-item-card.test.tsx`:
  - [x] Test: card renders left-border with correct color for each status type
  - [x] Test: tooltip shows correct status label

## Dev Notes

### Architecture Compliance

- **Utility location**: `frontend/src/features/backlog/utils/status-colors.ts` — follows pattern of `label-colors.ts` in same directory
- **Component modification**: `frontend/src/features/backlog/components/backlog-item-card.tsx`
- **Chakra UI v3**: Use Chakra `Tooltip` component for hover explanations. Use Chakra theme tokens for colors when possible.
- **No backend changes**: `statusType` is already available on `BacklogItem` objects — it's a `WorkflowStateType` field synced from Linear.

### Critical Implementation Details

- **`statusType` field**: Already on `BacklogItem` as `statusType: WorkflowStateType`. Values: `'backlog'`, `'unstarted'`, `'started'`, `'completed'`, `'cancelled'`, `'triage'`. Check `frontend/src/features/backlog/types/backlog.types.ts` for the exact type definition.
- **Color mapping (suggested)**:

  | Status Type | Color (light) | Color (dark) | Label |
  |---|---|---|---|
  | `backlog` | `gray.300` | `gray.600` | Not yet planned |
  | `triage` | `gray.400` | `gray.500` | Triage |
  | `unstarted` | `blue.400` | `blue.300` | Planned |
  | `started` | `green.500` | `green.400` | In Progress |
  | `completed` | `green.300` | `green.600` | Done |
  | `cancelled` | `red.300` | `red.600` | Cancelled |

- **Left border approach** (recommended): `borderLeft: "4px solid"`, `borderLeftColor: getStatusColor(item.statusType).color`. This is the least disruptive layout change — no new DOM elements, just a CSS property on the existing card.
- **Colorblind safety**: The palette uses different brightness levels AND hues. Green (started) vs. blue (unstarted) is the primary distinction — ensure brightness difference is sufficient. Consider adding a subtle icon or pattern for key states.
- **Pattern to follow**: See `getLabelColor()` in `frontend/src/features/backlog/utils/label-colors.ts` — same pattern of constant map + helper function.

### Existing Code to Reuse

- `getLabelColor()` pattern from `frontend/src/features/backlog/utils/label-colors.ts` — same architecture
- `BacklogItemCard` at `frontend/src/features/backlog/components/backlog-item-card.tsx` — card to modify
- `BacklogItem.statusType` — already available, no data fetching changes
- Chakra `Tooltip` component — already used in other components
- Chakra color tokens (`green.500`, `blue.400`, etc.) — theme-aware colors

### Anti-Patterns to Avoid

- Do NOT create a separate component for just a colored border — add it as a style prop on the existing card
- Do NOT use only color to convey status — include tooltip text for accessibility
- Do NOT use hard-coded hex colors — use Chakra theme tokens for dark/light mode compatibility
- Do NOT change the card height or width — the indicator should be purely additive styling
- Do NOT fetch additional data — `statusType` is already on the item

### Project Structure Notes

**New files:**
- `frontend/src/features/backlog/utils/status-colors.ts`
- `frontend/src/features/backlog/utils/status-colors.test.ts`

**Modified files:**
- `frontend/src/features/backlog/components/backlog-item-card.tsx` (add left-border and tooltip)
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` (add status indicator tests)

### References

- [Source: frontend/src/features/backlog/utils/label-colors.ts] — Pattern for color mapping utility
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Card component to modify
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem type, statusType field, WorkflowStateType
- [Source: _bmad-output/planning-artifacts/architecture.md] — Chakra UI v3, theme tokens, accessibility standards

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- **Task 1**: Enhanced `status-colors.ts` with `StatusColorEntry` interface adding `label` and `borderColor` fields. Added `triage` status type. Exported `getStatusColor()` helper with fallback for unknown types. All 15 unit tests pass.
- **Task 2**: Added 4px left-border color indicator to `BacklogItemCard` using `borderLeftWidth="4px"` and `borderLeftColor` from status mapping. Tooltip trigger is restricted to the indicator area (doesn’t fire when hovering anywhere on the card). Added `data-status-type` and `data-status-border-color` attributes for reliable testing.
- **Task 3**: Strengthened tests to validate AA badge contrast ratios (computed in unit tests) and to hover the indicator element for tooltip assertions. Added a small regression test for cancelled border token.
- **Build verification**: `npm -C frontend test`, `npm -C frontend run build`, `npm -C backend test`, `npm -C backend run build` all pass.

### File List

- `frontend/src/features/backlog/types/backlog.types.ts` — **modified**: added missing `triage` to `WorkflowStateType`
- `frontend/src/features/backlog/utils/status-colors.ts` — **modified**: typed mapping to `WorkflowStateType`, fixed started/cancelled indicator colors to match ACs, improved fallbacks
- `frontend/src/features/backlog/utils/status-colors.test.ts` — **modified**: added computed WCAG contrast assertions; tightened typing
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — **modified**: tooltip trigger limited to indicator region; added `data-status-border-color`
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — **modified**: hover indicator for tooltip tests; added border token assertion
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — **modified**: avoid duplicate `getStatusColor()` calls in render

### Change Log

- 2026-02-16: Implemented status color indicators — left-border + tooltip on BacklogItemCard. Enhanced status-colors utility with labels, border colors, triage status, and `getStatusColor()` helper. 731 tests passing, zero TypeScript errors.
- 2026-02-16: Senior review fixes — aligned indicator colors to ACs (green started, red cancelled), restricted tooltip to indicator area, added typed/contrast-checked status color tests.

## Senior Developer Review (AI)

- ✅ **AC alignment**: Started now uses a green indicator (`brand.green`), completed uses muted green (`brand.greenAccessible`), cancelled uses muted red (`error.red` / `error.redHover`), backlog remains neutral/light gray.
- ✅ **Tooltip behavior**: Tooltip triggers only when hovering the indicator area, not the entire card surface.
- ✅ **Test quality**: Status color tests now compute and assert WCAG AA contrast for badge pairings; card tests verify the indicator region and exposed border color token.
