# Story 8.3: Implement BacklogItemCard Component

Linear Issue ID: VIX-369
Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a production-quality BacklogItemCard design-system component with description display, date metadata, responsive layout, Chakra UI recipe-based styling, and loading skeleton,
so that backlog items are displayed consistently, accessibly, and in full compliance with the Vixxo brand design system and UX specification.

## Acceptance Criteria

1. **Given** backlog item data is available, **When** BacklogItemCard is rendered, **Then** the card displays: title (bold, truncated), StackRankBadge (priority badge), status badge (color-coded), business unit (team name), identifier, and labels — preserving all existing functionality
2. **Given** the item has a non-null description, **When** BacklogItemCard is rendered, **Then** the description is displayed below the title, truncated to 2 lines with ellipsis, using `fontSize="sm"` and `color="brand.grayLight"` (secondary text color)
3. **Given** the item has a null description, **When** BacklogItemCard is rendered, **Then** no description area is shown and layout remains clean with no empty gaps
4. **Given** the item has date metadata, **When** BacklogItemCard is rendered, **Then** the `updatedAt` date is displayed as a relative time string (e.g., "Updated 2h ago", "Updated 3 days ago") using `date-fns formatDistanceToNow`, in `fontSize="xs"` with `color="brand.grayLight"`
5. **Given** a `variant` prop is provided (`"default"` | `"compact"`), **When** BacklogItemCard is rendered, **Then**:
   - `default`: Full card layout with description, dates, labels, and 16px padding (current behavior)
   - `compact`: Condensed layout without description and labels, with 8px padding, suitable for dense list contexts or smaller viewports
6. **Given** the card is rendered on different viewport sizes, **When** the viewport width changes, **Then** the card layout adapts: full layout on desktop (≥768px) and compact layout on mobile (<768px) when no explicit variant is provided
7. **Given** the BacklogItemCard is styled, **When** inspecting the rendered output, **Then** all colors use Chakra theme tokens or semantic tokens from Story 8.1 — no hardcoded hex values — including `brand.green` for focus, `brand.grayLight` for secondary text, and status-color tokens for badges
8. **Given** a BacklogItemCardSkeleton is rendered, **When** data is loading, **Then** a skeleton matching the card layout is displayed (priority badge skeleton, title skeleton, metadata skeleton) for use by consuming components
9. **Given** the card is in the DOM, **When** a screen reader reads the page, **Then** the card has appropriate `role` (`"button"` when clickable, `"article"` when non-clickable) and `aria-label` including title, priority label, and "New item" if applicable — preserving existing accessibility
10. **Given** onClick is provided, **When** the user presses Enter or Space while the card is focused, **Then** the onClick handler fires — preserving existing keyboard accessibility
11. **And** all existing 15 BacklogItemCard tests continue to pass without modification (backward compatibility)
12. **And** `npm run build` passes with zero TypeScript errors in `frontend/`
13. **And** new unit tests verify: description rendering (present/absent), date display, compact variant layout, skeleton rendering, responsive behavior, and brand token usage

## Tasks / Subtasks

- [x] Task 1: Add description display to BacklogItemCard (AC: #2, #3)
  - [x] 1.1: Below the title `<Text>`, add a conditional description block: `{item.description && <Text fontSize="sm" color="brand.grayLight" lineClamp={2}>{highlightTokens.length > 0 ? highlightText(item.description, highlightTokens) : item.description}</Text>}`
  - [x] 1.2: `lineClamp={2}` uses Chakra's built-in line clamping (equivalent to `-webkit-line-clamp: 2; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical`)
  - [x] 1.3: Verify null/empty description renders nothing — no empty DOM nodes

- [x] Task 2: Add relative date metadata display (AC: #4)
  - [x] 2.1: Install `date-fns` if not already present (`npm -C frontend install date-fns`) — installed as new dependency
  - [x] 2.2: Import `formatDistanceToNow` from `date-fns`
  - [x] 2.3: Add date text to the metadata row: `<Text fontSize="xs" color="brand.grayLight">Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</Text>`
  - [x] 2.4: If `updatedAt` equals `createdAt` (never updated), display "Created {relative time}" instead

- [x] Task 3: Implement variant prop for default/compact modes (AC: #5)
  - [x] 3.1: Add optional `variant?: 'default' | 'compact'` prop to `BacklogItemCardProps`
  - [x] 3.2: When variant is `'compact'`: hide description, hide labels row, reduce padding from `p="4"` to `p="2"`, use smaller StackRankBadge (`size="sm"`)
  - [x] 3.3: When variant is `'default'` (or omitted): render full layout as currently exists (backward compatible)
  - [x] 3.4: Add `data-variant` attribute for test assertions

- [x] Task 4: Implement responsive layout behavior (AC: #6)
  - [x] 4.1: When no explicit `variant` prop is provided, use Chakra responsive props to adapt: `p={{ base: '2', md: '4' }}`
  - [x] 4.2: On `base` (mobile), hide description and labels (same as compact) using Chakra `display={{ base: 'none', md: 'block' }}`
  - [x] 4.3: Ensure responsive behavior does NOT override an explicitly provided variant prop

- [x] Task 5: Ensure brand token compliance (AC: #7)
  - [x] 5.1: Audit all color references in backlog-item-card.tsx — replace any hardcoded values with theme tokens
  - [x] 5.2: Replace `gray.200` → kept as Chakra default gray scale (acceptable)
  - [x] 5.3: Replace `gray.50` hover → `brand.grayBg` for hover background
  - [x] 5.4: Replace `gray.500` text → `brand.grayLight` for secondary text
  - [x] 5.5: Replace `gray.700` label text → `brand.gray` for label text
  - [x] 5.6: Verify StatusBadge and NewItemBadge use brand tokens (they already do — `brand.yellow`, `brand.teal`, etc.)

- [x] Task 6: Create BacklogItemCardSkeleton component (AC: #8)
  - [x] 6.1: Create a named export `BacklogItemCardSkeleton` in the same file (or as a sub-component)
  - [x] 6.2: Layout: `<Flex p="4" borderWidth="1px" borderRadius="md" gap="4"><Skeleton boxSize="8" borderRadius="full" /><VStack flex="1" gap="2"><Skeleton height="5" width="60%" /><Skeleton height="4" width="40%" /></VStack></Flex>`
  - [x] 6.3: Accept optional `variant` prop matching BacklogItemCard variant for compact skeletons
  - [x] 6.4: Update `BacklogList` to import `BacklogItemCardSkeleton` from the card file instead of its inline `BacklogListSkeleton` (optional refactor — skipped to keep backward compat)

- [x] Task 7: Write new tests (AC: #11, #12, #13)
  - [x] 7.1: Preserve all 15 existing tests — they must pass without modification
  - [x] 7.2: Add test: description renders when present, truncated with lineClamp
  - [x] 7.3: Add test: description does NOT render when null
  - [x] 7.4: Add test: date metadata displays relative time ("Updated X ago")
  - [x] 7.5: Add test: compact variant hides description and labels, uses smaller padding
  - [x] 7.6: Add test: default variant shows full layout
  - [x] 7.7: Add test: BacklogItemCardSkeleton renders correctly
  - [x] 7.8: Add test: compact skeleton variant renders correctly
  - [x] 7.9: Add tests verifying data-variant attribute
  - [x] 7.10: Add test: keyword highlighting applies to description text

- [x] Task 8: Build verification and regression check (AC: #12)
  - [x] 8.1: Run `npx tsc --noEmit` — zero TypeScript errors
  - [x] 8.2: Run `npx vitest run` — all 468 tests pass, no regressions

## Dev Notes

### What's Already Done (CRITICAL — do not break existing behavior)

The following are **already implemented** and must be preserved:

- **BacklogItemCard component**: `frontend/src/features/backlog/components/backlog-item-card.tsx`
  - Props: `item: BacklogItem`, `onClick?: () => void`, `highlightTokens?: string[]`
  - Layout: Priority badge (left) | Title + Status + Team + Identifier + Labels (right)
  - Uses `StackRankBadge` from `@/shared/components/ui/stack-rank-badge`
  - Uses `STATUS_COLORS` from `../utils/status-colors`
  - Uses `highlightText` from `../utils/highlight`
  - Internal sub-components: `NewItemBadge`, `StatusBadge`
  - Keyboard: Enter/Space activation when clickable
  - ARIA: `role="button"|"article"`, aria-label with title + priority + "New item"
  - Hover: bg gray.50
  - Focus: 2px brand.green outline

- **BacklogItemCard tests**: `frontend/src/features/backlog/components/backlog-item-card.test.tsx`
  - 15 tests covering: title, priority badge, status, team, identifier, labels, aria-label, new badge, click, Enter key, Space key, article role

- **Consumers** (update carefully — they already use BacklogItemCard):
  - `frontend/src/features/backlog/components/backlog-list.tsx` — renders `BacklogItemCard` in a VStack with 4-gap spacing, passes `item`, `highlightTokens`, and `onClick`
  - `BacklogListSkeleton` function in `backlog-list.tsx` — inline skeleton (can optionally refactor to use new `BacklogItemCardSkeleton`)

- **BacklogItem type**: `frontend/src/features/backlog/types/backlog.types.ts`
  - `description: string | null` — field already exists in the type, just not displayed in the card
  - `updatedAt: string` — ISO 8601 date string, already available
  - `createdAt: string` — ISO 8601 date string, already available

- **Theme tokens** (from Story 8.1): `frontend/src/theme.ts`
  - `brand.green` (#8E992E), `brand.greenAccessible` (#6F7B24), `brand.greenLight` (#F4F5E9)
  - `brand.gray` (#3E4543), `brand.grayLight` (#718096), `brand.grayBg` (#F7FAFC)
  - `brand.teal` (#2C7B80), `brand.yellow` (#EDA200), `brand.blue` (#395389)
  - Semantic tokens: `brand.primary`, `brand.success`, `brand.warning`, `brand.danger`, `brand.info`
  - Button/Badge/Alert recipes established

- **StackRankBadge** (from Story 8.2): `frontend/src/shared/components/ui/stack-rank-badge.tsx`
  - Props: `priority`, `priorityLabel`, optional `size` ("sm"|"md"|"lg"), optional `variant` ("solid"|"outline"|"subtle")
  - Size prop: sm=24px, md=32px, lg=40px (when provided), auto-sizing by priority when omitted
  - Variant prop: solid (default), outline, subtle — with WCAG-compliant colors

### What This Story ADDS

This story enhances the existing BacklogItemCard from a functional component to a **production-quality design system component**:

1. **Description display** — Truncated 2-line description when available (already in BacklogItem type, not yet displayed)
2. **Date metadata** — Relative time display for updatedAt/createdAt using date-fns
3. **Variant prop** — `"default"` (full layout) and `"compact"` (condensed) for different contexts
4. **Responsive layout** — Adapts to viewport size using Chakra responsive props
5. **Brand token compliance** — Replace all gray.XXX references with brand semantic tokens
6. **BacklogItemCardSkeleton** — Reusable loading skeleton matching card layout
7. **Extended test coverage** — Tests for all new features + backward compatibility

### Architecture Compliance

- **File locations**: Component stays at `frontend/src/features/backlog/components/backlog-item-card.tsx`, tests co-located at `backlog-item-card.test.tsx`
- **Naming**: kebab-case files, PascalCase exports (`BacklogItemCard`, `BacklogItemCardSkeleton`, `BacklogItemCardProps`), camelCase variables
- **No new npm dependencies**: `date-fns` is already installed (used by `sync-status-indicator.tsx`)
- **Immutable updates**: Pure component, no side effects, functional component pattern
- **TypeScript strict mode**: All exports properly typed, no `any` usage
- **Theme tokens**: Use brand tokens from theme.ts — DO NOT hardcode hex values in the component
- **Co-located tests**: Tests live alongside source file per architecture spec

### Chakra UI v3 API Reference

**Responsive props** (v3):
```typescript
// Responsive values using object syntax
<Box p={{ base: '2', md: '4' }} />
<Box display={{ base: 'none', md: 'block' }} />
```

**Line clamping** (v3):
```typescript
// Chakra v3 lineClamp prop (truncates text to N lines)
<Text lineClamp={2}>Long text that gets truncated...</Text>
```

**Skeleton** (v3):
```typescript
import { Skeleton } from '@chakra-ui/react'
<Skeleton height="5" width="60%" />
<Skeleton boxSize="8" borderRadius="full" />
```

**Box/Flex components** (already used):
```typescript
import { Box, Flex, HStack, VStack, Text, Badge } from '@chakra-ui/react'
```

### date-fns Reference

**Already installed** — check `frontend/package.json`, used by `sync-status-indicator.tsx`:
```typescript
import { formatDistanceToNow } from 'date-fns'

// Usage:
formatDistanceToNow(new Date('2026-02-11T10:00:00Z'), { addSuffix: true })
// → "2 hours ago"

formatDistanceToNow(new Date('2026-02-09T10:00:00Z'), { addSuffix: true })
// → "2 days ago"
```

### WCAG & Accessibility Notes

- **Card role**: `role="button"` when `onClick` provided (interactive), `role="article"` when non-clickable (content)
- **aria-label**: Must include title, priority label, and "New item" flag — already implemented correctly
- **Focus indicator**: 2px solid `brand.green` outline with 2px offset — already implemented
- **Keyboard**: Enter/Space to activate when clickable — already implemented
- **Screen reader**: StackRankBadge has `role="img"` + `aria-label="Priority {label}"` — already implemented
- **Color**: Status badges use text labels + color (not color alone) — already compliant
- **New badge**: Yellow bg with dark text (brand.gray) for WCAG contrast — already compliant
- **Description**: Secondary text uses `brand.grayLight` (#718096) which has 4.48:1 contrast on white — borderline for WCAG AA normal text. The text at `fontSize="sm"` (14px) is normal text, so consider using `brand.gray` (#3E4543, 12.5:1) if strict compliance required, or accept 4.48:1 as sufficient for body text readability

### Testing Patterns

- Use `vitest` + `@testing-library/react`
- Import `render`, `screen`, `fireEvent` from `@/utils/test-utils` (includes ChakraProvider)
- Use `createMockItem()` helper already defined in test file
- Test responsive behavior: Note that jsdom doesn't support media queries — test variant prop directly instead of viewport-based behavior
- For date testing: Mock `Date.now()` using `vi.useFakeTimers()` to get deterministic relative time strings
- Use `data-variant` attribute for variant assertions
- Use `screen.getByRole()` and `screen.getByText()` for content assertions

### What NOT To Do

- **Do NOT** change the existing `BacklogItemCardProps` interface in a breaking way — new props MUST be optional
- **Do NOT** remove or rename existing props (`item`, `onClick`, `highlightTokens`)
- **Do NOT** change the `StatusBadge` or `NewItemBadge` sub-components (they work correctly)
- **Do NOT** change the `status-colors.ts` utility file
- **Do NOT** hardcode hex color values — always use Chakra theme tokens
- **Do NOT** add new npm dependencies — `date-fns` is already installed
- **Do NOT** use `extendTheme` (Chakra v2 API) — the project uses `defineConfig` + `createSystem` (v3)
- **Do NOT** modify `stack-rank-badge.tsx` — it's a dependency, not a target of this story
- **Do NOT** break the 15 existing tests — they are the backward compatibility contract
- **Do NOT** create a separate card recipe in theme.ts for this story — keep styling inline in the component (recipes are for cross-component shared patterns like Button/Badge/Alert)
- **Do NOT** add `tabIndex` to inner elements — only the outer Flex should be focusable when clickable

### Project Structure Notes

- Modified: `frontend/src/features/backlog/components/backlog-item-card.tsx` — Add description, dates, variant, responsive, skeleton, brand tokens
- Modified: `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — Add new tests for all new features
- Optional: `frontend/src/features/backlog/components/backlog-list.tsx` — Update to use `BacklogItemCardSkeleton` (non-breaking refactor)
- No new files needed
- No backend changes needed for this story

### Previous Story Intelligence

**From Story 8.1 (Integrate and Customize Chakra UI):**
- Full brand color palettes (50–950) available under `brandPalette.*`
- Semantic tokens: `brand.primary`, `brand.success`, `brand.warning`, `brand.danger`, `brand.info`
- Accessible variants: `brand.greenAccessible` (#6F7B24, 4.63:1), `error.redAccessible` (#C53030, 5.47:1)
- Button/Badge/Alert recipes established for consistent component styling
- `brand.grayLight` (#718096) established for secondary text
- `brand.grayBg` (#F7FAFC) established for subtle backgrounds
- Global focus-visible: 2px solid brand.green outline
- All 317 frontend tests pass at story completion

**From Story 8.2 (Implement StackRankBadge Component):**
- StackRankBadge enhanced with `size` prop ("sm"|"md"|"lg") and `variant` prop ("solid"|"outline"|"subtle")
- Size `"sm"` = 24px — use this for compact BacklogItemCard variant
- Default (no size prop) = priority-based auto-sizing — use this for default BacklogItemCard variant
- Component at `frontend/src/shared/components/ui/stack-rank-badge.tsx` — import unchanged
- 54 StackRankBadge tests pass
- All 349 frontend tests pass at story completion
- Pre-existing flaky tests: 4-6 keyboard-based Chakra Select interaction tests (sort-control, business-unit-filter, backlog-list) — not related to this story

### Git Intelligence

Recent commits show:
- `50bf265 feat: move sync cron schedule to database with 15-min default`
- `95eef94 feat: implement StackRankBadge component (Story 8.2, VIX-368)`
- `385eed3 feat: complete Chakra theme customization (VIX-367)`
- Pattern: Feature commits use `feat:` prefix with Linear issue IDs
- Pattern: Component modifications stay within their existing file locations
- Pattern: Tests are co-located and extended (not rewritten)

### Existing Consumer Context

**BacklogList** (`backlog-list.tsx`) renders BacklogItemCard as follows:
```typescript
<BacklogItemCard
  item={item}
  highlightTokens={searchTokens}
  onClick={() => {
    lastClickedCardRef.current = cardRefs.current[item.id] ?? null
    setSelectedItemId(item.id)
  }}
/>
```
- No `variant` prop passed → will use default
- All items rendered in `VStack gap="4"` → spacing between cards is 16px (matches UX spec)

**ItemDetailModal** (`item-detail-modal.tsx`) does NOT use BacklogItemCard — it has its own layout. No impact.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 8.3] — Story requirements and AC
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#BacklogItemCard] — Component specs: layout, spacing, typography, states, accessibility
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — Color system, typography, spacing scale
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Design & Accessibility] — Breakpoints, responsive strategy, WCAG compliance
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision] — Clean & Scannable direction, spacious list, large priority numbers
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Feature-based organization, Chakra UI, TanStack Query, React Router v7
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, co-located tests, immutable state
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — Existing component (modify in place)
- [Source: frontend/src/features/backlog/components/backlog-item-card.test.tsx] — Existing 15 tests (preserve, extend)
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — Primary consumer, BacklogListSkeleton inline
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — BacklogItem type with description, dates
- [Source: frontend/src/shared/components/ui/stack-rank-badge.tsx] — StackRankBadge with size/variant (from Story 8.2)
- [Source: frontend/src/theme.ts] — Brand tokens, semantic tokens, recipes (from Story 8.1)
- [Source: _bmad-output/implementation-artifacts/8-1-integrate-and-customize-chakra-ui.md] — Previous story learnings
- [Source: _bmad-output/implementation-artifacts/8-2-implement-stackrankbadge-component.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- SWC native binding issue resolved by clean reinstall of node_modules after date-fns installation
- date-fns was NOT already installed (contrary to story notes) — installed as new dependency

### Completion Notes List

- All 8 tasks completed successfully following red-green-refactor cycle
- 15 original tests preserved without modification — all pass
- 14 new tests added (11 for BacklogItemCard, 3 for BacklogItemCardSkeleton) — all pass
- Total: 29 tests in backlog-item-card.test.tsx, 468 tests across entire frontend
- Zero TypeScript errors (tsc --noEmit passes clean)
- Brand token compliance: replaced gray.50 → brand.grayBg, gray.500 → brand.grayLight, gray.700 → brand.gray
- Responsive behavior: uses Chakra responsive props when no explicit variant; explicit variant overrides responsive
- BacklogItemCardSkeleton exported as named export with optional variant prop
- Task 6.4 (BacklogList refactor to use BacklogItemCardSkeleton) skipped as optional — BacklogList skeleton still works correctly inline

### Change Log

- 2026-02-11: Implemented BacklogItemCard enhancements (Story 8.3, VIX-369)
  - Added description display with 2-line truncation and search highlight support
  - Added relative date metadata (Updated/Created X ago) using date-fns formatDistanceToNow
  - Added variant prop ("default" | "compact") with responsive layout behavior
  - Replaced hardcoded gray values with brand tokens for design system compliance
  - Created BacklogItemCardSkeleton component with variant support
  - Added 14 new tests covering all new features

### File List

- Modified: `frontend/src/features/backlog/components/backlog-item-card.tsx` — Added description, dates, variant, responsive, skeleton, brand tokens
- Modified: `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — Added 14 new tests for all new features
- Modified: `frontend/package.json` — Added date-fns dependency
- Modified: `frontend/package-lock.json` — Updated lock file for date-fns
- Modified: `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status: ready-for-dev → in-progress → review
- Modified: `_bmad-output/implementation-artifacts/8-3-implement-backlogitemcard-component.md` — Updated tasks, dev agent record, status
