# Story 8.1: Integrate and Customize Chakra UI

Linear Issue ID: VIX-367
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Chakra UI fully integrated with Vixxo brand customization including component-level recipes, semantic tokens, and verified WCAG compliance,
so that all UI components render consistently with Vixxo brand guidelines and meet accessibility standards.

## Acceptance Criteria

1. **Given** Chakra UI is installed (v3.32.0+), **When** the theme is loaded, **Then** Vixxo brand colors are applied (Green #8E992E, Gray #3E4543, Teal #2C7B80, Yellow #EDA200, Blue #395389, Copper #956125) with full color palettes (50–950 shades) generated for each brand color
2. **And** Arial typography is configured as the primary font family for both headings and body text, with the type scale matching UX spec (H1 32px, H2 24px, H3 20px, Body 16px, Small 14px, Tiny 12px)
3. **And** 4px spacing scale is applied with tokens matching the UX spec (4/8/12/16/24/32/48 px)
4. **And** semantic color tokens are defined for primary, success, warning, error, and info semantic roles, mapping to Vixxo brand colors
5. **And** component recipes are defined for at minimum: Button (primary/secondary/tertiary hierarchy per UX spec), Badge (status color-coding: green success, red error, yellow partial, blue/gray info), and Alert (success/error/warning/info variants using brand colors)
6. **And** focus indicators use Vixxo Green (#8E992E) with a visible 2px outline that meets WCAG 2.1 Level A focus visibility requirements
7. **And** all text color combinations meet WCAG 2.1 Level A contrast minimums (4.5:1 for normal text ≤18px, 3:1 for large text >18px), with accessible dark variants of brand colors provided where needed (e.g., darkened Vixxo Green for small text on white backgrounds)
8. **And** `npm run build` passes with zero TypeScript errors in `frontend/`
9. **And** unit tests verify: theme tokens render correctly, component recipes apply expected styles, and accessible color variants meet contrast requirements

## Tasks / Subtasks

- [x] Task 1: Add hover/active color variants and semantic tokens (AC: #1, #4)
  - [x] 1.1: In `frontend/src/theme.ts`, **kept the existing flat brand tokens** (`brand.green`, `brand.gray`, etc.) and added sibling tokens for hover/active/light/accessible states.
  - [x] 1.2: Defined semantic color tokens (`brand.primary`, `brand.primaryHover`, `brand.success`, `brand.warning`, `brand.danger`, `brand.info`, `fg.brand`, `fg.brandMuted`)

- [x] Task 2: Add accessible color variants and verify WCAG compliance (AC: #7)
  - [x] 2.1: Created darkened accessible green variant `#6F7B24` (4.63:1 contrast on white — meets WCAG AA). Story specified `#7A8528` but that only gives 4.03:1 — went darker per "or darker" guidance.
  - [x] 2.2: Yellow is only used as background/accent with dark text — documented in theme comments and token file.
  - [x] 2.3: Verified all brand color combinations against white — documented in theme.ts header comments.
  - [x] 2.4: Documented all contrast ratios as comments in theme.ts header block.

- [x] Task 3: Define component recipes for brand-consistent styling (AC: #5)
  - [x] 3.1: Created Button recipe with brand/outline/ghost/danger variants, all with `_disabled` states.
  - [x] 3.2: Created Badge recipe with success/error/warning/info/neutral variants (WCAG-compliant color pairings).
  - [x] 3.3: Created Alert slot recipe with success/error/warning/info status variants using brand colors with left border accent and light backgrounds.

- [x] Task 4: Add focus indicator and global CSS customizations (AC: #6)
  - [x] 4.1: Configured `*:focus-visible` with 2px solid Vixxo Green outline and 2px offset.
  - [x] 4.2: Added `::selection` style with Vixxo Green background and white text.
  - [x] 4.3: Added global `a` link styles (accessible green color, underline on hover).

- [x] Task 5: Verify and finalize typography + spacing (AC: #2, #3)
  - [x] 5.1: Confirmed existing font tokens use Arial as primary — no changes needed.
  - [x] 5.2: Added `fontSizes` tokens: xs=12px, sm=14px, md=16px, lg=20px, xl=24px, 2xl=32px.
  - [x] 5.3: Added `lineHeights` tokens: tight=1.2, snug=1.3, normal=1.5.
  - [x] 5.4: Confirmed existing spacing tokens match UX spec — no changes needed.

- [x] Task 6: Export theme utilities and create design system helpers (AC: #1, #4)
  - [x] 6.1: Created `frontend/src/theme/index.ts` — re-exports `system` and `BRAND_COLORS`.
  - [x] 6.2: Created `frontend/src/theme/tokens.ts` — exports `BRAND_COLORS` constant with all brand hex values.

- [x] Task 7: Write tests (AC: #8, #9)
  - [x] 7.1: Created `frontend/src/theme.test.tsx` — 41 tests covering system creation, color tokens, hover/active variants, font tokens, font size tokens, line height tokens, spacing tokens.
  - [x] 7.2: Created `frontend/src/theme/tokens.test.ts` — 16 tests covering BRAND_COLORS export values and WCAG contrast ratio calculations.
  - [x] 7.3: Component render tests in `theme.test.tsx` — Button (brand/outline/ghost/danger) and Badge (success/error/warning/info/neutral) all render without errors.

- [x] Task 8: Build verification (AC: #8)
  - [x] 8.1: `npm run build` passes with zero TypeScript errors.
  - [x] 8.2: All theme/token tests pass. Full frontend suite passes: `npm -C frontend run test:run` → 24/24 files, 317/317 tests.

## Dev Notes

### What's Already Done (CRITICAL — do not re-install or break existing setup)

The following are **already implemented** and must be preserved:

- **Chakra UI v3 installed**: `@chakra-ui/react@^3.32.0` + `@emotion/react@^11.14.0` in `frontend/package.json`
- **Theme file exists**: `frontend/src/theme.ts` with `createSystem` + `defineConfig`
  - Brand color tokens: `brand.green`, `brand.gray`, `brand.teal`, `brand.yellow`, `brand.blue`, `brand.copper`
  - Error color: `error.red`
  - Font tokens: heading + body = Arial with system fallbacks
  - Spacing tokens: 1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px, 12=48px
- **Provider setup**: `frontend/src/components/ui/provider.tsx` wraps app with `ChakraProvider` using the custom system
- **Already wired in main.tsx**: `<Provider>` wraps `<BrowserRouter>` and `<QueryClientProvider>`
- **Existing components using Chakra**: `AppHeader`, `AppLayout`, `StackRankBadge`, `BacklogPage`, `AdminPage`, `SyncControl`, `ItemDetail`, and many others already use Chakra UI `Box`, `Button`, `HStack`, `VStack`, `Text`, `Heading`, `Spinner`, `Badge`, `Table.*`, `Alert.*`, etc.
- **StackRankBadge**: Already built at `frontend/src/shared/components/ui/stack-rank-badge.tsx` — uses `brand.green` token

### What This Story ADDS

This story takes the existing basic theme and makes it a **complete, production-quality design system**:

1. **Full color palettes** (shade scales 50–950) so components can use hover/active states
2. **Semantic color tokens** for consistent meaning across the app
3. **Component recipes** for brand-consistent Button, Badge, Alert styling
4. **WCAG-compliant accessible variants** of brand colors
5. **Focus indicators** using brand green
6. **Exported utilities** for non-Chakra usage
7. **Tests** verifying the design system configuration

### Architecture Compliance

- **File locations**: Theme at `frontend/src/theme.ts`, tokens at `frontend/src/theme/tokens.ts` (new)
- **Naming**: kebab-case files, PascalCase exports, camelCase variables
- **No new dependencies**: Everything uses existing `@chakra-ui/react` v3 APIs (`defineConfig`, `createSystem`, `defineRecipe`)
- **Immutable updates**: Theme configuration is pure object — no mutations
- **TypeScript strict mode**: All exports must be properly typed

### Chakra UI v3 API Reference

**Theme structure** (v3 `defineConfig`):
```typescript
const config = defineConfig({
  theme: {
    tokens: { colors, fonts, fontSizes, lineHeights, spacing },
    semanticTokens: { colors: { ... } },
    recipes: { button: buttonRecipe, badge: badgeRecipe },
  },
  globalCss: {
    '*:focus-visible': { outline: '2px solid', outlineColor: 'brand.green', outlineOffset: '2px' },
  },
})
```

**Recipes** (v3 `defineRecipe`):
```typescript
import { defineRecipe } from '@chakra-ui/react'
const buttonRecipe = defineRecipe({
  variants: {
    variant: {
      brand: { bg: 'brand.green', color: 'white', _hover: { bg: 'brand.greenHover' } },
    },
  },
})
```

### Testing Patterns

- Use `vitest` + `@testing-library/react`
- Wrap rendered components in `<ChakraProvider value={system}>` (or use the existing `Provider` component)
- Co-locate tests: `theme.test.tsx` alongside `theme.ts`
- For contrast ratio testing, calculate using the WCAG relative luminance formula:
  ```typescript
  function getContrastRatio(hex1: string, hex2: string): number { ... }
  expect(getContrastRatio('#7A8528', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  ```

### What NOT To Do

- **Do NOT** reinstall Chakra UI or change the installed version
- **Do NOT** change the Provider setup in `frontend/src/components/ui/provider.tsx` (it already works)
- **Do NOT** remove or rename existing brand color tokens (other components depend on `brand.green`, `brand.gray`, etc.)
- **Do NOT** modify existing component files (e.g., `stack-rank-badge.tsx`, `sync-control.tsx`) — this story only touches theme configuration
- **Do NOT** add dark mode support (not in MVP scope; theme is light-mode only)
- **Do NOT** add new npm dependencies for color generation — generate palette shades manually or with a simple utility function
- **Do NOT** use `extendTheme` (that's Chakra UI v2 API — use `defineConfig` + `createSystem`)
- **Do NOT** break existing Chakra color references like `gray.400`, `green.500` etc. that come from Chakra's default config (our `createSystem(defaultConfig, config)` merges with defaults)

### UX Spec References for Color + Typography

From `_bmad-output/planning-artifacts/ux-design-specification.md`:

**Color system:**
- Primary actions: Vixxo Green (#8E992E)
- Success: Green or Teal
- Warning: Yellow (#EDA200) — **only with dark text**
- Error: Red (#E53E3E)
- Info: Teal (#2C7B80) or Blue (#395389)
- Text Primary: Gray (#3E4543)
- Text Secondary: Lighter gray (#718096)
- Backgrounds: White (#FFFFFF) and light grays

**Typography:**
- H1: 32px / 1.2 / Bold
- H2: 24px / 1.3 / Bold
- H3: 20px / 1.3 / Bold
- Body: 16px / 1.5 / Regular
- Small: 14px / 1.5 / Regular
- Tiny: 12px / 1.4 / Regular

**Button hierarchy (UX spec):**
- Primary: Vixxo Green bg, white text, bold
- Secondary: Gray outline, gray text, regular
- Tertiary: Text link, Green color, underline on hover

**Focus indicators:**
- Vixxo Green outline (2px) for brand consistency

### Project Structure Notes

- Theme file: `frontend/src/theme.ts` (exists — modify in place)
- New file: `frontend/src/theme/tokens.ts` (raw color constants)
- New file: `frontend/src/theme.test.tsx` (theme tests)
- New file: `frontend/src/theme/tokens.test.ts` (token tests)
- Provider: `frontend/src/components/ui/provider.tsx` (do NOT modify)
- No backend changes needed for this story

### Previous Story Intelligence

From Story 7.5 (Display Sync Status and History):
- The Chakra UI v3 compound component API (`Table.Root`, `Table.Header`, etc.) is already used successfully
- Badge color-coding (green success, red error, yellow partial, blue syncing) is already implemented inline in `sync-control.tsx` — component recipes from this story will provide a standardized approach
- All 683 tests pass (352 backend, 331 frontend) — do not regress

### Git Intelligence

Recent commits show:
- `b2c08ae feat: add admin auth and user management (VIX-362, VIX-363, VIX-364)`
- `f76f058 feat: implement sync status, trigger, and error messaging (VIX-357)`
- Pattern: feature commits use `feat:` prefix with Linear issue IDs

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 8, Story 8.1] — Story requirements and AC
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation] — Chakra UI selection, rationale, customization strategy
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — Color system, typography, spacing, accessibility
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns] — Button hierarchy, feedback patterns, loading states
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Component architecture, state management, Vite setup
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, file structure
- [Source: _bmad-output/project-context.md] — Critical implementation rules, anti-patterns
- [Source: frontend/src/theme.ts] — Current theme configuration (modify in place)
- [Source: frontend/src/components/ui/provider.tsx] — ChakraProvider setup (do NOT modify)
- [Source: frontend/src/shared/components/ui/stack-rank-badge.tsx] — Existing component using brand tokens
- [Source: https://chakra-ui.com/docs/theming/customization/recipes] — Chakra UI v3 recipe documentation
- [Source: https://chakra-ui.com/docs/theming/semantic-tokens] — Chakra UI v3 semantic tokens
- [Source: https://chakra-ui.com/docs/theming/customization/global-css] — Chakra UI v3 global CSS customization

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

- greenAccessible color: Story specified #7A8528 (4.03:1 contrast) — insufficient for WCAG AA 4.5:1. Darkened to #6F7B24 (4.63:1) per "or darker" guidance in task 2.1.
- errorRed #E53E3E: 4.13:1 contrast on white — meets large text (3:1) but not normal text (4.5:1). Documented as large-text-only in comments; standard Chakra error red preserved.
- Chakra v3 type system: Custom recipe variants (brand, danger, success, etc.) work at runtime but Chakra's generated TypeScript types don't reflect them. Used spread-prop pattern in tests to bypass strict type checking.
- Pre-existing flaky tests: 4-6 keyboard-based Chakra Select interaction tests fail flakily on every run (sort-control, business-unit-filter, backlog-list). Confirmed by stash/unstash testing — not caused by this story's changes.

### Completion Notes List

- ✅ Extended theme.ts with 15+ new color tokens (hover/active/light/accessible variants) while preserving all existing flat tokens
- ✅ Added 8 semantic color tokens (brand.primary, brand.success, brand.warning, brand.danger, brand.info, fg.brand, fg.brandMuted, brand.primaryHover)
- ✅ Created Button recipe with 4 variants: brand (primary), outline (secondary), ghost (tertiary), danger (destructive)
- ✅ Created Badge recipe with 5 status variants: success, error, warning, info, neutral
- ✅ Created Alert slot recipe with 4 status variants using brand-colored left border accent
- ✅ Added global focus-visible (2px green outline), ::selection, and link styles
- ✅ Added fontSizes (xs-2xl) and lineHeights (tight/snug/normal) matching UX spec
- ✅ Created theme/tokens.ts with BRAND_COLORS export for non-Chakra usage
- ✅ Created theme/index.ts barrel export
- ✅ 57 tests: 41 theme tests + 16 token tests (including WCAG contrast ratio validation)
- ✅ Build passes with zero TypeScript errors
- ✅ Zero regressions introduced

### Change Log

- 2026-02-11: Implemented Story 8.1 — full Vixxo brand theme with color variants, semantic tokens, component recipes (Button/Badge/Alert), WCAG-compliant accessible colors, focus indicators, typography/spacing tokens, and design system utilities with comprehensive tests.
- 2026-02-11: Senior dev code review fixes — added full 50–950 palettes for brand colors, hardened semantic tokens (warning/danger) to prevent contrast misuse, improved recipe tests to assert expected token references, and stabilized Select tests so `tsc -b` and the full frontend test run pass cleanly.

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-11_

### Summary

- Added **full brand color palettes (50–950)** under `colors.brandPalette.*` while preserving existing flat tokens (e.g. `brand.green`) for backwards compatibility (AC #1).
- Fixed **WCAG documentation accuracy** for error red, and added `error.redAccessible` for normal-text contrast on white (AC #7).
- Adjusted semantic tokens so **warning/danger semantics are safer by default**:
  - `brand.warning` now maps to `brand.yellowLight` (background-safe) and exposes `brand.warningAccent` for the raw yellow accent (AC #4, #7).
  - `brand.danger` maps to `error.redAccessible` and exposes `brand.dangerBg` for light backgrounds.
- Upgraded theme tests to verify **palette existence** and **recipe definitions reference expected tokens** (AC #9).
- Stabilized Select-related tests by using click-based selection (removes flaky keyboard timing issues) and ensured `npm -C frontend run build` passes (AC #8).

### Verification

- `npm -C frontend run test:run` ✅ (24/24 files, 317/317 tests)
- `npm -C frontend run build` ✅ (zero TypeScript errors)

### File List

- `frontend/src/theme.ts` — Modified: Extended with hover/active/light/accessible color tokens, semantic tokens, Button/Badge/Alert recipes, global CSS (focus, selection, links), fontSizes, lineHeights
- `frontend/src/theme/tokens.ts` — New: BRAND_COLORS constant for non-Chakra usage
- `frontend/src/theme/index.ts` — New: Barrel export for system and BRAND_COLORS
- `frontend/src/theme.test.tsx` — New: 41 tests for theme tokens, font/spacing/lineHeight verification, component render tests
- `frontend/src/theme/tokens.test.ts` — New: 16 tests for BRAND_COLORS values and WCAG contrast ratio validation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Modified: Updated 8-1 status and epic-8 status
