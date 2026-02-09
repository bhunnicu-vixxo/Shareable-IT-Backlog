# Story 3.2: Implement Priority/Stack Rank Visualization

Linear Issue ID: Vix-341
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to see the priority/stack rank of items clearly,
so that I can understand what IT is prioritizing.

## Acceptance Criteria

1. **Given** backlog items have priority/stack rank values, **When** I view the backlog list, **Then** priority is displayed using StackRankBadge component with visual hierarchy that emphasizes higher priority items
2. **And** priority numbers are clearly visible and scannable with larger badges for higher priority (1 = Urgent largest, 4 = Low smallest)
3. **And** visual hierarchy uses size differentiation: Priority 1 badges are largest (e.g., 40px), Priority 2 badges are medium-large (e.g., 36px), Priority 3 badges are medium (e.g., 32px), Priority 4 badges are smaller (e.g., 28px)
4. **And** Priority 0 (None) badges remain at base size (32px) with gray styling
5. **And** all badges maintain circular shape and Vixxo Green (#8E992E) color for priorities 1-4
6. **And** priority is the primary sort indicator (already implemented in Story 3.1)
7. **And** visual scanning is enhanced through size-based hierarchy without compromising readability
8. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
9. **And** unit tests cover the enhanced StackRankBadge component with size variations
10. **And** visual regression tests verify size hierarchy (optional but recommended)

## Tasks / Subtasks

- [x] Task 1: Enhance StackRankBadge component with size hierarchy (AC: #1, #2, #3, #4, #5)
  - [x] 1.1: Update `frontend/src/shared/components/ui/stack-rank-badge.tsx` to accept optional `size` prop or calculate size from priority
  - [x] 1.2: Implement size mapping: Priority 1 = 40px, Priority 2 = 36px, Priority 3 = 32px, Priority 4 = 28px, Priority 0 = 32px
  - [x] 1.3: Ensure font size scales proportionally with badge size for readability
  - [x] 1.4: Update `frontend/src/shared/components/ui/stack-rank-badge.test.tsx` to test size variations
- [x] Task 2: Update BacklogItemCard to use enhanced badges (AC: #1)
  - [x] 2.1: Verify BacklogItemCard passes priority to StackRankBadge (should already work)
  - [x] 2.2: Ensure card layout accommodates variable badge sizes without breaking alignment
- [x] Task 3: Visual verification and testing (AC: #8, #9, #10)
  - [x] 3.1: Run `npm run build` in both `backend/` and `frontend/` to verify no TypeScript errors
  - [x] 3.2: Run `npm run test:run` to verify all tests pass including new size tests
  - [x] 3.3: Manual visual verification that size hierarchy is clear and scannable

## Dev Notes

### What's Already Done (from Stories 1.1–3.1)

| Capability | Story | File |
|---|---|---|
| StackRankBadge component (base implementation) | 3.1 | `frontend/src/shared/components/ui/stack-rank-badge.tsx` |
| BacklogItemCard using StackRankBadge | 3.1 | `frontend/src/features/backlog/components/backlog-item-card.tsx` |
| Priority sorting (backend) | 3.1 | `backend/src/services/backlog/backlog.service.ts` |
| Chakra UI v3 theme with Vixxo brand colors | 1.1 | `frontend/src/theme.ts` |
| Frontend backlog types with priority fields | 2.4 | `frontend/src/features/backlog/types/backlog.types.ts` |

### What This Story Adds

1. **Visual hierarchy enhancement** — StackRankBadge component now uses size differentiation to emphasize higher priority items
2. **Size-based scanning** — Larger badges for Priority 1 (Urgent) make high-priority items immediately scannable
3. **Proportional scaling** — Font size scales with badge size to maintain readability

### CRITICAL: StackRankBadge Current Implementation

From Story 3.1, the current StackRankBadge component:

```typescript
// frontend/src/shared/components/ui/stack-rank-badge.tsx
export function StackRankBadge({ priority, priorityLabel }: StackRankBadgeProps) {
  const isNone = priority === 0
  const displayValue = isNone ? '–' : String(priority)
  const bgColor = isNone ? 'gray.400' : 'brand.green'

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minWidth="32px"
      minHeight="32px"
      width="32px"
      height="32px"
      borderRadius="full"
      bg={bgColor}
      color="white"
      fontWeight="bold"
      fontSize="sm"
      lineHeight="1"
      flexShrink={0}
      aria-label={`Priority ${priorityLabel}`}
      role="img"
    >
      {displayValue}
    </Box>
  )
}
```

**Current behavior:**
- Fixed size: 32px × 32px for all priorities
- Vixxo Green (#8E992E) for priorities 1-4
- Gray for Priority 0 (None) with dash
- Font size: `sm` (Chakra UI default)

**Enhancement needed:**
- Variable size based on priority
- Proportional font size scaling
- Maintain circular shape and color scheme

### CRITICAL: Size Hierarchy Specification

From UX design spec and Epic 3 Story 2 requirements:

**Size Mapping:**
- **Priority 1 (Urgent):** 40px × 40px — Largest, most prominent
- **Priority 2 (High):** 36px × 36px — Large, noticeable
- **Priority 3 (Normal):** 32px × 32px — Medium, standard size
- **Priority 4 (Low):** 28px × 28px — Smaller, less prominent
- **Priority 0 (None):** 32px × 32px — Base size, gray styling

**Font Size Scaling:**
- Priority 1: `md` or `lg` (larger font for larger badge)
- Priority 2: `md` (medium font)
- Priority 3: `sm` (current size)
- Priority 4: `xs` (smaller font for smaller badge)
- Priority 0: `sm` (current size)

**Rationale:**
- Visual hierarchy helps users scan for urgent items quickly
- Size differentiation complements color (Vixxo Green) for accessibility
- Proportional font scaling maintains readability at all sizes

### CRITICAL: Implementation Approach

**Option 1: Calculate size from priority (Recommended)**
```typescript
function getBadgeSize(priority: number): { size: string; fontSize: string } {
  switch (priority) {
    case 1: return { size: '40px', fontSize: 'md' }
    case 2: return { size: '36px', fontSize: 'md' }
    case 3: return { size: '32px', fontSize: 'sm' }
    case 4: return { size: '28px', fontSize: 'xs' }
    case 0: return { size: '32px', fontSize: 'sm' }
    default: return { size: '32px', fontSize: 'sm' }
  }
}
```

**Option 2: Use Chakra UI size tokens**
```typescript
// Map to Chakra UI spacing scale if available
// Or use explicit pixel values for precise control
```

**Recommendation:** Use explicit pixel values for precise control over visual hierarchy. Chakra UI spacing scale may not provide the exact sizes needed.

### CRITICAL: BacklogItemCard Layout Compatibility

The BacklogItemCard uses `Flex` layout with `alignItems="flex-start"`:

```typescript
<Flex
  p="4"
  borderWidth="1px"
  borderColor="gray.200"
  borderRadius="md"
  gap="4"
  alignItems="flex-start"  // ← Aligns items to top
  ...
>
  <StackRankBadge ... />  // ← Variable size badge
  <Box flex="1" ...>      // ← Content area
    ...
  </Box>
</Flex>
```

**Considerations:**
- `alignItems="flex-start"` ensures badges align to top regardless of size
- Variable badge sizes should not break the layout
- Gap spacing (`gap="4"` = 16px) should accommodate largest badge (40px)
- Test with all priority levels to ensure visual alignment

### CRITICAL: Accessibility Requirements

**ARIA Labels:**
- Current: `aria-label={`Priority ${priorityLabel}`}`
- No change needed — size is visual, not semantic

**Color Contrast:**
- Vixxo Green (#8E992E) on white text must maintain WCAG Level A contrast
- Verify contrast at all badge sizes
- Size differentiation complements color (not sole indicator)

**Screen Reader:**
- Size changes are visual only
- ARIA label already provides semantic priority information
- No additional accessibility changes needed

### CRITICAL: Testing Requirements

**Unit Tests:**
- Test each priority level renders correct size
- Test font size scales correctly
- Test Priority 0 (None) maintains base size and gray color
- Test edge cases (invalid priority values)

**Visual Tests:**
- Manual verification that size hierarchy is clear
- Verify badges align properly in BacklogItemCard
- Check readability at all sizes

**Integration Tests:**
- Verify BacklogList displays items with correct badge sizes
- Verify sorting by priority still works (backend logic unchanged)

### Architecture Compliance

**From architecture.md:**
- Component-based frontend architecture ✅
- Shared UI components in `shared/components/ui/` ✅
- Feature components in `features/backlog/components/` ✅
- TypeScript strict mode ✅
- Chakra UI v3 component patterns ✅

**From project-context.md:**
- Use Chakra UI theme tokens (`brand.green`) ✅
- Maintain accessibility standards ✅
- No hardcoded hex values (use theme tokens) ✅

**From UX design spec:**
- Visual hierarchy for priority scanning ✅
- Vixxo Green (#8E992E) for priority indicators ✅
- Size differentiation complements color ✅
- Maintains "Clean & Scannable" design direction ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 3.1 Backlog List View | Depends on | StackRankBadge component created here, BacklogItemCard uses it |
| 3.3 New Item Flagging | Depended on by | Enhanced badges will work with flagging indicators |
| 3.4 Item Detail View | Depended on by | Detail view may reuse StackRankBadge with size hierarchy |
| 8.2 StackRankBadge Component | Related | Story 8.2 created base component; this story enhances it |
| 4.3 Sorting | Related | Visual hierarchy complements priority-based sorting |

### Project Structure After This Story

```
frontend/src/
├── shared/
│   └── components/
│       └── ui/
│           ├── stack-rank-badge.tsx           (MODIFIED — size hierarchy)
│           └── stack-rank-badge.test.tsx       (MODIFIED — size tests)
├── features/
│   └── backlog/
│       └── components/
│           └── backlog-item-card.tsx          (unchanged — uses enhanced badge)
└── ...
```

### What NOT To Do

- **Do NOT change badge colors** — Vixxo Green for priorities 1-4, gray for Priority 0
- **Do NOT change Priority 0 styling** — Keep gray color and dash, maintain base size
- **Do NOT modify backend sorting logic** — Priority sorting is already correct in Story 3.1
- **Do NOT break BacklogItemCard layout** — Ensure variable sizes don't cause alignment issues
- **Do NOT use Chakra UI v2 API** — Use Chakra UI v3 component patterns
- **Do NOT hardcode hex values** — Use theme tokens (`brand.green`, `gray.400`)
- **Do NOT skip accessibility** — Maintain ARIA labels and contrast requirements
- **Do NOT make badges too large** — Maximum 40px for Priority 1 to maintain layout balance
- **Do NOT make badges too small** — Minimum 28px for Priority 4 to maintain readability

### Performance Considerations

- **Rendering:** Size calculation is trivial (switch statement) — no performance impact
- **Layout:** Variable badge sizes don't affect list rendering performance
- **Bundle size:** No new dependencies — only component logic changes

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 3.2] — Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom Components] — StackRankBadge component specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — Color system and visual hierarchy principles
- [Source: _bmad-output/implementation-artifacts/3-1-implement-backlog-list-view-component.md] — Previous story learnings and StackRankBadge base implementation
- [Source: frontend/src/shared/components/ui/stack-rank-badge.tsx] — Current StackRankBadge implementation
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — BacklogItemCard usage of StackRankBadge
- [Source: frontend/src/theme.ts] — Chakra UI v3 theme configuration with brand tokens
- [Source: @chakra-ui/react v3.32.0 docs] — Chakra UI v3 component API and sizing patterns

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

No issues encountered. Clean implementation with all tests passing on first GREEN phase attempt.

### Completion Notes List

- **Task 1:** Added `getBadgeDimensions()` exported utility function to `stack-rank-badge.tsx` that maps priority levels to badge size and font size. Priority 1 (Urgent) gets 40px/md, Priority 2 (High) gets 36px/md, Priority 3 (Normal) stays at 32px/sm, Priority 4 (Low) gets 28px/xs, and Priority 0 (None) keeps 32px/sm with gray styling. Added `BadgeDimensions` interface. Updated the `StackRankBadge` component to use dynamic size/fontSize from `getBadgeDimensions()` instead of hard-coded 32px.
- **Task 1 Tests:** Added 13 new tests — 6 unit tests for `getBadgeDimensions()` covering all priority levels plus unknown values, and 7 rendering tests verifying correct inline styles (width/height) for each priority, color preservation for priorities 1-4 (Vixxo Green), and gray styling for Priority 0. All 19 tests pass (6 original + 13 new).
- **Task 2:** Verified BacklogItemCard already passes `item.priority` to `StackRankBadge` — no code changes needed. The `Flex` layout with `alignItems="flex-start"` and `gap="4"` accommodates all badge sizes (28px–40px) without alignment issues. All 8 BacklogItemCard tests pass unchanged.
- **Task 3:** Both `npm run build` (frontend: tsc + vite, backend: tsc) succeed with zero TypeScript errors. Full test suite: 38 tests across 5 files, all passing. No linter errors.

### Change Log

- 2026-02-09: Implemented priority-based size hierarchy for StackRankBadge component. Added `getBadgeDimensions()` utility and 13 new unit tests. All ACs satisfied.
- 2026-02-09: **Senior Developer Review (AI)** — Fixed 2 HIGH and 4 MEDIUM issues: (1) Gray color test now asserts `data-bg="gray.400"` instead of only dash; (2) Vixxo Green test asserts `data-bg="brand.green"`; (3) Added BacklogList integration test for size hierarchy; (4) Exported `BadgeDimensions` interface; (5) Added font size verification tests; (6) Added edge-case tests and JSDoc for invalid priority values.

### Senior Developer Review (AI)

**Reviewer:** Rhunnicutt on 2026-02-09

**Issues Fixed:**
- **HIGH:** Gray color test verified wrong behavior — now asserts `data-bg="gray.400"`
- **HIGH:** Vixxo Green test used weak assertion — now asserts `data-bg="brand.green"`
- **MEDIUM:** Added BacklogList integration test for mixed-priority size hierarchy
- **MEDIUM:** Exported `BadgeDimensions` interface for API ergonomics
- **MEDIUM:** Added font size verification tests with `data-font-size` attribute
- **MEDIUM:** Added edge-case tests for negative/non-integer priority, JSDoc for `getBadgeDimensions`

**Verification:** 42 tests pass, frontend build succeeds.

### File List

- `frontend/src/shared/components/ui/stack-rank-badge.tsx` — MODIFIED (getBadgeDimensions, BadgeDimensions export, data-bg/data-font-size for tests)
- `frontend/src/shared/components/ui/stack-rank-badge.test.tsx` — MODIFIED (fixed color tests, font size tests, edge-case tests)
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — MODIFIED (added size hierarchy integration test)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (status: ready-for-dev → review)
- `_bmad-output/implementation-artifacts/3-2-implement-priority-stack-rank-visualization.md` — MODIFIED (story file updates)
