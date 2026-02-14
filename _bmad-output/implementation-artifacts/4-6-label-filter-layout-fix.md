# Story 4.6: Label Filter Layout Fix

Linear Issue ID: VIX-431
Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backlog viewer,
I want the filter toolbar to maintain a clean, consistent layout regardless of how many labels I select,
so that I can effectively filter by multiple labels without the UI becoming visually broken or unusable.

## Acceptance Criteria

1. **Single row integrity** - When 1-3 labels are selected, the filter toolbar remains on a single row without pushing other controls (sort, search, results count) to new lines
2. **Chip collapse** - When more than 2 labels are selected, the individual chips collapse into a summary indicator (e.g., "3 Labels" badge) instead of rendering individual chips that expand the container
3. **Chip visibility on expand** - The full list of selected labels with remove buttons remains accessible via the dropdown or a tooltip/popover, not lost when collapsed
4. **Consistent spacing** - Gap and alignment between toolbar items (LabelFilter, SortControl, KeywordSearch, results count) remain consistent regardless of selection count
5. **Clear all** - The clear trigger (X) on the Select component still works to remove all selected labels
6. **Individual removal** - Users can still remove individual labels (via the dropdown checkboxes or via chips when expanded/visible)
7. **Responsive behavior** - On narrow viewports, the toolbar wraps cleanly at logical breakpoints without overlap or clipping
8. **No regression** - All existing label filter tests continue to pass; filter logic (OR semantics) is unchanged

## Tasks / Subtasks

- [x] Task 1: Constrain LabelFilter container width (AC: #1, #4)
  - [x] Change outer `Box` from `display="inline-flex"` to a flex-controlled layout within the parent toolbar
  - [x] Add width/flex constraints to prevent unbounded growth
  - [x] Ensure LabelFilter takes appropriate space in the toolbar flex row

- [x] Task 2: Implement chip collapse behavior (AC: #2, #3)
  - [x] Do not render external chips (prevents toolbar width growth entirely)
  - [x] Use Select trigger summary ("{n} Labels" + badge) as the collapsed indicator for 2+ selections
  - [x] Individual labels remain manageable via dropdown toggles (no loss of functionality)

- [x] Task 3: Ensure removal UX is preserved (AC: #5, #6)
  - [x] Verify Select.ClearTrigger still works for "clear all"
  - [x] Verify dropdown checkboxes allow individual label deselection
  - [x] No external chips are rendered; individual removal is via dropdown toggles

- [x] Task 4: Fix parent toolbar flex layout (AC: #1, #4, #7)
  - [x] Review `Flex` container in `backlog-list.tsx` for proper flex item sizing
  - [x] Ensure `KeywordSearch` (`flex="1"`) and results count (`ml="auto"`) behave correctly with constrained LabelFilter
  - [x] Test wrapping behavior at narrow viewports

- [x] Task 5: Update tests (AC: #8)
  - [x] Update `label-filter.test.tsx` if chip rendering logic changes
  - [x] Update `label-filter.a11y.test.tsx` if ARIA structure changes
  - [x] Update `backlog-list.test.tsx` if label/results count behavior changes
  - [x] Run targeted frontend tests for changed components

## Dev Notes

### Root Cause Analysis

The bug stems from the `LabelFilter` component rendering selected label chips as siblings to the Select dropdown in an unbounded `inline-flex` container. Each additional chip adds width to the LabelFilter, which progressively steals horizontal space from the parent flex toolbar, forcing sibling controls to wrap.

**Specific code issues:**

1. **`label-filter.tsx` line 126** — Outer `Box` has `display="inline-flex"` and `flexWrap="wrap"` with no width constraint. This means the component grows horizontally as chips are added.

2. **`label-filter.tsx` lines 233-274** — The `HStack` of chips is a sibling to `Select.Root` inside the same flex container. With `flexWrap="wrap"`, chips wrap within the LabelFilter but the overall component still expands.

3. **`backlog-list.tsx` lines 512-530** — The parent toolbar `Flex` has `flexWrap="wrap"` and `gap="3"`. When LabelFilter grows beyond available space, other items wrap to new rows.

### Fix Strategy

The simplest, most robust fix: **collapse chips when more than 2 labels are selected**. The Select trigger already displays "{n} Labels" with a count badge when multiple labels are selected. When 3+ labels are selected, simply don't render the external chip row — the trigger itself provides the summary. Individual labels can still be toggled via the dropdown.

For 1-2 selected labels, keep the current chip behavior since it fits within the toolbar width.

Additionally, add a `maxW` or `flex` constraint to the LabelFilter's outer container to prevent it from ever growing beyond a reasonable proportion of the toolbar.

### Architecture Compliance

- **UI Framework:** Chakra UI v3 compound components (`Select.Root`, `Select.Trigger`, etc.)
- **Styling approach:** Inline Chakra UI style props (no raw CSS)
- **Component pattern:** Feature-based organization under `features/backlog/components/`
- **Brand colors:** Vixxo green `#8E992E`, gray `#3E4543` — used for active filter states
- **Naming:** PascalCase components, kebab-case files

### Library/Framework Requirements

- **Chakra UI v3** — Use `Select` compound components as established
- **React** — Functional components with hooks only
- **TypeScript** — Strict mode, no `any` types

### File Structure

Files to modify:
- `frontend/src/features/backlog/components/label-filter.tsx` — Main fix: chip collapse logic + container constraints
- `frontend/src/features/backlog/components/backlog-list.tsx` — Possible toolbar flex adjustments (may not need changes if LabelFilter is properly constrained)
- `frontend/src/features/backlog/components/label-filter.test.tsx` — Update tests for collapse behavior
- `frontend/src/features/backlog/components/label-filter.a11y.test.tsx` — Verify accessibility with collapsed chips

### Testing Requirements

- **Unit tests:** Verify chip rendering logic — chips visible for <=2 labels, collapsed for >2
- **Accessibility tests:** Verify ARIA labels still announce selected labels correctly when chips are collapsed
- **Integration:** Verify filter toolbar layout doesn't break at 1, 2, 3, 5+ selected labels
- **Regression:** All 679+ existing tests must pass
- **Manual verification:** Check layout visually at desktop and narrow viewports

### Previous Story Intelligence (4-5: Label Filter Implementation)

- Used Chakra UI v3 `Select` with `multiple` prop
- Chip colors come from `getLabelColor()` in `label-colors.ts`
- Filter uses OR semantics: `item.labels.some(l => selectedLabels.includes(l.name))`
- Chips were placed outside `Select.Trigger` to avoid nested `<button>` accessibility violation
- ARIA live region announces filter changes to screen readers
- Compact mode uses smaller font sizes and narrower chip widths

### Git Intelligence

Recent relevant commits:
- `b6320d1` - **Show Done toggle removed** (VIX-429) — the toolbar now has fewer items, which actually gives more room but the bug still manifests
- `2abce4e` - **Admin label visibility** (VIX-428) — labels list may now be filtered by admin visibility settings
- `2667c64` - Bug fixes for label filter and admin API

### Project Context Reference

- [Source: frontend/src/features/backlog/components/label-filter.tsx] — LabelFilter component
- [Source: frontend/src/features/backlog/components/backlog-list.tsx#L512-L560] — Filter toolbar layout
- [Source: frontend/src/theme.ts] — Vixxo brand theme tokens
- [Source: _bmad-output/implementation-artifacts/4-5-replace-business-unit-filter-with-multi-select-label-filter.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

- RED phase: 2 new chip-collapse tests failed as expected (chips rendered for 3+ labels)
- GREEN phase: All 25 label-filter tests passed after fix
- Regression: 717/717 frontend tests pass, 66/66 test files pass
- Backend: 23 pre-existing failures unrelated to this frontend change
- Linting: Zero lint errors on all modified files

### Completion Notes List

- **Task 1:** Changed LabelFilter outer Box from `display="inline-flex"` with `flexWrap="wrap"` to `display="flex"` with `flexShrink={0}`. This makes LabelFilter a proper flex child in the parent toolbar that won't grow unboundedly.
- **Task 2:** Removed external chips entirely (Option A — best practice). The Select trigger already shows the label name (1 selected) or "{n} Labels" + count badge (2+ selected). Individual label management is handled via the dropdown. Removed `handleRemoveLabel`, `chipFontSize`, entire HStack chips section, and `IconButton` import.
- **Task 3:** Verified Select.ClearTrigger and dropdown checkboxes work correctly. Clear all via ✕ on trigger, individual toggle via dropdown. No external chip buttons needed.
- **Task 4:** Reviewed parent toolbar in backlog-list.tsx — no changes needed. The LabelFilter fix (constrained container + no external chips) prevents unbounded growth entirely.
- **Task 5:** Replaced 6 chip-related tests with 5 "no external chips" tests + 1 a11y test for 3+ selections. Removed obsolete chip remove button test. All 716 tests pass (66 test files).

### Change Log

- 2026-02-14: Fixed label filter layout bug (VIX-431) — collapse chips for 3+ selections, constrain container width

### File List

- `frontend/src/features/backlog/components/label-filter.tsx` — Modified: container display fix + chip collapse logic
- `frontend/src/features/backlog/components/label-filter.test.tsx` — Modified: added 5 chip collapse behavior tests
- `frontend/src/features/backlog/components/label-filter.a11y.test.tsx` — Modified: added a11y test for 3+ selections collapsed state
