# Story 8.4: Implement SyncStatusIndicator Component

Linear Issue ID: VIX-370
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a production-quality SyncStatusIndicator design-system component with brand token compliance, ARIA live-region announcements, auto-refreshing relative timestamps, and consistent Vixxo design system styling,
so that sync status is displayed consistently, accessibly, and in full compliance with the Vixxo brand design system and UX specification.

## Acceptance Criteria

1. **Given** sync status data is available, **When** SyncStatusIndicator is rendered with `status: 'success'` and `lastSyncedAt` within 4 hours, **Then** the dot uses brand token `brand.teal` (Vixxo Teal #2C7B80) instead of generic `green.500`, and text reads "Last synced: [relative time]"
2. **Given** sync status data shows stale data (4–24 hours old), **When** SyncStatusIndicator is rendered, **Then** the dot uses brand token `brand.yellow` (Vixxo Yellow #EDA200) instead of generic `yellow.500`
3. **Given** sync status data shows error or very stale (>24h), **When** SyncStatusIndicator is rendered, **Then** the dot uses `error.red` (#E53E3E) instead of generic `red.500`
4. **Given** sync has never occurred, **When** SyncStatusIndicator is rendered, **Then** the dot uses `brand.grayLight` (#718096) instead of generic `gray.400`
5. **Given** the component is in the DOM and time passes, **When** 60 seconds elapse since last render, **Then** the relative time text auto-refreshes (e.g., "2 minutes ago" becomes "3 minutes ago") without requiring a page refresh or new API call
6. **Given** the sync status changes (e.g., success → error, or syncing → success), **When** the component re-renders, **Then** an ARIA live region announces the status change to screen readers (e.g., "Sync status: Last synced 2 minutes ago" or "Sync status: Linear is unreachable")
7. **Given** an optional `compact` prop is set to `true`, **When** SyncStatusIndicator is rendered in compact mode, **Then** the dot and text render without the error alert banner (dot + single-line text only), suitable for embedding in tight layouts like BacklogItemCard or header bars
8. **Given** the component is styled, **When** inspecting the rendered output, **Then** all colors use brand tokens or semantic tokens from theme.ts — no hardcoded hex values and no generic Chakra gray/green/yellow/red palette references
9. **Given** the `status: 'error'` state, **When** SyncStatusIndicator is rendered in default (non-compact) mode, **Then** the error alert banner displays with the brand alert recipe styling (from theme.ts), user-friendly title, description, guidance, last successful sync time, and "Refresh data" button — preserving all existing error behavior
10. **Given** the `status: 'partial'` state, **When** SyncStatusIndicator is rendered, **Then** the partial warning displays with brand token `brand.yellow` and item failure count — preserving existing partial behavior
11. **And** all existing 18 SyncStatusIndicator tests continue to pass without modification (backward compatibility)
12. **And** `npm run build` passes with zero TypeScript errors in `frontend/`
13. **And** new unit tests verify: brand token usage on all dot colors, ARIA live region announcements, auto-refresh behavior, compact variant rendering, and backward compatibility of default rendering

## Tasks / Subtasks

- [x] Task 1: Replace generic Chakra color tokens with brand tokens (AC: #1, #2, #3, #4, #8)
  - [x] 1.1: In `getStatusDotColor()`, replace `'green.500'` → `'brand.teal'` for recent sync (<4h)
  - [x] 1.2: Replace `'yellow.500'` → `'brand.yellow'` for stale sync (4–24h)
  - [x] 1.3: Replace `'red.500'` → `'error.red'` for error/very stale (>24h)
  - [x] 1.4: Replace `'gray.400'` → `'brand.grayLight'` for never-synced state
  - [x] 1.5: In partial status rendering, replace `bg="yellow.500"` → `bg="brand.yellow"` on the dot
  - [x] 1.6: Update all `data-color` test attributes to match new brand token names
  - [x] 1.7: Audit remaining color references — `fg.muted` is acceptable as a semantic Chakra token for muted text

- [x] Task 2: Add ARIA live region for screen reader announcements (AC: #6)
  - [x] 2.1: Wrap the entire component output in a container with `aria-live="polite"` and `aria-atomic="true"` so screen readers announce status changes
  - [x] 2.2: Added `aria-hidden="true"` to status dots since the text conveys the same information (preferred over separate aria-label on a decorative dot)
  - [x] 2.3: Ensure the error alert banner retains its existing ARIA attributes (it already uses `Alert.Root` which provides ARIA semantics)
  - [x] 2.4: Add `role="status"` to the wrapper element so assistive technologies identify it as a live status indicator

- [x] Task 3: Implement auto-refresh for relative time display (AC: #5)
  - [x] 3.1: Add a `useEffect` with `setInterval` that increments a local counter every 60 seconds to force re-render of relative time text
  - [x] 3.2: Use a `useState` tick counter pattern: `const [, setTick] = useState(0)` and `setInterval(() => setTick(t => t + 1), 60_000)`
  - [x] 3.3: Clean up the interval in the effect's cleanup function to prevent memory leaks
  - [x] 3.4: The `formatRelativeTime()` utility uses `new Date()` internally, so re-rendering is sufficient — no need to change the utility

- [x] Task 4: Implement compact variant prop (AC: #7)
  - [x] 4.1: Add optional `compact?: boolean` prop to the component (defaults to `false` for backward compatibility)
  - [x] 4.2: When `compact` is `true` and status is `'error'`: render as dot + single-line error text (e.g., "Sync error — [title]") instead of full alert banner
  - [x] 4.3: When `compact` is `true` and status is `'syncing'`: render spinner + "Syncing..." text (same as current — no change needed)
  - [x] 4.4: When `compact` is `true` and status is success/partial/never-synced: render as-is (these are already compact single-line)
  - [x] 4.5: Add `data-compact` attribute for test assertions

- [x] Task 5: Ensure error alert uses brand recipe styling (AC: #9)
  - [x] 5.1: Verified `Alert.Root status="error"` picks up the brand alert recipe from theme.ts for error state (red recipe styling)
  - [x] 5.2: Alert recipe auto-applies via Chakra v3 slot recipe with `variant="subtle"` already set
  - [x] 5.3: "Refresh data" button uses `variant="outline"` which matches brand outline recipe

- [x] Task 6: Write new tests (AC: #11, #12, #13)
  - [x] 6.1: All 18 existing tests pass with updated `data-color` values (brand.teal, brand.yellow, error.red)
  - [x] 6.2: Add test: dot uses `brand.teal` when sync is recent (<4h)
  - [x] 6.3: Add test: dot uses `brand.yellow` when sync is stale (4–24h)
  - [x] 6.4: Add test: dot uses `error.red` when sync is very stale (>24h)
  - [x] 6.5: Add test: never-synced state uses `brand.grayLight` dot + "Not yet synced" text
  - [x] 6.6: Add test: ARIA live region wrapper has `aria-live="polite"` and `role="status"` (3 tests: success, syncing, error states)
  - [x] 6.7: Add test: compact mode renders error as inline text instead of alert banner
  - [x] 6.8: Add test: compact mode still shows dot and "Last synced" text for success state
  - [x] 6.9: Add test: auto-refresh updates visible relative time text (e.g. 2 → 3 minutes) + cleanup test
  - [x] 6.10: Add test: `data-compact` attribute present when compact prop is true (and absent when false)

- [x] Task 7: Build verification and regression check (AC: #12)
  - [x] 7.1: Run `npx tsc --noEmit` — zero TypeScript errors
  - [x] 7.2: Run `npx vitest run` — all 486 tests pass across 39 files, no regressions

## Dev Notes

### What's Already Done (CRITICAL — do not break existing behavior)

The following are **already implemented** and must be preserved:

- **SyncStatusIndicator component**: `frontend/src/features/backlog/components/sync-status-indicator.tsx`
  - Renders 5 states: loading (null), syncing (spinner), error (alert banner), partial (yellow dot + warning), success (color dot + "Last synced")
  - Never-synced fallback: "Not yet synced" text
  - Uses `useSyncStatus()` hook from `../hooks/use-sync-status` (TanStack Query, 5s polling)
  - Uses `formatRelativeTime()` from `@/utils/formatters` (native `Intl.RelativeTimeFormat`)
  - Uses `getUserFriendlyErrorMessage()` from `@/utils/sync-error-messages`
  - Error alert with "Refresh data" button that calls `queryClient.invalidateQueries({ queryKey: ['backlog-items'] })`
  - `getStatusDotColor()` helper: green.500 (<4h), yellow.500 (4-24h), red.500 (>24h/error), gray.400 (null)
  - `data-testid="sync-status-dot"` and `data-color` attributes for testing

- **SyncStatusIndicator tests**: `frontend/src/features/backlog/components/sync-status-indicator.test.tsx`
  - 18 tests covering: loading null, never-synced, syncing spinner, green/yellow/red dot colors, error alert with user-friendly messages, last successful sync in error, no technical details exposed, guidance text, refresh button, partial status with item counts, singular/plural items, no error banner for partial, no refresh button for success

- **Consumers** (update carefully — they already use SyncStatusIndicator):
  - `frontend/src/features/backlog/components/backlog-page.tsx` — renders `<SyncStatusIndicator />` inside an `HStack` next to the "Backlog" heading
  - No props currently passed — all new props MUST be optional for backward compatibility

- **SyncStatus type**: `frontend/src/features/backlog/types/backlog.types.ts`
  - `status: 'idle' | 'syncing' | 'success' | 'error' | 'partial'`
  - `lastSyncedAt: string | null`
  - `itemCount: number | null`
  - `errorMessage: string | null`
  - `errorCode: string | null`
  - `itemsSynced: number | null`
  - `itemsFailed: number | null`

- **useSyncStatus hook**: `frontend/src/features/backlog/hooks/use-sync-status.ts`
  - TanStack Query with `refetchInterval: 5_000`, `staleTime: 30_000`
  - Returns `{ syncStatus, isLoading, error }`

- **formatRelativeTime**: `frontend/src/utils/formatters.ts`
  - Uses native `Intl.RelativeTimeFormat` (no date-fns dependency)
  - Output: "just now" (<60s), "2 minutes ago", "1 hour ago", "yesterday", "3 days ago", absolute date (>7d)

- **getUserFriendlyErrorMessage**: `frontend/src/utils/sync-error-messages.ts`
  - Maps error codes to `{ title, description, guidance }` objects
  - Covers: SYNC_API_UNAVAILABLE, SYNC_AUTH_FAILED, SYNC_RATE_LIMITED, SYNC_CONFIG_ERROR, SYNC_TIMEOUT, SYNC_UNKNOWN_ERROR, SYNC_PARTIAL_SUCCESS, SYNC_TRANSFORM_FAILED
  - Default fallback for unknown codes

- **Theme tokens** (from Story 8.1): `frontend/src/theme.ts`
  - `brand.green` (#8E992E), `brand.greenAccessible` (#6F7B24), `brand.greenLight` (#F4F5E9)
  - `brand.gray` (#3E4543), `brand.grayLight` (#718096), `brand.grayBg` (#F7FAFC)
  - `brand.teal` (#2C7B80), `brand.tealLight` (#E6F6F7)
  - `brand.yellow` (#EDA200), `brand.yellowLight` (#FFF8E6)
  - `brand.blue` (#395389), `brand.copper` (#956125)
  - `error.red` (#E53E3E), `error.redLight` (#FFF5F5), `error.redAccessible` (#C53030)
  - Semantic tokens: `brand.primary`, `brand.success`, `brand.warning`, `brand.danger`, `brand.info`
  - Alert slot recipe with status variants: success, error, warning, info
  - Button recipe with variants: brand, outline, ghost, danger

### What This Story ADDS

This story enhances the existing SyncStatusIndicator from a functional component to a **production-quality design system component**:

1. **Brand token compliance** — Replace generic Chakra palette colors (green.500, yellow.500, red.500, gray.400) with brand tokens (brand.teal, brand.yellow, error.red, brand.grayLight)
2. **ARIA live region** — Wrap component in `role="status"` + `aria-live="polite"` for screen reader announcements on status changes
3. **Auto-refresh relative time** — 60-second interval tick to re-render relative timestamps without API calls
4. **Compact variant** — Optional `compact` prop for embedding in tight layouts (dot + text only, no alert banner for errors)
5. **Extended test coverage** — Tests for all new features + backward compatibility

### Architecture Compliance

- **File locations**: Component stays at `frontend/src/features/backlog/components/sync-status-indicator.tsx`, tests co-located at `sync-status-indicator.test.tsx`
- **Naming**: kebab-case files, PascalCase exports (`SyncStatusIndicator`), camelCase variables
- **No new npm dependencies**: All utilities already exist (formatRelativeTime, getUserFriendlyErrorMessage)
- **Immutable updates**: Pure component, no side effects except the auto-refresh interval (properly cleaned up)
- **TypeScript strict mode**: All exports properly typed, no `any` usage
- **Theme tokens**: Use brand tokens from theme.ts — DO NOT hardcode hex values in the component
- **Co-located tests**: Tests live alongside source file per architecture spec

### Brand Token Color Mapping (CRITICAL)

The UX spec defines SyncStatusIndicator colors as:
- **Recent sync (<4h)**: Vixxo Teal (#2C7B80) for info → `brand.teal`
- **Stale sync (4–24h)**: Vixxo Yellow (#EDA200) for warnings → `brand.yellow`
- **Error/very stale (>24h)**: Red (#E53E3E) for errors → `error.red`
- **Never synced**: Gray for neutral → `brand.grayLight`

**Why Teal instead of Green for "recent"?** The UX spec specifies Teal (#2C7B80) for info/status indicators. Green (#8E992E) is reserved for primary brand actions (buttons, links, focus indicators). Using Teal for sync status aligns with the semantic color mapping: `brand.info` = Teal. This is consistent with the UX section "SyncStatusIndicator Specifications" which explicitly states "Colors: Vixxo Teal (#2C7B80) for info."

### Chakra UI v3 API Reference

**ARIA live region** (v3):
```typescript
// Wrapper with status role and live region
<Box role="status" aria-live="polite" aria-atomic="true">
  {/* Component content */}
</Box>
```

**Box/Flex/HStack** (already used):
```typescript
import { Alert, Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
```

**Alert slot recipe** (v3 — already configured in theme.ts):
```typescript
// Alert uses slot recipe from theme
<Alert.Root status="warning" variant="subtle" borderRadius="md" size="sm">
  <Alert.Indicator />
  <Box flex="1">
    <Alert.Title>Title</Alert.Title>
    <Alert.Description>Description</Alert.Description>
  </Box>
</Alert.Root>
```

### Auto-Refresh Implementation Pattern

```typescript
// Re-render every 60s to update relative time display
const [, setTick] = useState(0)

useEffect(() => {
  const interval = setInterval(() => setTick(t => t + 1), 60_000)
  return () => clearInterval(interval)
}, [])
```

**Why this works**: `formatRelativeTime()` calls `new Date()` internally on each render, so incrementing the tick counter forces a re-render which recalculates the relative time. No need to change the utility function.

### WCAG & Accessibility Notes

- **ARIA live region**: `role="status"` + `aria-live="polite"` ensures screen readers announce changes without interrupting current reading
- **aria-atomic="true"**: Entire status region is announced as a unit, not just the changed part
- **Status dot**: Already has `data-testid` — add `aria-hidden="true"` since the text conveys the same information
- **Error alert**: Already uses `Alert.Root` which provides ARIA alert semantics
- **Refresh button**: Already has `aria-label="Refresh backlog data"`
- **Color**: Dot color is NOT the sole indicator — text always accompanies the dot (compliant)
- **Contrast**: brand.teal (#2C7B80) on white = 4.8:1 ✅ AA, brand.yellow (#EDA200) on white = 1.8:1 (used as dot bg only, not text), error.red (#E53E3E) on white = 4.13:1 (dot only, not text)

### Testing Patterns

- Use `vitest` + `@testing-library/react`
- Import `render`, `screen`, `fireEvent` from `@/utils/test-utils` (includes ChakraProvider)
- Use `makeSyncStatus()` helper already defined in test file
- Mocks already configured: `useSyncStatus`, `useQueryClient`, `formatRelativeTime`, `getUserFriendlyErrorMessage`
- For auto-refresh: use `vi.useFakeTimers()` + `vi.advanceTimersByTime(60_000)` to verify interval fires
- For ARIA: use `screen.getByRole('status')` to find the live region wrapper
- For compact mode: use `data-compact` attribute and verify no alert banner rendered
- **IMPORTANT**: Existing tests check `data-color` attribute values (e.g., `'green.500'`, `'yellow.500'`, `'red.500'`) — these MUST be updated to new brand token names (`'brand.teal'`, `'brand.yellow'`, `'error.red'`)

### What NOT To Do

- **Do NOT** change the `useSyncStatus` hook or its polling behavior — it works correctly
- **Do NOT** change the `formatRelativeTime` utility — it works correctly with native `Intl.RelativeTimeFormat`
- **Do NOT** change the `getUserFriendlyErrorMessage` utility — it works correctly
- **Do NOT** change the `SyncStatus` type — it provides all needed data
- **Do NOT** move the component file — it stays in `features/backlog/components/`
- **Do NOT** add new npm dependencies — all utilities already exist
- **Do NOT** hardcode hex color values — always use Chakra theme tokens
- **Do NOT** use `extendTheme` (Chakra v2 API) — the project uses `defineConfig` + `createSystem` (v3)
- **Do NOT** change the Alert recipe in theme.ts — it already has the right variants
- **Do NOT** create a separate recipe in theme.ts for SyncStatusIndicator — keep styling inline
- **Do NOT** change the component's rendering states logic (loading → syncing → error → partial → never-synced → success) — only enhance styling and add features
- **Do NOT** add `tabIndex` or make the status dot interactive — it's a passive status indicator
- **Do NOT** break backward compatibility — all new props MUST be optional, existing consumer (`backlog-page.tsx`) passes no props

### Project Structure Notes

- Modified: `frontend/src/features/backlog/components/sync-status-indicator.tsx` — Add brand tokens, ARIA live region, auto-refresh, compact prop
- Modified: `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` — Update data-color values in existing tests, add new tests for all new features
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

**From Story 8.2 (Implement StackRankBadge Component):**
- StackRankBadge enhanced with `size` prop and `variant` prop
- Pattern established: adding optional props to existing components for design system flexibility
- Pre-existing flaky tests: 4-6 keyboard-based Chakra Select interaction tests (sort-control, business-unit-filter, backlog-list) — not related to this story

**From Story 8.3 (Implement BacklogItemCard Component):**
- BacklogItemCard enhanced with description, dates, variant, responsive, skeleton, brand tokens
- Pattern: replaced gray.50 → brand.grayBg, gray.500 → brand.grayLight, gray.700 → brand.gray
- `date-fns` was installed for BacklogItemCard's formatDistanceToNow (but SyncStatusIndicator uses native Intl.RelativeTimeFormat — do NOT switch)
- All 468 frontend tests pass after Story 8.3
- SWC native binding issue resolved by clean reinstall after dependency changes

**From Epic 6 (Data Synchronization):**
- SyncStatusIndicator was built during Story 6.3 (Display Sync Status to Users) and enhanced during Story 6.4 (Sync Error Handling)
- The component is functional and well-tested but uses generic Chakra colors instead of brand tokens
- Error handling is comprehensive with user-friendly messages and error code classification

### Git Intelligence

Recent commits show:
- `b4b5a95 feat: implement BacklogItemCard component (Story 8.3, VIX-369)` — Most recent
- `50bf265 feat: move sync cron schedule to database with 15-min default`
- `95eef94 feat: implement StackRankBadge component (Story 8.2, VIX-368)`
- `385eed3 feat: complete Chakra theme customization (VIX-367)`
- Pattern: Feature commits use `feat:` prefix with Linear issue IDs
- Pattern: Component modifications stay within their existing file locations
- Pattern: Tests are co-located and extended (not rewritten)
- Pattern: Brand token replacement is a systematic find-and-replace of generic Chakra colors

### Existing Consumer Context

**BacklogPage** (`backlog-page.tsx`) renders SyncStatusIndicator as follows:
```typescript
<HStack justify="space-between" align="center">
  <Heading size="lg" color="brand.gray">
    Backlog
  </Heading>
  <SyncStatusIndicator />
</HStack>
```
- No props passed → will use defaults (non-compact, auto-refresh enabled)
- HStack provides horizontal layout — SyncStatusIndicator renders at right side of header
- No changes needed to consumer for this story

**BacklogList** (`backlog-list.tsx`) references SyncStatusIndicator in a comment:
```typescript
// The SyncStatusIndicator in BacklogPage already warns "Data shown may be outdated".
```
- BacklogList does NOT import or render SyncStatusIndicator — it relies on BacklogPage to show it
- No changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 8.4] — Story requirements and AC
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#SyncStatusIndicator] — Component specs: location (top right), content, colors (Teal/Yellow/Red), states, accessibility (ARIA live region)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — Color system, semantic mapping, accessibility compliance
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] — Success/Error/Warning/Info message patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Design & Accessibility] — ARIA live regions, keyboard nav, screen reader support
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Feature-based organization, Chakra UI, TanStack Query
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, co-located tests, immutable state
- [Source: frontend/src/features/backlog/components/sync-status-indicator.tsx] — Existing component (modify in place)
- [Source: frontend/src/features/backlog/components/sync-status-indicator.test.tsx] — Existing 18 tests (preserve, extend)
- [Source: frontend/src/features/backlog/components/backlog-page.tsx] — Primary consumer
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — SyncStatus type
- [Source: frontend/src/features/backlog/hooks/use-sync-status.ts] — useSyncStatus hook
- [Source: frontend/src/utils/formatters.ts] — formatRelativeTime utility
- [Source: frontend/src/utils/sync-error-messages.ts] — getUserFriendlyErrorMessage utility
- [Source: frontend/src/theme.ts] — Brand tokens, semantic tokens, recipes (from Story 8.1)
- [Source: _bmad-output/implementation-artifacts/8-3-implement-backlogitemcard-component.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- All 18 existing tests passed after Task 1 brand token replacement
- All 35 tests (18 original + 17 new) passed after Tasks 2-6
- `npx tsc --noEmit` — zero errors
- `npx vitest run` — 486 tests passed across 39 files, zero regressions
- `npm run build` (frontend) — passes (tsc + vite build)

### Completion Notes List

- **Task 1**: Replaced all 6 generic Chakra color tokens in `getStatusDotColor()` and partial status rendering with brand tokens: green.500→brand.teal, yellow.500→brand.yellow, red.500→error.red, gray.400→brand.grayLight. Updated 4 `data-color` assertions in existing tests. Audited `fg.muted` — acceptable as Chakra semantic token.
- **Task 2**: Wrapped all non-loading render paths in `<Box role="status" aria-live="polite" aria-atomic="true">`. Added `aria-hidden="true"` to all status dots (decorative — text conveys same info). Error alert retains existing ARIA semantics from `Alert.Root`.
- **Task 3**: Added `useState` tick counter + `useEffect` with 60-second `setInterval` for auto-refresh of relative timestamps. Cleanup function properly clears interval on unmount.
- **Task 4**: Added `SyncStatusIndicatorProps` interface with optional `compact?: boolean` prop (defaults to `false`). In compact error mode, renders dot + inline "Sync error — [title]" instead of full alert banner. Added `data-compact` attribute for test assertions.
- **Task 5**: Updated error banner to `Alert.Root status="error"` (matches error semantics) while retaining existing messaging + refresh behavior.
- **Task 6**: Added/updated tests to verify never-synced dot rendering (`brand.grayLight`) and that auto-refresh updates the visible relative time text.
- **Task 7**: Verified `npm run test:run` (486 tests) and `npm run build` (frontend) both pass.

### Change Log

- 2026-02-11: Story 8.4 implementation complete — brand tokens, ARIA live region, auto-refresh, compact variant, 17 new tests
- 2026-02-11: Senior dev review fixes — render never-synced dot (`brand.grayLight`), align error banner status to `error`, harden tests, build verified

### File List

- Modified: `frontend/src/features/backlog/components/sync-status-indicator.tsx`
- Modified: `frontend/src/features/backlog/components/sync-status-indicator.test.tsx`
- Modified: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Modified: `_bmad-output/implementation-artifacts/8-4-implement-syncstatusindicator-component.md`

## Senior Developer Review (AI)

- Fixed AC #4 mismatch by rendering a `brand.grayLight` dot in the never-synced state.
- Changed error alert banner to use `Alert.Root status="error"` to match error semantics.
- Strengthened tests so auto-refresh proves visible time text changes (2 → 3 minutes).
- Ensured `npm run test:run` and `npm run build` pass in `frontend/`.
