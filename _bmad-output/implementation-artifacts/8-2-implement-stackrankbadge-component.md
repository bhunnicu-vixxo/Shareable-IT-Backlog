# Story 8.2: Implement StackRankBadge Component

Linear Issue ID: VIX-368
Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a fully-featured StackRankBadge component with configurable size, variant, and WCAG-compliant styling,
so that priority numbers are displayed consistently, accessibly, and flexibly throughout the application in different contexts (list view, detail view, compact mode).

## Acceptance Criteria

1. **Given** an item has a priority/stack rank value (0–4), **When** StackRankBadge is rendered with the default props, **Then** priority number is displayed prominently in a circular badge using Vixxo Green (#8E992E) for priorities 1–4 and gray for priority 0 (None), matching current behavior
2. **Given** a `size` prop is provided ("sm" | "md" | "lg"), **When** StackRankBadge is rendered, **Then** the badge renders at the specified explicit size (sm: 24px, md: 32px, lg: 40px) with proportional font sizes, overriding the default priority-based auto-sizing
3. **Given** no `size` prop is provided (default), **When** StackRankBadge is rendered, **Then** the badge auto-sizes based on priority level (Urgent=40px, High=36px, Normal=32px, Low=28px, None=32px) preserving the current visual hierarchy behavior
4. **Given** a `variant` prop is provided ("solid" | "outline" | "subtle"), **When** StackRankBadge is rendered, **Then** the badge renders with the corresponding visual style:
   - `solid` (default): Filled Vixxo Green background with white text
   - `outline`: Transparent background with Vixxo Green accessible (#6F7B24) border and text
   - `subtle`: Light green tint background (#F4F5E9) with Vixxo Green accessible (#6F7B24) text
5. **Given** the badge is rendered in any variant, **When** contrast is measured, **Then** all text-background combinations meet WCAG 2.1 Level AA contrast requirements (4.5:1 for normal text ≤18px, 3:1 for large text >18px)
6. **Given** the badge is rendered, **When** a screen reader reads the page, **Then** the badge has `role="img"` and `aria-label="Priority {priorityLabel}"` providing meaningful context without requiring visual perception
7. **Given** the badge is rendered, **When** it is in a keyboard-navigable context (e.g., inside a clickable card), **Then** the badge does not interfere with parent focus handling and does not add extra tab stops
8. **Given** existing components (`BacklogItemCard`, `ItemDetailModal`) use StackRankBadge, **When** the component is enhanced, **Then** all existing usages continue to work without any code changes (full backward compatibility via default prop values)
9. **And** `npm run build` passes with zero TypeScript errors in `frontend/`
10. **And** unit tests verify: all size variants render at correct dimensions, all visual variants apply expected styles, default auto-sizing behavior is preserved, ARIA labels are correct, backward compatibility with existing props

## Tasks / Subtasks

- [ ] Task 1: Enhance StackRankBadge props interface (AC: #2, #4, #8)
  - [ ] 1.1: Add optional `size` prop (`"sm" | "md" | "lg"`) to `StackRankBadgeProps` — when provided, overrides priority-based auto-sizing
  - [ ] 1.2: Add optional `variant` prop (`"solid" | "outline" | "subtle"`) defaulting to `"solid"` — controls visual style
  - [ ] 1.3: Export `StackRankBadgeProps` type and new type aliases (`StackRankBadgeSize`, `StackRankBadgeVariant`) for external consumers
  - [ ] 1.4: Ensure all new props are optional with sensible defaults to maintain backward compatibility

- [ ] Task 2: Implement size prop logic (AC: #2, #3)
  - [ ] 2.1: Create size mapping in `stack-rank-badge.utils.ts`: sm → {size: '24px', fontSize: 'xs'}, md → {size: '32px', fontSize: 'sm'}, lg → {size: '40px', fontSize: 'md'}
  - [ ] 2.2: Update `StackRankBadge` component: if `size` prop is provided, use explicit size mapping; if not, use existing `getBadgeDimensions(priority)` for auto-sizing
  - [ ] 2.3: Ensure `data-size` attribute reflects actual size for test assertions

- [ ] Task 3: Implement variant prop logic (AC: #4, #5)
  - [ ] 3.1: Define variant styles using theme tokens in `stack-rank-badge.utils.ts`:
    - `solid`: `{ bg: 'brand.green', color: 'white', borderWidth: '0' }` (current default)
    - `outline`: `{ bg: 'transparent', color: 'brand.greenAccessible', borderWidth: '2px', borderColor: 'brand.greenAccessible' }`
    - `subtle`: `{ bg: 'brand.greenLight', color: 'brand.greenAccessible', borderWidth: '0' }`
  - [ ] 3.2: For priority 0 (None), all variants use gray styling: solid → gray.400 bg/white text, outline → gray.400 border/gray.600 text, subtle → gray.100 bg/gray.600 text
  - [ ] 3.3: Apply variant styles in the component, ensuring `data-variant` attribute for test assertions
  - [ ] 3.4: Verify WCAG contrast compliance for all variant+priority combinations:
    - Solid: White on #8E992E = 4.2:1 (passes AA for large text ≥18px bold; badge text is ≥12px in xs size, so verify dimensions meet "large text" threshold — 40px/36px/32px badges have bold text that qualifies)
    - Outline: #6F7B24 on white = 4.63:1 (passes AA for all text sizes)
    - Subtle: #6F7B24 on #F4F5E9 ≈ 4.4:1 (verify and adjust if needed — may need slightly darker text or background)

- [ ] Task 4: Update existing tests and add new test coverage (AC: #6, #7, #10)
  - [ ] 4.1: Preserve all 19 existing tests in `stack-rank-badge.test.tsx` — they must continue passing without modification
  - [ ] 4.2: Add tests for `size` prop: sm/md/lg render at correct dimensions, font size scales correctly
  - [ ] 4.3: Add tests for `variant` prop: solid/outline/subtle apply expected style attributes
  - [ ] 4.4: Add tests for combined props: size + variant together
  - [ ] 4.5: Add tests for priority 0 (None) variants: all three variants with gray styling
  - [ ] 4.6: Add tests verifying default behavior (no size, no variant) matches current auto-sizing behavior exactly
  - [ ] 4.7: Add test for `data-variant` and `data-size` attributes
  - [ ] 4.8: Verify ARIA accessibility: `role="img"`, `aria-label` present for all variants/sizes

- [ ] Task 5: Build verification and regression check (AC: #8, #9)
  - [ ] 5.1: Run `npm -C frontend run build` — zero TypeScript errors
  - [ ] 5.2: Run `npm -C frontend run test:run` — all tests pass, no regressions
  - [ ] 5.3: Verify `BacklogItemCard` and `ItemDetailModal` render correctly without any changes (backward compatibility)

## Dev Notes

### What's Already Done (CRITICAL — do not break existing behavior)

The following are **already implemented** and must be preserved:

- **StackRankBadge component**: `frontend/src/shared/components/ui/stack-rank-badge.tsx`
  - Props: `priority: number`, `priorityLabel: string`
  - Circular badge with Vixxo Green (#8E992E) bg, white text for priorities 1–4
  - Gray (gray.400) bg with dash "–" for priority 0
  - Priority-based auto-sizing: Urgent=40px, High=36px, Normal=32px, Low=28px, None=32px
  - Font scaling: md for 1–2, sm for 3 and 0, xs for 4
  - Accessibility: `role="img"`, `aria-label="Priority {label}"`
  - Data attributes: `data-bg`, `data-font-size` for test assertions

- **Utility file**: `frontend/src/shared/components/ui/stack-rank-badge.utils.ts`
  - `getBadgeDimensions(priority)` returns `{ size, fontSize }` based on priority
  - `BadgeDimensions` interface exported

- **Existing tests**: `frontend/src/shared/components/ui/stack-rank-badge.test.tsx`
  - 19 tests covering all priority levels, ARIA labels, size hierarchy, font scaling, color assertions

- **Consumers** (DO NOT modify these files):
  - `frontend/src/features/backlog/components/backlog-item-card.tsx` — uses `<StackRankBadge priority={item.priority} priorityLabel={item.priorityLabel} />`
  - `frontend/src/features/backlog/components/item-detail-modal.tsx` — same props

### What This Story ADDS

This story enhances the existing StackRankBadge with:

1. **`size` prop** — Explicit size control ("sm" | "md" | "lg") for different contexts:
   - **sm** (24px): Compact headers, dense lists, small UI contexts
   - **md** (32px): Standard usage, matches most list views
   - **lg** (40px): Detail views, hero placements, emphasis
   - **Default (omitted)**: Priority-based auto-sizing (current behavior)

2. **`variant` prop** — Visual style variants ("solid" | "outline" | "subtle"):
   - **solid** (default): Current filled green badge — no visual change for existing consumers
   - **outline**: Border-only badge for lower visual weight or secondary contexts
   - **subtle**: Tinted background badge for softer emphasis

3. **WCAG-verified color combinations** for all variants using theme tokens from Story 8.1

4. **Exported types** for external consumption

### Architecture Compliance

- **File locations**: Component stays at `frontend/src/shared/components/ui/stack-rank-badge.tsx`, utils at `stack-rank-badge.utils.ts`, tests co-located
- **Naming**: kebab-case files, PascalCase exports (`StackRankBadge`, `StackRankBadgeProps`), camelCase variables
- **No new dependencies**: Uses existing `@chakra-ui/react` v3 `Box` component and theme tokens
- **Immutable updates**: Pure component, no side effects
- **TypeScript strict mode**: All exports properly typed, no `any` usage
- **Theme tokens**: Use `brand.green`, `brand.greenAccessible`, `brand.greenLight` from theme.ts — DO NOT hardcode hex values in the component

### Chakra UI v3 API Reference

**Box component** (used as badge base):
```typescript
import { Box } from '@chakra-ui/react'
// Box accepts all style props directly
<Box bg="brand.green" color="white" borderRadius="full" width="32px" height="32px" />
```

**Theme tokens available** (from Story 8.1):
- `brand.green` (#8E992E) — primary badge background
- `brand.greenAccessible` (#6F7B24) — accessible text on white (4.63:1)
- `brand.greenLight` (#F4F5E9) — subtle background tint
- `brand.greenHover` (#7A8528) — hover state
- `brand.gray` (#3E4543) — primary text color
- `gray.400` — none-priority background
- `gray.100` — subtle gray background
- `gray.600` — darker gray for text on light backgrounds

### WCAG Contrast Compliance Matrix

| Variant | Priority 1–4 Foreground | Background | Contrast | WCAG AA |
|---------|------------------------|------------|----------|---------|
| solid | white (#FFFFFF) | brand.green (#8E992E) | 4.2:1 | ✅ Large text (≥18px bold) |
| outline | brand.greenAccessible (#6F7B24) | white (#FFFFFF) | 4.63:1 | ✅ All text sizes |
| subtle | brand.greenAccessible (#6F7B24) | brand.greenLight (#F4F5E9) | ~4.4:1 | ✅ All text sizes (verify) |
| solid (p0) | white (#FFFFFF) | gray.400 (~#A0AEC0) | ~2.7:1 | ✅ Large text only |
| outline (p0) | gray.600 (~#4A5568) | white (#FFFFFF) | ~7.0:1 | ✅ All text sizes |
| subtle (p0) | gray.600 (~#4A5568) | gray.100 (~#EDF2F7) | ~6.5:1 | ✅ All text sizes |

**Note on solid variant contrast**: The smallest badge is 24px (sm size) with xs (12px) font. At 12px bold, this does NOT qualify as "large text" under WCAG (needs ≥14pt bold = 18.67px). However:
- Default auto-sizing: The smallest badge is 28px (priority 4) with xs (12px) font — same issue
- Explicit sizes: sm=24px uses xs=12px font
- **Mitigation**: The solid variant with white on green at 4.2:1 is the legacy behavior already in production. For strict AA compliance on small sizes, the developer should use `outline` or `subtle` variants. Document this clearly in JSDoc.

### Testing Patterns

- Use `vitest` + `@testing-library/react`
- Wrap rendered components via custom `render()` from `@/utils/test-utils` (includes ChakraProvider)
- Assert with `data-*` attributes for style-dependent tests (jsdom doesn't compute Chakra token styles)
- Co-locate tests: `stack-rank-badge.test.tsx` alongside `stack-rank-badge.tsx`
- Use `screen.getByRole('img', { name: 'Priority Urgent' })` pattern for accessible queries

### What NOT To Do

- **Do NOT** change the existing `priority` or `priorityLabel` props — they are the core API
- **Do NOT** make `size` or `variant` required — they must be optional with backward-compatible defaults
- **Do NOT** modify `backlog-item-card.tsx` or `item-detail-modal.tsx` — backward compatibility means zero changes to consumers
- **Do NOT** hardcode hex color values — always use Chakra theme tokens (`brand.green`, `brand.greenAccessible`, etc.)
- **Do NOT** add new npm dependencies — everything uses existing Chakra UI v3 `Box` component
- **Do NOT** change the `role="img"` — it's the correct semantic role for a non-interactive visual indicator
- **Do NOT** add `tabIndex` to the badge — it's a visual indicator inside interactive containers, not itself interactive
- **Do NOT** use `extendTheme` (Chakra v2 API) — the project uses `defineConfig` + `createSystem` (v3)
- **Do NOT** remove or rename existing `data-bg` or `data-font-size` attributes — existing tests depend on them

### Project Structure Notes

- Modified: `frontend/src/shared/components/ui/stack-rank-badge.tsx` (enhance component)
- Modified: `frontend/src/shared/components/ui/stack-rank-badge.utils.ts` (add size/variant mappings)
- Modified: `frontend/src/shared/components/ui/stack-rank-badge.test.tsx` (add tests for new props)
- No new files needed
- No backend changes needed for this story

### Previous Story Intelligence

From Story 8.1 (Integrate and Customize Chakra UI):
- Full brand color palettes (50–950) now available under `brandPalette.*`
- Semantic tokens: `brand.primary`, `brand.success`, `brand.warning`, `brand.danger`, `brand.info`
- Accessible variants: `brand.greenAccessible` (#6F7B24, 4.63:1), `error.redAccessible` (#C53030, 5.47:1)
- Button/Badge/Alert recipes established — StackRankBadge is NOT using the badge recipe (it's a custom Box-based component, different from Chakra Badge)
- `brand.greenLight` (#F4F5E9) established for subtle backgrounds
- All 317 frontend tests pass
- Pre-existing flaky tests: 4-6 keyboard-based Chakra Select interaction tests in sort-control, business-unit-filter, backlog-list — not related to this story

### Git Intelligence

Recent commits show:
- `185b561 Merge pull request #8 from bhunnicu-vixxo/rhunnicutt/issue-6-4-implement-sync-error-handling-and-messages`
- Story 8.1 changes are uncommitted on branch `rhunnicutt/issue-8-1-integrate-and-customize-chakra-ui`
- Pattern: feature commits use `feat:` prefix with Linear issue IDs
- Pattern: PRs target main branch from feature branches named `rhunnicutt/issue-{story-key}`

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 8.2] — Story requirements (priority number, size, variant props)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#StackRankBadge] — Component specs (32px min, circular, Vixxo Green bg, white text, ARIA labels)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — Color definitions and WCAG contrast requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy] — WCAG Level A minimum, focus indicators, screen reader support
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Feature-based organization, component patterns, naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — kebab-case files, PascalCase components, co-located tests
- [Source: frontend/src/theme.ts] — Theme tokens (brand.green, brand.greenAccessible, brand.greenLight, etc.)
- [Source: frontend/src/shared/components/ui/stack-rank-badge.tsx] — Existing component (modify in place)
- [Source: frontend/src/shared/components/ui/stack-rank-badge.utils.ts] — Existing utilities (modify in place)
- [Source: frontend/src/shared/components/ui/stack-rank-badge.test.tsx] — Existing 19 tests (preserve, extend)
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Consumer (DO NOT modify)
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Consumer (DO NOT modify)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
