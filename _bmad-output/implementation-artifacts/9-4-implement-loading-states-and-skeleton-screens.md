# Story 9.4: Implement Loading States and Skeleton Screens

Linear Issue ID: VIX-377
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want comprehensive, layout-accurate loading states and skeleton screens across all application views,
so that users see immediate visual feedback while data loads, maintaining the perception of speed, building trust in the application, and meeting performance UX targets.

## Acceptance Criteria

1. **Given** the backlog list page is loading data, **When** the user navigates to the page, **Then** a skeleton screen matching the final list layout (5 card placeholders with priority badge, title, description, and metadata shapes) is displayed and transitions smoothly to real content — existing `BacklogListSkeleton` verified working
2. **Given** the item detail modal is opening, **When** the user clicks a backlog item, **Then** the modal displays skeleton shapes matching the final content layout — header (priority badge + title + metadata), description section (multi-line text skeletons of varying widths), comments section (2-3 comment card skeletons with avatar circle + text), and activity section (3-4 timeline entry skeletons) — with smooth fade transition to loaded content
3. **Given** the admin user management page is loading, **When** an admin navigates to user management, **Then** a table skeleton (header row + 5 data row placeholders matching column layout: name, email, role, status, last access, actions) replaces the current "Loading users..." text message
4. **Given** the admin user approval section is loading, **When** pending users are being fetched, **Then** a list skeleton (3 card/row placeholders matching user approval card layout: avatar/name, email, approve button area) replaces the current "Loading pending users..." text message
5. **Given** the sync history section is loading, **When** sync history is being fetched, **Then** a table skeleton (header row + 5 row placeholders matching sync history columns: timestamp, status badge, duration, items synced, errors) replaces the current "Loading history..." text message
6. **Given** the sync status indicator is in its initial load state, **When** the page first renders, **Then** a small inline skeleton placeholder (`~120px` wide) is shown instead of returning `null` (empty space), matching the "Last synced: X ago" text dimensions
7. **Given** any button triggers an async action (sync trigger, user approval, user status toggle, logout), **When** the action is in progress, **Then** the button shows a `Spinner` with disabled state preventing duplicate actions — verify all async buttons are consistent
8. **And** all skeleton screens match the final content layout in terms of dimensions, spacing, and visual structure
9. **And** transitions from skeleton to content use Chakra UI's built-in fade animation (no jarring flash)
10. **And** `npm run build` passes with zero TypeScript errors in `frontend/`
11. **And** all existing tests continue to pass (no regressions)
12. **And** new tests verify skeleton rendering during loading states for each enhanced component

## Tasks / Subtasks

- [x] Task 1: Enhance admin UserManagementList skeleton (AC: #3)
  - [x] 1.1: Create `UserManagementListSkeleton` component inside `user-management-list.tsx` showing a skeleton table: header row with 6 column label skeletons, plus 5 data row skeletons — each row contains name skeleton (`width="40%"`), email skeleton (`width="55%"`), role badge skeleton (`width="60px"`), status skeleton (`width="50px"`), last access skeleton (`width="80px"`), action button skeleton (`width="70px"`)
  - [x] 1.2: Replace `<Text color="fg.muted">Loading users...</Text>` with `<UserManagementListSkeleton />`
  - [x] 1.3: Add `data-testid="user-management-skeleton"` to the skeleton wrapper
  - [x] 1.4: Write test in `user-management-list.test.tsx` verifying skeleton renders when `isLoading` is true

- [x] Task 2: Enhance admin UserApprovalList skeleton (AC: #4)
  - [x] 2.1: Create `UserApprovalListSkeleton` component inside `user-approval-list.tsx` showing 3 card skeletons — each card contains avatar circle skeleton (`boxSize="10"`, `borderRadius="full"`), name skeleton (`width="50%"`, `height="5"`), email skeleton (`width="65%"`, `height="4"`), and approve button skeleton (`width="80px"`, `height="8"`)
  - [x] 2.2: Replace `<Text color="fg.muted">Loading pending users...</Text>` with `<UserApprovalListSkeleton />`
  - [x] 2.3: Add `data-testid="user-approval-skeleton"` to the skeleton wrapper
  - [x] 2.4: Write test in `user-approval-list.test.tsx` verifying skeleton renders when `isLoading` is true

- [x] Task 3: Enhance SyncControl history skeleton (AC: #5)
  - [x] 3.1: Create `SyncHistorySkeleton` component inside `sync-control.tsx` showing a skeleton table: header row with 5 column label skeletons, plus 5 data row skeletons — each row contains timestamp skeleton (`width="120px"`), status badge skeleton (`width="70px"`, `borderRadius="full"`), duration skeleton (`width="50px"`), items count skeleton (`width="40px"`), error skeleton (`width="60%"`)
  - [x] 3.2: Replace the "Loading history..." text section with `<SyncHistorySkeleton />`
  - [x] 3.3: Add `data-testid="sync-history-skeleton"` to the skeleton wrapper
  - [x] 3.4: Write test verifying sync history skeleton renders when `isHistoryLoading` is true

- [x] Task 4: Enhance SyncStatusIndicator initial load (AC: #6)
  - [x] 4.1: In `sync-status-indicator.tsx`, replace the `return null` branch for `isLoading` with a small inline skeleton: `<Skeleton height="4" width="120px" />` matching the "Last synced: X ago" text area
  - [x] 4.2: Add `data-testid="sync-status-skeleton"` to the skeleton
  - [x] 4.3: Write test verifying skeleton renders during initial load instead of null

- [x] Task 5: Enhance ItemDetailModal body skeleton (AC: #2)
  - [x] 5.1: Create `ItemDetailBodySkeleton` component inside `item-detail-modal.tsx` replacing the generic `<Skeleton height="20" />` and `<Skeleton height="32" />` blocks with layout-accurate skeletons:
    - **Description section:** 4 text-line skeletons with varying widths (`width="100%"`, `width="95%"`, `width="80%"`, `width="60%"`) and `height="4"` with `mb="2"` spacing
    - **Comments section heading:** Skeleton `width="100px"` `height="5"`, then 2-3 comment card skeletons — each with: circle avatar (`boxSize="8"`, `borderRadius="full"`), author name skeleton (`width="80px"`, `height="4"`), timestamp skeleton (`width="60px"`, `height="3"`), comment body skeleton (2 lines: `width="90%"` and `width="70%"`, `height="4"`)
    - **Activity section heading:** Skeleton `width="80px"` `height="5"`, then 3-4 timeline entry skeletons — each with: small circle indicator (`boxSize="3"`, `borderRadius="full"`), activity text skeleton (`width="70%"`, `height="4"`)
  - [x] 5.2: Replace existing generic body skeleton blocks with `<ItemDetailBodySkeleton />`
  - [x] 5.3: Add `data-testid="item-detail-body-skeleton"` to the skeleton wrapper
  - [x] 5.4: Write test verifying enhanced body skeleton renders when `isLoading` is true

- [x] Task 6: Verify and polish existing skeletons (AC: #1, #7, #8, #9)
  - [x] 6.1: Verify `BacklogListSkeleton` renders correctly with 5 card skeletons and smooth transition to content — check visual match
  - [x] 6.2: Verify `BacklogItemCardSkeleton` matches current `BacklogItemCard` layout for both `default` and `compact` variants
  - [x] 6.3: Audit all async button actions for consistent loading patterns:
    - Sync trigger button in `sync-control.tsx` — verify `<Spinner size="sm">` + disabled
    - Approve button in `user-approval-list.tsx` — verify loading state
    - Toggle status buttons in `user-management-list.tsx` — verify loading state
    - Logout button in `app-header.tsx` — verify `loading` prop
  - [x] 6.4: Fix any inconsistent button loading patterns found during audit
  - [x] 6.5: Visually verify Chakra UI skeleton pulse animation is active on all skeletons

- [x] Task 7: Build verification (AC: #10, #11)
  - [x] 7.1: Run `npx tsc --noEmit` in frontend/ — zero TypeScript errors
  - [x] 7.2: Run `npx vitest run` in frontend/ — all tests pass (existing + new)
  - [x] 7.3: Run `npm run build` in frontend/ — build succeeds

## Dev Notes

### What's Already Done (CRITICAL — do not recreate or break)

The following loading state infrastructure is **already implemented** and working:

| Component | Current Loading Pattern | Status |
|-----------|----------------------|--------|
| `BacklogList` | `BacklogListSkeleton` — 5 card skeletons with badge, title, desc, metadata | DONE — verify only |
| `BacklogItemCard` | `BacklogItemCardSkeleton` — default + compact variant support | DONE — verify only |
| `ItemDetailModal` header | Skeleton badge `boxSize="10"` + title `height="6"` `width="80%"` + metadata `height="4"` `width="40%"` | DONE — no change |
| `ItemDetailModal` body | Generic `<Skeleton height="20" />` + `<Skeleton height="32" />` | NEEDS ENHANCEMENT |
| `App` (auth loading) | Full-screen `<Spinner size="xl">` + "Loading..." centered text | DONE — no change |
| `SyncControl` (sync button) | `<Spinner size="sm">` in button when `isSyncing \|\| isTriggering` | DONE — verify only |
| `AppHeader` (logout) | `loading={isLoggingOut}` Button prop | DONE — verify only |
| `SyncStatusIndicator` | Returns `null` during `isLoading`, shows `<Spinner size="xs">` when syncing | NEEDS SKELETON for initial load |
| `UserManagementList` | Plain text: "Loading users..." | NEEDS SKELETON |
| `UserApprovalList` | Plain text: "Loading pending users..." | NEEDS SKELETON |
| `SyncControl` (history) | Plain text: "Loading history..." | NEEDS SKELETON |

**Existing skeleton component patterns to replicate exactly:**

```typescript
// Pattern from backlog-item-card.tsx (lines 228-256)
// Skeletons are defined as named exports inside the component file
export function BacklogItemCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  return (
    <Box /* same layout as BacklogItemCard using Flex/Box */>
      <Skeleton boxSize="8" borderRadius="full" /> {/* Priority badge */}
      <Box flex="1">
        <Skeleton height="5" width="60%" />  {/* Title */}
        {variant === 'default' && <Skeleton height="4" width="80%" />} {/* Description */}
        <Skeleton height="4" width="40%" />  {/* Metadata row */}
      </Box>
    </Box>
  )
}
```

```typescript
// Pattern from backlog-list.tsx (lines 19-33)
// BacklogListSkeleton renders 5 BacklogItemCardSkeletons
function BacklogListSkeleton() {
  return (
    <VStack gap="3" align="stretch">
      {Array.from({ length: 5 }).map((_, i) => (
        <BacklogItemCardSkeleton key={i} />
      ))}
    </VStack>
  )
}

// Usage in component:
if (isLoading) {
  return (
    <Box data-testid="backlog-list-loading">
      <Skeleton height="5" width="120px" mb="4" />  {/* Results count placeholder */}
      <BacklogListSkeleton />
    </Box>
  )
}
```

**TanStack Query loading state sources (do NOT change query keys or cache config):**

| Hook | Query Key | Returns | File |
|------|-----------|---------|------|
| `useBacklogItems()` | `['backlog-items']` | `isLoading` | `use-backlog-items.ts` |
| `useBacklogItemDetail(id)` | `['backlog-item', id]` | `isLoading` | `use-backlog-item-detail.ts` |
| `useSyncStatus()` | query key in hook | `isLoading` | admin hooks |
| `useSyncHistory()` | query key in hook | `isLoading` | admin hooks |
| `useAllUsers()` | query key in hook | `isLoading` | admin hooks |
| `usePendingUsers()` | query key in hook | `isLoading` | admin hooks |
| `useAuth()` | query key in hook | `isLoading` | auth hooks |

**Current middleware chain in `app.ts` (from Story 9.3 — no changes needed):**

| Order | Middleware | Notes |
|-------|-----------|-------|
| 1 | `trust proxy` | Client IP behind reverse proxy |
| 2 | `helmet()` | Security headers |
| 3 | `cors()` | CORS |
| 4 | `compression()` | gzip/brotli (Story 9.3) |
| 5 | `express.json()` | Body parser |
| 6 | `express.urlencoded()` | Body parser |
| 7 | `responseTimeMiddleware` | Response time logging (Story 9.3) |
| 8 | `createSessionMiddleware()` | Session |
| 9 | `/api` health routes | Before network check |
| 10 | `networkVerificationMiddleware` | IP/CIDR check |
| 11 | `/api` routes | Main API |
| 12 | `errorMiddleware` | Error handling (must be last) |

### Architecture Compliance

- **Chakra UI Skeleton:** Use Chakra UI v3 `<Skeleton>` component for all skeleton screens [Source: architecture.md#Design System, ux-design-specification.md#Loading States]
- **Chakra UI Spinner:** Use `<Spinner>` for button/action loading states [Source: ux-design-specification.md#Component Strategy]
- **Loading State Naming:** Boolean prefix pattern: `isLoading`, `isFetching`, `isSyncing` [Source: project-context.md#React Patterns, architecture.md#Communication Patterns]
- **Component Naming:** PascalCase components, kebab-case files [Source: architecture.md#Naming Patterns]
- **Co-located Tests:** Test files alongside source files [Source: architecture.md#Structure Patterns]
- **Feature-based Organization:** Components stay in their feature directories [Source: architecture.md#Structure Patterns]
- **Skeleton Placement:** Define skeleton components as named exports inside the same file as their real component (follow `BacklogItemCardSkeleton` pattern) [Source: existing codebase pattern]
- **No Backend Changes:** This story is entirely frontend — do not modify backend code [Source: Story scope]

### Technical Requirements

**Chakra UI v3 Skeleton Component API:**

```typescript
import { Skeleton, Spinner } from '@chakra-ui/react'

// Basic skeleton rectangle
<Skeleton height="5" width="60%" />

// Circle skeleton (for badges, avatars)
<Skeleton boxSize="8" borderRadius="full" />

// Inline skeleton wrapping content (Chakra v3 pattern)
<Skeleton loading={isLoading}>
  <Text>Revealed when loaded</Text>
</Skeleton>
```

- Chakra UI v3 `<Skeleton>` includes built-in pulse animation
- Use conditional rendering (`if (isLoading) return <Skeleton />`) for full-component replacement (existing established pattern)
- Use `loading` prop for inline content wrapping when the layout is shared between loaded/loading states
- Skeleton automatically fades out when replaced by content (no extra animation code needed)

**Skeleton Layout Matching Rules (CRITICAL for UX):**

1. Skeletons MUST use the **same layout components** (Flex, Box, Grid, VStack, HStack) as the real content
2. Heights map to text sizes: `"3"` = tiny text (12px), `"4"` = small text (14px), `"5"` = body text (16px), `"6"` = heading (20px)
3. Widths MUST vary to look natural — never use all same width. Pattern: `100%`, `95%`, `80%`, `60%`, `40%`
4. Use `borderRadius="full"` for circular elements (avatars, priority badges)
5. Spacing between skeleton elements MUST match real component spacing exactly
6. Number of skeleton placeholder items: **3-5** for lists/tables (enough to fill viewport without excess)
7. Table skeletons: include a header row skeleton plus data row skeletons

**Button Loading State Pattern:**

```typescript
// For buttons using Chakra UI v3 Button component:
<Button loading={isPending} disabled={isPending}>
  Action Text
</Button>

// For custom spinner in button:
<Button disabled={isSyncing} onClick={handleSync}>
  {isSyncing ? <Spinner size="sm" /> : 'Sync Now'}
</Button>
```

- Buttons MUST be disabled during async actions to prevent duplicate submissions
- Use `<Spinner size="sm">` inside buttons for custom loading indication
- Use `loading` prop on Chakra UI `<Button>` when available

### Library / Framework Requirements

| Library | Version | Purpose | New? |
|---------|---------|---------|------|
| `@chakra-ui/react` | existing (v3) | Skeleton, Spinner components | No |
| `react` | existing | Component framework | No |
| `@tanstack/react-query` | existing (v5) | Loading state management (hooks) | No |
| `vitest` | existing | Testing framework | No |
| `@testing-library/react` | existing | Component testing | No |

**Do NOT install:**
- No new packages needed — Chakra UI v3 includes `Skeleton` and `Spinner`
- Do NOT add third-party loading animation libraries (framer-motion skeleton, react-loading-skeleton, etc.)
- Do NOT add CSS animation libraries — Chakra handles skeleton pulse animation

### File Structure Requirements

**Files to MODIFY:**

| File | Changes |
|------|---------|
| `frontend/src/features/admin/components/user-management-list.tsx` | Add `UserManagementListSkeleton`, replace "Loading users..." text |
| `frontend/src/features/admin/components/user-approval-list.tsx` | Add `UserApprovalListSkeleton`, replace "Loading pending users..." text |
| `frontend/src/features/admin/components/sync-control.tsx` | Add `SyncHistorySkeleton`, replace "Loading history..." text |
| `frontend/src/features/backlog/components/sync-status-indicator.tsx` | Replace `return null` on initial load with small skeleton |
| `frontend/src/features/backlog/components/item-detail-modal.tsx` | Replace generic body skeleton blocks with layout-accurate skeletons |

**Test files to ADD/MODIFY:**

| File | Changes |
|------|---------|
| `frontend/src/features/admin/components/user-management-list.test.tsx` | Add skeleton rendering test (or create if not exists) |
| `frontend/src/features/admin/components/user-approval-list.test.tsx` | Add skeleton rendering test (or create if not exists) |
| `frontend/src/features/admin/components/sync-control.test.tsx` | Add sync history skeleton test (or create if not exists) |
| `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` | Add initial load skeleton test |
| `frontend/src/features/backlog/components/item-detail-modal.test.tsx` | Update body skeleton test |

**Files to VERIFY (do NOT modify unless issues found):**

| File | Verification |
|------|-------------|
| `frontend/src/features/backlog/components/backlog-list.tsx` | Verify `BacklogListSkeleton` renders and transitions smoothly |
| `frontend/src/features/backlog/components/backlog-item-card.tsx` | Verify `BacklogItemCardSkeleton` matches card layout |
| `frontend/src/App.tsx` | Verify auth loading spinner works correctly |
| `frontend/src/shared/components/layout/app-header.tsx` | Verify logout button loading state |
| `frontend/src/features/admin/components/sync-control.tsx` | Verify sync trigger button Spinner |

### Testing Requirements

- Use `vitest` + `@testing-library/react` (existing frontend testing setup)
- Import from `vitest` (`describe`, `it`, `expect`, `vi`, `beforeEach`)
- **All existing tests MUST pass unchanged** — backward compatibility is critical
- Co-located tests alongside source files (`.test.tsx` next to `.tsx`)

**Key test scenarios:**

1. **UserManagementList skeleton:** Mock `useAllUsers` to return `{ isLoading: true }` → verify `data-testid="user-management-skeleton"` is in the document, verify no "Loading users..." text
2. **UserApprovalList skeleton:** Mock `usePendingUsers` to return `{ isLoading: true }` → verify `data-testid="user-approval-skeleton"` is in the document, verify no "Loading pending users..." text
3. **SyncControl history skeleton:** Mock `useSyncHistory` to return `{ isLoading: true }` → verify `data-testid="sync-history-skeleton"` is in the document, verify no "Loading history..." text
4. **SyncStatusIndicator skeleton:** Mock `useSyncStatus` to return `{ isLoading: true }` → verify `data-testid="sync-status-skeleton"` is in the document, verify component does NOT return null
5. **ItemDetailModal body skeleton:** Mock `useBacklogItemDetail` to return `{ isLoading: true }` → verify `data-testid="item-detail-body-skeleton"` is in the document
6. **Regression:** All existing tests continue to pass unchanged

### Performance Targets (from NFR & UX Spec)

| Metric | Target | How This Story Helps |
|--------|--------|---------------------|
| Perceived page load | <2 seconds | Skeletons provide instant visual structure, making loads feel faster than blank screens |
| Perceived interactions | <100ms | Button spinners give immediate feedback for async actions |
| User confidence | High | Consistent loading patterns across all views build trust that the app is responsive |
| Smooth transitions | No jarring flash | Chakra skeleton fade animation prevents content flash on load completion |
| Cognitive load | Low | Skeleton shapes preview content layout, preparing users for what to expect |

### What NOT To Do

- **Do NOT** recreate or modify `BacklogListSkeleton` or `BacklogItemCardSkeleton` — they work correctly, only verify
- **Do NOT** modify `ItemDetailModal` header skeleton — only enhance the body skeleton
- **Do NOT** change the `App.tsx` auth loading spinner — it's appropriate for full-page auth blocking
- **Do NOT** install new npm packages — all required components are in existing Chakra UI v3
- **Do NOT** add loading animation libraries (framer-motion skeleton, react-loading-skeleton, etc.)
- **Do NOT** change TanStack Query cache configuration, query keys, or retry logic — those are from Stories 9.1/9.2
- **Do NOT** change the virtual scrolling implementation from Story 9.2
- **Do NOT** add backend changes — this story is frontend-only
- **Do NOT** add loading spinners for client-side filtering — it's already instant (<500ms) via client-side `useMemo`, adding a spinner would make it feel slower
- **Do NOT** use Chakra UI v2 API patterns (`isLoaded` prop) — this project uses Chakra UI v3 (`loading` prop or conditional rendering)
- **Do NOT** use generic rectangle skeletons for table/list views — skeletons MUST match the column/field layout
- **Do NOT** break any existing test assertions — all skeleton additions should be purely additive
- **Do NOT** create separate skeleton component files — follow the existing pattern of co-locating skeleton exports inside the same file as the main component

### Previous Story Intelligence

**From Story 9.3 (Optimize API Response Times) — completed:**
- Added `compression` middleware, ETag/304 support, field selection, response time logging, TtlCache for detail cache
- Frontend `useBacklogItems` hook now passes `?fields=` query parameter for reduced payload
- 447 tests passing (after code review fixes)
- API now responds faster — compression reduces transfer 60-80%, caching eliminates redundant calls

**From Story 9.2 (Virtual Scrolling) — completed:**
- `backlog-list.tsx` uses `@tanstack/react-virtual` with `useVirtualizer` — only renders visible items
- All filtering/sorting remains client-side via `useMemo`
- `BacklogListSkeleton` was verified working during this story
- 556 tests passing (7 pre-existing flaky keyboard tests)

**From Story 9.1 (Client-Side Caching) — completed:**
- TanStack Query configured: `gcTime: 10min`, smart retry (skip 4xx), `refetchOnWindowFocus: false`
- `useBacklogItems` hook query key: `['backlog-items']` — do NOT change
- `placeholderData` for detail view provides instant perceived navigation from list cache
- Loading states (`isLoading`) come from TanStack Query hooks

**From Story 8.3 (BacklogItemCard) — completed:**
- `BacklogItemCardSkeleton` created with variant support (`default` | `compact`)
- Card layout: priority badge (left), title (bold, truncated), description (default only), metadata row (status, labels, assignee, dates)
- Skeleton matches this layout precisely

**From Story 8.6 (EmptyStateWithGuidance) — completed:**
- Empty states are distinct from loading states — `EmptyStateWithGuidance` shows when data IS loaded but filters return zero results
- Never confuse empty state with loading state

### Git Intelligence

Recent commit pattern:
- `feat:` prefix with story number and Linear ID (e.g., `feat: optimize API response times (Story 9.3, VIX-376)`)
- Single commit per story implementation
- Recent frontend-only stories touch files in `frontend/src/features/` directories
- Files modified are existing files (not new file creation) — follow this pattern

### Project Structure Notes

- All changes are frontend-only in `frontend/src/`
- Skeleton components are co-located as named exports inside their respective component files (NOT in separate files)
- Follow existing pattern: `export function ComponentNameSkeleton() { ... }` alongside main component
- Tests are co-located: `component.tsx` + `component.test.tsx` in same directory
- Admin components in `frontend/src/features/admin/components/`
- Backlog components in `frontend/src/features/backlog/components/`
- No new files should be created — all changes are modifications to existing files + possible new test files if test files don't exist yet

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 9.4] — Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States] — Skeleton states, sync loading, filter loading UX patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] — Success/error/warning/info loading feedback patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy] — Chakra UI Spinner/Skeleton component usage strategy
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — Loading state naming (`isLoading` prefix), state management patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Performance Optimization] — <2s page load, code splitting, lazy loading
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — Loading state patterns (global vs local loading)
- [Source: _bmad-output/project-context.md#React Patterns] — isLoading prefix, TanStack Query patterns, immutable state
- [Source: _bmad-output/project-context.md#Critical Don't-Miss Rules] — Handle loading states, show spinners, disable interactions
- [Source: _bmad-output/implementation-artifacts/9-3-optimize-api-response-times.md] — Previous story: API optimization, compression, caching
- [Source: frontend/src/features/backlog/components/backlog-list.tsx] — BacklogListSkeleton pattern (lines 19-33)
- [Source: frontend/src/features/backlog/components/backlog-item-card.tsx] — BacklogItemCardSkeleton pattern (lines 228-256)
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx] — Current item detail skeleton (header + generic body)
- [Source: frontend/src/features/admin/components/user-management-list.tsx] — Current "Loading users..." text (line 96)
- [Source: frontend/src/features/admin/components/user-approval-list.tsx] — Current "Loading pending users..." text (line 53)
- [Source: frontend/src/features/admin/components/sync-control.tsx] — Current sync history "Loading history..." and button spinner
- [Source: frontend/src/features/backlog/components/sync-status-indicator.tsx] — Current `return null` on initial load (line 68)
- [Source: frontend/src/theme.ts] — Chakra UI v3 theme with brand colors, spacing scale, typography

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- Fixed unused `Stack` import in `item-detail-modal.tsx` caught by `tsc -b` (stricter than `--noEmit`)

### Completion Notes List

- **Task 1:** Created `UserManagementListSkeleton` with header row (6 columns) + 5 data row skeletons matching real user card layout. Replaced "Loading users..." text. Updated test to verify skeleton renders with `data-testid`.
- **Task 2:** Created `UserApprovalListSkeleton` with 3 card skeletons (avatar circle, name, email, approve button). Replaced "Loading pending users..." text. Updated test.
- **Task 3:** Created `SyncHistorySkeleton` with header row (5 columns) + 5 data row skeletons matching sync history table. Replaced "Loading history..." text. Updated test.
- **Task 4:** Replaced `return null` with `<Skeleton height="4" width="120px" data-testid="sync-status-skeleton" />` for initial load. Updated test to expect skeleton instead of null.
- **Task 5:** Created `ItemDetailBodySkeleton` with description (4 varying-width lines), comments (3 card skeletons with avatar + text), and activity (4 timeline entry skeletons). Replaced generic `<Skeleton height="20/32" />` blocks. Updated test to verify `data-testid`.
- **Task 6:** Verified `BacklogListSkeleton` and `BacklogItemCardSkeleton` work correctly. Fixed inconsistent button loading patterns: added `loading` prop to approve button (`user-approval-list.tsx`) and toggle status buttons (`user-management-list.tsx`) for consistent Spinner display across all async buttons. All buttons now: sync trigger (Spinner), approve (loading prop), toggle (loading prop), logout (loading prop).
- **Task 7:** `npx tsc --noEmit` passes. `npx vitest run` passes all 556 tests. `npm run build` succeeds.

### Change Log

- 2026-02-12: Story 9.4 implementation — Added layout-accurate skeleton screens for UserManagementList, UserApprovalList, SyncControl history, SyncStatusIndicator, and ItemDetailModal body. Fixed button loading patterns for consistency. All tests passing (556/556), build passes.
- 2026-02-12: Code review fixes (6 issues: 1 HIGH, 3 MEDIUM, 2 LOW) —
  - [HIGH] Fixed approve button `disabled` logic race condition: changed `disabled={isApproving && approvingId === user.id}` to `disabled={isApproving}` so ALL approve buttons are disabled during any approval, consistent with toggle buttons in UserManagementList. Added test for this behavior.
  - [MEDIUM] Rewrote `SyncHistorySkeleton` to use `Table.Root`/`Table.Row`/`Table.Cell` matching the real history table layout instead of HStack-based flex layout.
  - [MEDIUM] Removed phantom header row from `UserManagementListSkeleton` — real component has no header row, only card list.
  - [MEDIUM] Removed avatar circle from `UserApprovalListSkeleton` — real cards have no avatar element, only email/name text.
  - [LOW] Added missing `beforeEach` import to `user-approval-list.test.tsx` for consistency with project convention.
  - [LOW] Wrapped `SyncStatusIndicator` loading skeleton in `<Box role="status" aria-live="polite" aria-atomic="true">` for ARIA consistency with all other states.
  - All 557 tests passing (557/557, +1 new test), tsc clean, build passes.

### File List

**Modified:**
- `frontend/src/features/admin/components/user-management-list.tsx` — Added `UserManagementListSkeleton`, added `loading` prop to toggle buttons, replaced "Loading users..." text. Code review: removed phantom header row skeleton.
- `frontend/src/features/admin/components/user-approval-list.tsx` — Added `UserApprovalListSkeleton`, added `loading` prop to approve button, replaced "Loading pending users..." text. Code review: removed avatar circle from skeleton, fixed `disabled` prop to disable all buttons during any approval.
- `frontend/src/features/admin/components/sync-control.tsx` — Added `SyncHistorySkeleton`, replaced "Loading history..." text. Code review: rewrote skeleton to use Table.* components matching real table layout.
- `frontend/src/features/backlog/components/sync-status-indicator.tsx` — Replaced `return null` with inline skeleton for initial load. Code review: wrapped skeleton in ARIA role="status" wrapper.
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — Added `ItemDetailBodySkeleton`, replaced generic body skeletons, removed unused `Stack` import
- `frontend/src/features/admin/components/user-management-list.test.tsx` — Updated loading test: expect skeleton testid, no "Loading users..." text
- `frontend/src/features/admin/components/user-approval-list.test.tsx` — Updated loading test: expect skeleton testid, no "Loading pending users..." text. Code review: added `beforeEach` import, added test for all buttons disabled during approval.
- `frontend/src/features/admin/components/sync-control.test.tsx` — Updated history loading test: expect skeleton testid, no "Loading history..." text
- `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` — Updated initial load test: expect skeleton testid instead of null container
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — Updated loading test: assert `item-detail-body-skeleton` testid present
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated 9-4 status to done
