# Story 15.2: Add Status Color Indicators to Backlog List Items

Linear Issue ID: VIX-435
Status: ready-for-dev

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

- [ ] Task 1: Create status color mapping constant (AC: #1-#5, #6)
  - [ ] Create `frontend/src/features/backlog/utils/status-colors.ts`
  - [ ] Define `STATUS_COLOR_MAP` mapping `WorkflowStateType` → `{ color, bg, label }`:
    - `backlog` → light gray, "Not yet planned"
    - `unstarted` → blue, "Planned / Ready"
    - `started` → green, "In Progress"
    - `completed` → muted green, "Done"
    - `cancelled` → muted red, "Cancelled"
  - [ ] Export `getStatusColor(statusType: string)` function with fallback for unknown types
  - [ ] Ensure colors pass WCAG AA contrast and are distinguishable with color vision deficiency
- [ ] Task 2: Add status indicator to `BacklogItemCard` (AC: #1-#5, #7, #8)
  - [ ] Add a 3-4px left border to the card using `borderLeft` style with the status color
  - [ ] Add a tooltip (Chakra `Tooltip`) on the colored border area or a small dot showing the status label
  - [ ] Alternatively: add a small colored dot (`8px` circle) before the item title with tooltip
  - [ ] Ensure it works in both light and dark mode (check theme tokens)
- [ ] Task 3: Write tests (AC: #9)
  - [ ] Create `frontend/src/features/backlog/utils/status-colors.test.ts`
  - [ ] Test: each status type returns correct color values
  - [ ] Test: unknown status type returns fallback
  - [ ] Test: all colors have sufficient contrast ratio
  - [ ] Update `backlog-item-card.test.tsx`:
  - [ ] Test: card renders left-border with correct color for each status type
  - [ ] Test: tooltip shows correct status label

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

### Debug Log References

### Completion Notes List

### File List
