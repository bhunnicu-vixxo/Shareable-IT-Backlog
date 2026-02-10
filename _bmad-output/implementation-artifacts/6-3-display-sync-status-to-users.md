# Story 6.3: Display Sync Status to Users

Linear Issue ID: VIX-356
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business user,
I want to see when data was last synced from Linear,
so that I know how current the information is.

## Acceptance Criteria

1. **Given** data has been synced from Linear, **When** I view the backlog list, **Then** sync status is displayed in the page header showing "Last synced: [timestamp]"
2. **And** timestamp is formatted in user-friendly relative format (e.g., "2 minutes ago", "1 hour ago", "Yesterday")
3. **And** sync status is visually subtle — small text, muted color, does not compete with backlog content for attention
4. **And** status uses color-coded indicator: green dot for recent sync (<4 hours), yellow dot for stale (4–24 hours), red dot for error/very stale (>24 hours or error state)
5. **And** when sync status is `'syncing'`, indicator shows a subtle animated spinner with "Syncing..." text
6. **And** when sync status is `'error'`, shows warning icon with "Sync issue — data may be outdated" tooltip
7. **And** when no sync has ever occurred (`lastSyncedAt === null`), shows "Not yet synced" text
8. **And** the component auto-refreshes sync status every 60 seconds (background poll, not while syncing — that's handled by admin)
9. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
10. **And** unit tests cover the SyncStatusIndicator component and any new hooks

## Tasks / Subtasks

- [x] Task 1: Create `useSyncStatus` hook in backlog feature (AC: #1, #8)
  - [x] 1.1: Create `frontend/src/features/backlog/hooks/use-sync-status.ts`
  - [x] 1.2: Reuse the same pattern from `features/admin/hooks/use-sync-status.ts` (Story 6.2) OR import it directly if the admin hook is generic enough
  - [x] 1.3: Configure with `refetchInterval: 60_000` (poll every 60s) for user-facing passive monitoring
  - [x] 1.4: No polling acceleration when syncing (that's the admin concern — Story 6.2)
  - [x] 1.5: Create `frontend/src/features/backlog/hooks/use-sync-status.test.tsx`

- [x] Task 2: Create `SyncStatusIndicator` component (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 2.1: Create `frontend/src/features/backlog/components/sync-status-indicator.tsx`
  - [x] 2.2: Render inline text: colored dot + "Last synced: [relative time]"
  - [x] 2.3: Color logic for status dot:
    - Green (`green.500`): `status === 'success'` AND `lastSyncedAt` < 4 hours ago
    - Yellow (`yellow.500`): `status === 'success'` AND `lastSyncedAt` 4–24 hours ago
    - Red (`red.500`): `status === 'error'` OR `lastSyncedAt` > 24 hours ago
    - Gray (`gray.400`): `status === 'idle'` AND `lastSyncedAt === null` (never synced)
  - [x] 2.4: When `status === 'syncing'`, show `Spinner` (size `xs`) + "Syncing..." text
  - [x] 2.5: When `status === 'error'`, show warning icon with tooltip: "Sync issue — data may be outdated"
  - [x] 2.6: When `lastSyncedAt === null`, show "Not yet synced" in muted text
  - [x] 2.7: Use `formatRelativeTime()` from `frontend/src/utils/formatters.ts` (created in Story 6.2)
  - [x] 2.8: Create `frontend/src/features/backlog/components/sync-status-indicator.test.tsx`

- [x] Task 3: Integrate SyncStatusIndicator into backlog page (AC: #1, #3)
  - [x] 3.1: Add `SyncStatusIndicator` to `backlog-page.tsx` header area, right-aligned next to the "Backlog" heading
  - [x] 3.2: Position: inline with heading row, right side, smaller font size (`sm`), muted color
  - [x] 3.3: Ensure it doesn't shift layout or push content down

- [x] Task 4: Build and test verification (AC: #9, #10)
  - [x] 4.1: Run `npm run build` in `backend/` (should be unaffected)
  - [x] 4.2: Run `npm run test:run` in `backend/` (should be unaffected)
  - [x] 4.3: Run `npm run build` in `frontend/`
  - [x] 4.4: Run `npm run test:run` in `frontend/`

## Dev Notes

### What's Already Done (from Stories 1.x–6.2)

| Capability | Story | File |
|---|---|---|
| SyncService with `getStatus()` returning `SyncStatusResponse` | 6.1 | `backend/src/services/sync/sync.service.ts` |
| `GET /api/sync/status` endpoint | 6.1 | `backend/src/routes/sync.routes.ts` |
| `POST /api/sync/trigger` endpoint | 6.2 | `backend/src/routes/sync.routes.ts` |
| `SyncStatusResponse` backend type | 2.4 | `backend/src/types/api.types.ts` |
| `SyncStatus` frontend type | 3.1 | `frontend/src/features/backlog/types/backlog.types.ts` |
| `useSyncStatus` admin hook (with polling while syncing) | 6.2 | `frontend/src/features/admin/hooks/use-sync-status.ts` |
| `formatRelativeTime()` utility | 6.2 | `frontend/src/utils/formatters.ts` |
| `SyncControl` admin component | 6.2 | `frontend/src/features/admin/components/sync-control.tsx` |
| Backlog page with heading | 3.1 | `frontend/src/features/backlog/components/backlog-page.tsx` |
| `API_URL` constant | — | `frontend/src/utils/constants.ts` |
| TanStack Query setup | — | `frontend/src/main.tsx` |
| Chakra UI v3 provider | — | `frontend/src/components/ui/provider.tsx` |

### What This Story Creates

1. **`useSyncStatus` hook (backlog feature)** — Passive sync status polling for user-facing display (60s interval)
2. **`SyncStatusIndicator` component** — Subtle, color-coded sync status display for the backlog page
3. **Updated `backlog-page.tsx`** — Includes SyncStatusIndicator in the header

### CRITICAL: Hook Reuse Decision

Story 6.2 creates `useSyncStatus` in `features/admin/hooks/`. There are two valid approaches:

**Option A (Recommended): Shared hook in `shared/hooks/`**
- Move the admin hook to `shared/hooks/use-sync-status.ts` so both admin and backlog can use it
- Both call sites pass their own configuration (admin: poll while syncing; backlog: 60s passive poll)

**Option B: Duplicate with different config**
- Create a separate `features/backlog/hooks/use-sync-status.ts` with backlog-specific polling config
- Simpler but less DRY

**Choose based on what Story 6.2 actually implemented.** If the admin hook accepts configuration options, reuse it. If it's tightly coupled to admin polling logic, create a backlog-specific version.

The simplest approach: create a thin wrapper in the backlog feature that either imports the admin hook or duplicates the fetch logic with `refetchInterval: 60_000`.

```typescript
// frontend/src/features/backlog/hooks/use-sync-status.ts
import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { SyncStatus } from '../types/backlog.types'

export function useSyncStatus() {
  const query = useQuery<SyncStatus>({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/sync/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }
      return response.json()
    },
    refetchInterval: 60_000, // Passive poll every 60s for user display
    staleTime: 30_000,       // Consider stale after 30s
  })

  return {
    syncStatus: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
```

**CRITICAL:** Both the admin and backlog hooks use the same `queryKey: ['sync-status']`. TanStack Query shares cache across components using the same key, so they won't make duplicate requests. The shortest `refetchInterval` wins when multiple consumers are active.

### CRITICAL: SyncStatusIndicator Component

```typescript
// frontend/src/features/backlog/components/sync-status-indicator.tsx
import { Box, HStack, Spinner, Text } from '@chakra-ui/react'
import { Tooltip } from '@/components/ui/tooltip'  // Check if Chakra v3 tooltip snippet exists
import { useSyncStatus } from '../hooks/use-sync-status'
import { formatRelativeTime } from '@/utils/formatters'

function getStatusColor(syncStatus: SyncStatus | null): string {
  if (!syncStatus || syncStatus.lastSyncedAt === null) return 'gray.400'
  if (syncStatus.status === 'error') return 'red.500'
  if (syncStatus.status === 'syncing') return 'blue.500'

  // Calculate staleness
  const lastSynced = new Date(syncStatus.lastSyncedAt)
  const hoursAgo = (Date.now() - lastSynced.getTime()) / 3_600_000

  if (hoursAgo < 4) return 'green.500'
  if (hoursAgo < 24) return 'yellow.500'
  return 'red.500'
}

export function SyncStatusIndicator() {
  const { syncStatus, isLoading } = useSyncStatus()

  if (isLoading) return null // Don't show anything while initial load

  // Syncing state
  if (syncStatus?.status === 'syncing') {
    return (
      <HStack gap={1.5}>
        <Spinner size="xs" />
        <Text fontSize="xs" color="fg.muted">Syncing...</Text>
      </HStack>
    )
  }

  // Never synced
  if (!syncStatus?.lastSyncedAt) {
    return (
      <Text fontSize="xs" color="fg.muted">Not yet synced</Text>
    )
  }

  // Error state
  if (syncStatus.status === 'error') {
    return (
      <Tooltip content="Sync issue — data may be outdated">
        <HStack gap={1.5} cursor="default">
          <Box w={2} h={2} borderRadius="full" bg="red.500" flexShrink={0} />
          <Text fontSize="xs" color="fg.muted">
            Last synced: {formatRelativeTime(syncStatus.lastSyncedAt)}
          </Text>
        </HStack>
      </Tooltip>
    )
  }

  // Success state with staleness color
  const dotColor = getStatusColor(syncStatus)

  return (
    <HStack gap={1.5}>
      <Box w={2} h={2} borderRadius="full" bg={dotColor} flexShrink={0} />
      <Text fontSize="xs" color="fg.muted">
        Last synced: {formatRelativeTime(syncStatus.lastSyncedAt)}
      </Text>
    </HStack>
  )
}
```

**CRITICAL:** Check if `@/components/ui/tooltip` exists as a Chakra v3 snippet. If not, use Chakra's native Tooltip or wrap with a simple `title` attribute for the error state.

**CRITICAL:** The colored dot is a tiny `Box` with `borderRadius="full"` — this is the simplest approach and avoids importing an icon library. The dot sizes (`w={2} h={2}` = 8px) are deliberately small and subtle.

### CRITICAL: Backlog Page Integration

The `SyncStatusIndicator` goes in the header row of `backlog-page.tsx`, right-aligned:

```typescript
// frontend/src/features/backlog/components/backlog-page.tsx — UPDATE header
import { SyncStatusIndicator } from './sync-status-indicator'

// In the JSX, wrap heading and indicator in a flex row:
<HStack justify="space-between" align="center" mb={6}>
  <Heading size="xl">Backlog</Heading>
  <SyncStatusIndicator />
</HStack>
```

**CRITICAL:** Look at the actual `backlog-page.tsx` structure before modifying. The heading may be inside a different layout. Adjust the integration point to maintain existing layout and only add the indicator alongside the heading.

### Architecture Compliance

**From architecture.md:**
- Feature-based frontend organization (`features/backlog/components/`) ✅
- TanStack Query for server state ✅
- Chakra UI components (Text, Box, HStack, Spinner) ✅
- Performance: component is lightweight, no re-renders except on poll interval ✅

**From project-context.md:**
- TypeScript strict mode ✅
- `PascalCase` component (`SyncStatusIndicator`), `kebab-case` file (`sync-status-indicator.tsx`) ✅
- `camelCase` functions/variables ✅
- Co-located tests ✅
- Loading states: hidden during initial load, spinner during sync ✅
- ES modules ✅

**From UX Design (epics file):**
- SyncStatusIndicator component specified in Epic 8 (Story 8.4) ✅
- Color logic: green (<4h), yellow (4-24h), red (error/stale) — matches UX spec ✅
- Relative time formatting — matches UX spec ✅
- Subtle but visible — small text, muted color ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 6.1 Scheduled Automatic Sync | **HARD dependency** | Provides `GET /api/sync/status` endpoint and `SyncStatusResponse` |
| 6.2 Manual Sync Trigger | **HARD dependency** | Provides `formatRelativeTime()` utility and `useSyncStatus` admin hook pattern |
| 8.4 SyncStatusIndicator Component | **Implements early** | This story partially fulfills Story 8.4's custom component requirement |
| 6.4 Sync Error Handling | **Future enhancer** | Will add more detailed error messages to the indicator |
| 6.5 Handle API Unavailability | **Future enhancer** | Will add "Linear API unavailable" state to the indicator |

### Git Intelligence (Recent Patterns)

- `9b96788` — Most recent commit on current branch
- Chakra UI v3 patterns: `Dialog.Root`, `Select.Root`, custom snippets in `@/components/ui/`
- Backlog page component: `backlog-page.tsx` uses `Box`, `Heading`, max-width 960px layout
- No existing shared hooks — first opportunity to establish shared hook pattern

### Previous Story Intelligence (6.2)

**Key context from Story 6.2:**
- `useSyncStatus` hook created in `features/admin/hooks/` with configurable polling
- `formatRelativeTime()` added to `frontend/src/utils/formatters.ts` using `Intl.RelativeTimeFormat`
- TanStack Query `queryKey: ['sync-status']` — same key enables shared cache
- Admin sync control demonstrates the fetch pattern for sync status

### Testing Strategy

**Frontend — sync-status-indicator.test.tsx:**
- Mock `useSyncStatus` hook to return various states
- Test: Renders "Last synced: X ago" with green dot when sync is recent (<4h)
- Test: Renders yellow dot when sync is stale (4-24h)
- Test: Renders red dot when sync is very stale (>24h)
- Test: Renders red dot and tooltip when `status === 'error'`
- Test: Renders spinner and "Syncing..." when `status === 'syncing'`
- Test: Renders "Not yet synced" when `lastSyncedAt === null`
- Test: Renders nothing while loading (initial fetch)
- Test: Does not render error state details (just subtle warning)

**Frontend — use-sync-status.test.tsx (backlog):**
- Mock `fetch` to return `SyncStatus` data
- Test: Returns sync status on successful fetch
- Test: Polls at 60s interval
- Test: Returns null before data is loaded

### Project Structure After This Story

```
frontend/src/
├── features/
│   └── backlog/
│       ├── components/
│       │   ├── backlog-page.tsx                 (MODIFIED — add SyncStatusIndicator to header)
│       │   ├── sync-status-indicator.tsx         (NEW)
│       │   └── sync-status-indicator.test.tsx    (NEW)
│       └── hooks/
│           ├── use-sync-status.ts               (NEW — backlog-specific polling config)
│           └── use-sync-status.test.tsx          (NEW)
```

### What NOT To Do

- **Do NOT** add `date-fns` — `formatRelativeTime()` already exists from Story 6.2 using native `Intl.RelativeTimeFormat`.
- **Do NOT** make the indicator clickable or interactive — it's purely informational for business users. Admin sync controls live on `/admin`.
- **Do NOT** show detailed error messages to users — just "data may be outdated". Detailed errors are for admins (Story 6.4).
- **Do NOT** add sync trigger capability to the backlog page — that's admin-only (Story 6.2/7.x).
- **Do NOT** create a full SyncStatusIndicator in `shared/components/` — it belongs in `features/backlog/components/` per feature-based organization. Story 8.4 may later extract it to shared if needed.
- **Do NOT** modify any backend files — this story is frontend-only.
- **Do NOT** use a large icon library for the warning/status icons — a colored `Box` dot is sufficient and simpler.
- **Do NOT** add real-time WebSocket updates — 60s polling interval is sufficient for user-facing status.
- **Do NOT** show sync item count to regular users — that's admin information. Just show "Last synced: [time]".
- **Do NOT** change the TanStack Query global config (staleTime, retry) — configure per-query as needed.
- **Do NOT** create a separate API client utility for the sync endpoint — use `fetch` directly in the hook, matching the pattern established by existing hooks.
- **Do NOT** add the indicator to the admin page — the admin page already has `SyncControl` from Story 6.2 with richer status display.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 6, Story 6.3] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 8, Story 8.4] — SyncStatusIndicator component spec (color logic, formatting)
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — TanStack Query, state management, feature-based organization
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Caching strategy, sync status
- [Source: _bmad-output/project-context.md] — Naming conventions, anti-patterns, testing rules
- [Source: _bmad-output/implementation-artifacts/6-1-implement-scheduled-automatic-sync.md] — SyncService status API, SyncStatusResponse shape
- [Source: _bmad-output/implementation-artifacts/6-2-implement-manual-sync-trigger.md] — useSyncStatus hook, formatRelativeTime utility
- [Source: frontend/src/features/backlog/types/backlog.types.ts] — SyncStatus frontend type definition
- [Source: frontend/src/features/backlog/components/backlog-page.tsx] — Backlog page layout to integrate into
- [Source: frontend/src/utils/formatters.ts] — formatRelativeTime and other date formatters
- [Source: frontend/src/utils/constants.ts] — API_URL constant
- [Source: frontend/src/main.tsx] — TanStack Query configuration
- [Source: frontend/src/components/ui/] — Chakra v3 snippets directory

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- No debug issues encountered during implementation.

### Completion Notes List

- **Task 1:** Created `useSyncStatus` hook in `features/backlog/hooks/` with 60s passive polling interval (`refetchInterval: 60_000`). Uses `queryKey: ['sync-status', 'backlog']` to avoid inheriting admin-only aggressive polling behavior. Tests pass.
- **Task 2:** Created `SyncStatusIndicator` component with color-coded status dot (green <4h, yellow 4–24h, red >24h/error, gray never synced), spinner during syncing, "Not yet synced" when `lastSyncedAt === null`, and an **error-state warning icon** + `title` tooltip ("Sync issue — data may be outdated") without exposing error details to users. Uses `formatRelativeTime()` from Story 6.2. Tests pass.
- **Task 3:** Integrated `SyncStatusIndicator` into `backlog-page.tsx` header using `HStack` with `justify="space-between"` — indicator is right-aligned, small (`fontSize="xs"`), and muted. No layout shift.
- **Task 4:** Both `backend/` and `frontend/` build with zero TypeScript errors. Backend build passes. Frontend build passes. Frontend tests: 240/240 pass.
- **Design decision:** Created a separate backlog-specific `useSyncStatus` hook (Option B from Dev Notes) rather than a shared hook, since the admin hook has different polling behavior (2s while syncing).
- **Tooltip approach:** No `@/components/ui/tooltip` Chakra v3 snippet existed, so used native `title` attribute on the error state HStack for the "Sync issue — data may be outdated" tooltip. Simple and sufficient.

### File List

- `frontend/src/features/backlog/hooks/use-sync-status.ts` (NEW)
- `frontend/src/features/backlog/hooks/use-sync-status.test.tsx` (NEW)
- `frontend/src/features/backlog/components/sync-status-indicator.tsx` (NEW)
- `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` (NEW)
- `frontend/src/features/backlog/components/backlog-page.tsx` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `_bmad-output/implementation-artifacts/6-3-display-sync-status-to-users.md` (MODIFIED)

## Senior Developer Review (AI)

**Date:** 2026-02-10

### Summary

- **Fixed AC mismatch**: error state now includes a warning icon (tooltip retained).
- **Fixed edge case**: error state is no longer hidden when `lastSyncedAt === null`.
- **Improved test quality**: indicator tests assert dot color and warning icon; hook tests validate query configuration and queryFn behavior.
- **Locale correctness**: relative time formatter now uses the runtime locale (instead of hard-coded `'en'`).

### Outcome

✅ **Approved** (ACs satisfied, tests/build passing)

## Change Log

- 2026-02-10 — Senior dev review: fixed error icon + edge case, improved tests, locale fix, build/test verification.
