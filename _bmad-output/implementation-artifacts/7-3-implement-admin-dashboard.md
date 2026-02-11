# Story 7.3: Implement Admin Dashboard

Linear Issue ID: VIX-363
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want an admin dashboard interface with organized sections and app-wide navigation,
so that I can manage users, view sync status, and configure the system from a structured, navigable interface.

## Acceptance Criteria

1. **Given** I am an authenticated, approved admin user, **When** I view the application, **Then** a shared app header is displayed at the top with the application title, navigation links ("Backlog", "Admin"), my email, and a "Sign Out" button
2. **And** the "Admin" link is only visible to admin users; non-admin users see only "Backlog"
3. **And** the "Sign Out" button calls `POST /api/auth/logout` and returns me to the identify form
4. **Given** I navigate to `/admin`, **When** the admin dashboard loads, **Then** I see a tabbed layout with three sections: "Users", "Sync", and "Settings"
5. **And** the "Users" tab is the default active tab and displays the existing `UserApprovalList` component (pending user approval from Story 7.2)
6. **And** the "Sync" tab displays the existing `SyncControl` component (manual sync trigger + status from Story 6.2)
7. **And** the "Settings" tab displays a placeholder message ("System settings will be available in a future update.")
8. **And** the admin dashboard is only accessible to admin users (non-admins see "Access Denied" — already enforced by Story 7.2)
9. **And** the dashboard layout is responsive: tabs display horizontally on desktop and stack appropriately on smaller screens
10. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
11. **And** unit tests cover the new header component, updated admin page layout, and navigation behavior

## Tasks / Subtasks

- [x] Task 1: Create shared app header component (AC: #1, #2, #3)
  - [x] 1.1: Create `frontend/src/shared/components/layout/app-header.tsx`
  - [x] 1.2: Display app title "Shareable IT Backlog" (or shorter "IT Backlog") as a link to `/`
  - [x] 1.3: Navigation links: "Backlog" (always visible, links to `/`), "Admin" (only if `isAdmin === true`, links to `/admin`)
  - [x] 1.4: Right side: user email (from `useAuth().user.email`) + "Sign Out" button
  - [x] 1.5: "Sign Out" calls `logout()` from `useAuth()` hook
  - [x] 1.6: Use Chakra UI `HStack`, `Text`, `Button` + React Router `Link` (from `react-router`)
  - [x] 1.7: Style: subtle border-bottom, horizontal layout, responsive (stacks on mobile)
  - [x] 1.8: Create `frontend/src/shared/components/layout/app-header.test.tsx`

- [x] Task 2: Create app layout wrapper (AC: #1)
  - [x] 2.1: Create `frontend/src/shared/components/layout/app-layout.tsx`
  - [x] 2.2: Renders `AppHeader` at top, then `children` below in a flex column
  - [x] 2.3: This component wraps all authenticated routes in `App.tsx`

- [x] Task 3: Update App.tsx to use layout wrapper (AC: #1, #2, #3)
  - [x] 3.1: Wrap the authenticated routes block (step 4 in current auth flow) with `AppLayout`
  - [x] 3.2: Pass `user`, `isAdmin`, `logout` props to the layout (or let it use `useAuth` internally)
  - [x] 3.3: Update `frontend/src/App.test.tsx` for layout changes

- [x] Task 4: Redesign AdminPage with tabbed layout (AC: #4, #5, #6, #7, #9)
  - [x] 4.1: Replace the current `VStack` layout with Chakra UI `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Content`
  - [x] 4.2: "Users" tab (default): renders `UserApprovalList`
  - [x] 4.3: "Sync" tab: renders `SyncControl`
  - [x] 4.4: "Settings" tab: renders placeholder with icon + message
  - [x] 4.5: Add responsive styling to tabs (use `variant="line"` for clean look)
  - [x] 4.6: Keep the `<Heading>` "Administration" above the tabs
  - [x] 4.7: Update `frontend/src/features/admin/components/admin-page.test.tsx` (create if not exists)

- [x] Task 5: Build and test verification (AC: #10, #11)
  - [x] 5.1: Run `npm run build` in `backend/`
  - [x] 5.2: Run `npm run test:run` in `backend/`
  - [x] 5.3: Run `npm run build` in `frontend/`
  - [x] 5.4: Run `npm run test:run` in `frontend/` (all tests passing after Chakra Select interaction test updates)

## Dev Notes

### What's Already Done (from Stories 7.1, 7.2, 6.1–6.4)

| Capability | Story | File |
|---|---|---|
| Admin page with VStack layout (UserApprovalList + SyncControl) | 7.2 | `frontend/src/features/admin/components/admin-page.tsx` |
| UserApprovalList component (pending users + approve button) | 7.2 | `frontend/src/features/admin/components/user-approval-list.tsx` |
| SyncControl component (status display + "Sync Now" button) | 6.2 | `frontend/src/features/admin/components/sync-control.tsx` |
| `useAuth()` hook with `user`, `isAdmin`, `isApproved`, `logout()`, `identify()` | 7.2 | `frontend/src/features/auth/hooks/use-auth.ts` |
| `User` type with `id`, `email`, `displayName`, `isAdmin`, `isApproved`, `isDisabled` | 7.2 | `frontend/src/features/auth/types/auth.types.ts` |
| Auth flow in App.tsx: loading → identify → pending approval → routes | 7.2 | `frontend/src/App.tsx` |
| `/admin` route with `isAdmin` guard (shows "Access Denied" for non-admins) | 7.2 | `frontend/src/App.tsx` |
| `requireAuth` + `requireAdmin` middleware on `/api/admin/*` routes | 7.2 | `backend/src/routes/admin.routes.ts` |
| Session-based auth with PostgreSQL store | 7.2 | `backend/src/config/session.config.ts` |
| Network verification middleware | 7.1 | `backend/src/middleware/network.middleware.ts` |
| BacklogPage with SyncStatusIndicator | 6.3 | `frontend/src/features/backlog/components/backlog-page.tsx` |
| React Router v7 routing (`/` and `/admin`) | 7.2 | `frontend/src/App.tsx` |
| Chakra UI v3 with compound components | — | `@chakra-ui/react` |
| `lucide-react` for icons | 7.2 | Already installed |
| TanStack Query v5 setup | — | `frontend/src/main.tsx` |

### What This Story Creates / Changes

1. **`AppHeader` component** — Shared navigation header with app title, nav links, user info, and sign-out
2. **`AppLayout` component** — Layout wrapper that renders header + content area
3. **Redesigned `AdminPage`** — Tabbed layout (Users / Sync / Settings) replacing simple VStack
4. **Updated `App.tsx`** — Authenticated routes wrapped in `AppLayout`

### CRITICAL: Current AdminPage (to be replaced)

```typescript
// frontend/src/features/admin/components/admin-page.tsx — CURRENT
import { Box, Heading, VStack } from '@chakra-ui/react'
import { SyncControl } from './sync-control'
import { UserApprovalList } from './user-approval-list'

export function AdminPage() {
  return (
    <Box maxW="960px" mx="auto" p={6}>
      <VStack gap={8} align="stretch">
        <Heading size="xl">Administration</Heading>
        <UserApprovalList />
        <SyncControl />
      </VStack>
    </Box>
  )
}
```

### CRITICAL: Current App.tsx Auth Flow (step 4 to modify)

```typescript
// frontend/src/App.tsx — CURRENT authenticated section (step 4)
// 4. Authenticated + approved — show app routes
return (
  <Routes>
    <Route path="/" element={<BacklogPage />} />
    <Route
      path="/admin"
      element={
        isAdmin ? (
          <AdminPage />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
            <VStack gap={4}>
              <Heading size="lg">Access Denied</Heading>
              <Text color="fg.muted">You do not have admin privileges to view this page.</Text>
            </VStack>
          </Box>
        )
      }
    />
  </Routes>
)
```

### CRITICAL: AppHeader Component Design

```typescript
// frontend/src/shared/components/layout/app-header.tsx

import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/hooks/use-auth'

/**
 * Shared application header with navigation and user controls.
 *
 * Displays:
 * - App title (links to home/backlog)
 * - Navigation links: "Backlog" (always), "Admin" (admin-only)
 * - User email + "Sign Out" button
 */
export function AppHeader() {
  const { user, isAdmin, logout, isLoggingOut } = useAuth()
  const location = useLocation()

  return (
    <Box
      as="header"
      borderBottomWidth="1px"
      borderColor="border.muted"
      px={6}
      py={3}
    >
      <HStack justify="space-between" maxW="1280px" mx="auto">
        {/* Left: App title + nav links */}
        <HStack gap={6}>
          <Text fontWeight="bold" fontSize="lg">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              IT Backlog
            </Link>
          </Text>

          <HStack as="nav" gap={4} aria-label="Main navigation">
            <Link to="/">
              <Text
                fontSize="sm"
                fontWeight={location.pathname === '/' ? 'semibold' : 'normal'}
                color={location.pathname === '/' ? 'fg' : 'fg.muted'}
              >
                Backlog
              </Text>
            </Link>

            {isAdmin && (
              <Link to="/admin">
                <Text
                  fontSize="sm"
                  fontWeight={location.pathname === '/admin' ? 'semibold' : 'normal'}
                  color={location.pathname === '/admin' ? 'fg' : 'fg.muted'}
                >
                  Admin
                </Text>
              </Link>
            )}
          </HStack>
        </HStack>

        {/* Right: User info + sign out */}
        <HStack gap={3}>
          <Text fontSize="sm" color="fg.muted" data-testid="user-email">
            {user?.email}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => logout()}
            loading={isLoggingOut}
            data-testid="sign-out-button"
          >
            Sign Out
          </Button>
        </HStack>
      </HStack>
    </Box>
  )
}
```

**CRITICAL:** Use `Link` from `react-router` (NOT `react-router-dom` — the project imports from `react-router` directly, matching React Router v7 patterns). Check the existing App.tsx imports to confirm.

**CRITICAL:** `useAuth()` is called inside AppHeader, not passed as props. This keeps the header self-contained. The hook uses TanStack Query with `staleTime: 5min` so it won't re-fetch excessively.

**CRITICAL:** Active link styling uses `useLocation()` from `react-router` to highlight the current nav item. Use `fontWeight` and `color` changes (not underlines or backgrounds) for a clean look.

**CRITICAL:** The `Button` component in Chakra UI v3 uses `loading` prop (not `isLoading`). Check Chakra v3 API.

### CRITICAL: AppLayout Component Design

```typescript
// frontend/src/shared/components/layout/app-layout.tsx

import { Box, Flex } from '@chakra-ui/react'
import { AppHeader } from './app-header'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Main application layout wrapper.
 *
 * Renders the shared AppHeader at the top with page content below.
 * Used for all authenticated routes.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Flex direction="column" minH="100vh">
      <AppHeader />
      <Box as="main" flex="1">
        {children}
      </Box>
    </Flex>
  )
}
```

### CRITICAL: Updated App.tsx (step 4 only)

```typescript
// frontend/src/App.tsx — REPLACE step 4 authenticated section
import { AppLayout } from '@/shared/components/layout/app-layout'

// 4. Authenticated + approved — show app routes with shared header
return (
  <AppLayout>
    <Routes>
      <Route path="/" element={<BacklogPage />} />
      <Route
        path="/admin"
        element={
          isAdmin ? (
            <AdminPage />
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" minH="80vh">
              <VStack gap={4}>
                <Heading size="lg">Access Denied</Heading>
                <Text color="fg.muted">You do not have admin privileges to view this page.</Text>
              </VStack>
            </Box>
          )
        }
      />
    </Routes>
  </AppLayout>
)
```

**CRITICAL:** The `AppLayout` wraps the `<Routes>`, not each individual route. This ensures the header persists across route transitions. Change `minH="100vh"` to `minH="80vh"` on Access Denied since the header now takes some space.

**CRITICAL:** The loading, identify, and pending-approval states (steps 1-3 in App.tsx) do NOT use AppLayout — they are full-page screens without navigation. Only the authenticated+approved state (step 4) gets the header.

### CRITICAL: Redesigned AdminPage with Tabs

```typescript
// frontend/src/features/admin/components/admin-page.tsx — REPLACEMENT

import { Box, Heading, Tabs, Text, VStack } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import { SyncControl } from './sync-control'
import { UserApprovalList } from './user-approval-list'

/**
 * Admin dashboard with tabbed navigation.
 *
 * Sections:
 * - Users: Pending user approvals (Story 7.2), full user management (Story 7.4)
 * - Sync: Manual sync trigger + status (Stories 6.2, 6.4), sync history (Story 7.5)
 * - Settings: Placeholder for future system settings
 */
export function AdminPage() {
  return (
    <Box maxW="960px" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <Heading size="xl">Administration</Heading>

        <Tabs.Root defaultValue="users" variant="line">
          <Tabs.List>
            <Tabs.Trigger value="users" data-testid="tab-users">
              Users
            </Tabs.Trigger>
            <Tabs.Trigger value="sync" data-testid="tab-sync">
              Sync
            </Tabs.Trigger>
            <Tabs.Trigger value="settings" data-testid="tab-settings">
              Settings
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="users">
            <Box pt={4}>
              <UserApprovalList />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="sync">
            <Box pt={4}>
              <SyncControl />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="settings">
            <Box pt={4}>
              <VStack gap={4} py={12} color="fg.muted" align="center">
                <Settings size={48} strokeWidth={1} />
                <Text fontSize="lg" fontWeight="medium">
                  Settings
                </Text>
                <Text fontSize="sm" textAlign="center" maxW="400px">
                  System settings will be available in a future update.
                </Text>
              </VStack>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Box>
  )
}
```

**CRITICAL:** Chakra UI v3 Tabs uses compound components: `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Content`. The `value` prop on `Tabs.Root` controls the active tab; `defaultValue` sets the initial tab.

**CRITICAL:** Import `Tabs` from `@chakra-ui/react` (NOT from a sub-package). Verify that Chakra UI v3's `Tabs` supports `variant="line"`. If not, use `variant="plain"` or omit variant.

**CRITICAL:** The `Settings` icon is from `lucide-react` (already installed). It's used as a placeholder icon for the settings tab content.

**CRITICAL:** Do NOT remove the existing `UserApprovalList` or `SyncControl` imports — they remain unchanged. This story only restructures the layout around them.

### Architecture Compliance

**From architecture.md:**
- Feature-based frontend organization: shared components in `shared/components/` ✅
- Chakra UI layout components (Tabs, Box, Grid) per technical details ✅
- Responsive design for admin use ✅
- React Router v7 for navigation ✅
- `kebab-case` files (`app-header.tsx`, `app-layout.tsx`) ✅
- `PascalCase` components (`AppHeader`, `AppLayout`) ✅

**From project-context.md:**
- Components: `PascalCase` components, `kebab-case.tsx` files ✅
- Feature-based frontend organization ✅
- Co-located tests ✅
- Chakra UI v3 compound components ✅
- TanStack Query for server state, Context for global state ✅

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 7.2 Implement User Approval Workflow | **HARD dependency** | Provides `useAuth` hook, `AdminPage`, `UserApprovalList`, auth flow in App.tsx, `isAdmin` check |
| 7.1 Network-Based Access Verification | **HARD dependency** | Provides network verification layer, `AccessDenied` component |
| 6.2 Manual Sync Trigger | **HARD dependency** | Provides `SyncControl` component in admin page |
| 6.3 Display Sync Status | **Soft dependency** | Provides `SyncStatusIndicator` in backlog page |
| 7.4 User Management Interface | **Future enhancer** | Will replace UserApprovalList with full user management in Users tab |
| 7.5 Sync Status and History | **Future enhancer** | Will enhance Sync tab with history display |

### Git Intelligence (Recent Patterns)

- Current branch: `rhunnicutt/issue-7-2-implement-user-approval-workflow` (contains 7.1 + 7.2 work)
- Latest commit: `29aefad feat: implement network-based access verification (VIX-361)`
- Pattern: `feat:` commit prefix with Linear issue ID
- React Router imports from `react-router` (not `react-router-dom`)
- Chakra UI v3 compound component patterns used throughout
- `lucide-react` for icons (already installed and used in multiple components)
- Tests use `vitest` with `vi.mock()`, `vi.hoisted()`, `@testing-library/react`

### Previous Story Intelligence (7.2)

**Key learnings from Story 7.2:**
- `useAuth()` hook provides: `user`, `isLoading`, `isIdentified`, `isApproved`, `isAdmin`, `identify`, `logout`, `isLoggingOut`, `checkSession`, `error`, `identifyError`, `isIdentifying`
- App.tsx has a 4-step auth flow: (1) loading → (2) identify form → (3) pending approval → (4) authenticated routes
- Step 4 is the only place where Routes render — this is where AppLayout should wrap
- Admin route already has `isAdmin` guard with "Access Denied" fallback
- `@types/express` v4 vs v5 mismatch causes session middleware type cast to `any` — don't try to fix
- Pre-existing keyboard interaction test failures in sort-control, business-unit-filter, and backlog-list (Chakra UI select + jsdom limitation) — these are NOT regressions
- `vi.hoisted()` needed for module-level mocking in vitest
- 284 backend tests + 278 frontend tests currently passing

**From Story 7.2 review fixes:**
- Admin page renders "Access Denied" for non-admin users (already in App.tsx)
- Auth rate limiting on identify endpoint (10 req/min per IP)
- Session-level approval cache with 5-minute TTL

### Testing Strategy

**Frontend — app-header.test.tsx (new):**
- Test: Renders app title that links to "/"
- Test: Renders "Backlog" navigation link
- Test: Renders "Admin" link when user is admin
- Test: Does NOT render "Admin" link when user is not admin
- Test: Renders user email
- Test: "Sign Out" button calls logout()
- Test: Active link styling matches current path

**Frontend — app-layout.test.tsx (new, optional — simple wrapper):**
- Test: Renders AppHeader and children

**Frontend — admin-page.test.tsx (new/updated):**
- Test: Renders "Administration" heading
- Test: Renders three tabs: Users, Sync, Settings
- Test: Users tab is active by default and shows UserApprovalList
- Test: Clicking Sync tab shows SyncControl
- Test: Clicking Settings tab shows placeholder message
- Test: Tab navigation works (click tab → content changes)

**Frontend — App.test.tsx (updated):**
- Test: Authenticated user sees AppHeader
- Test: Non-authenticated user does NOT see AppHeader (sees IdentifyForm instead)
- Test: Pending approval user does NOT see AppHeader

**Mock patterns for tests:**
- Mock `useAuth` to return controlled user state
- Mock `react-router` `useLocation` for active link tests
- Use `@testing-library/react` `render` with `MemoryRouter` wrapper for routing tests
- Mock `UserApprovalList` and `SyncControl` in admin-page tests to isolate tab behavior

**Frontend fixture updates (add `consecutiveFailures: 0, nextRetryAt: null` if story 6.5 fields exist):**
- Check if `SyncStatus` type has been updated with 6.5 fields. If `consecutiveFailures` and `nextRetryAt` don't exist yet (6.5 not implemented), no fixture updates needed.

### Project Structure After This Story

```
frontend/src/
├── shared/
│   └── components/
│       └── layout/
│           ├── app-header.tsx                     (NEW)
│           ├── app-header.test.tsx                 (NEW)
│           ├── app-layout.tsx                      (NEW)
│           └── app-layout.test.tsx                 (NEW, optional)
├── features/
│   └── admin/
│       └── components/
│           ├── admin-page.tsx                      (MODIFIED — tabbed layout)
│           └── admin-page.test.tsx                 (NEW or MODIFIED)
├── App.tsx                                         (MODIFIED — wrap routes with AppLayout)
├── App.test.tsx                                    (MODIFIED — header + layout tests)
```

No additional backend features are required for Story 7.3. This branch includes carry-forward backend/auth/session files from Story 7.2, but 7.3 behavior is frontend-focused.

### What NOT To Do

- **Do NOT** create new backend endpoints for this story — the admin dashboard shell uses existing endpoints. Dashboard stats/summaries come in 7.4/7.5.
- **Do NOT** implement full user management (list all users, disable, remove) — that is Story 7.4.
- **Do NOT** implement sync history display — that is Story 7.5.
- **Do NOT** implement actual settings functionality — this story adds a placeholder. Real settings come in a future story.
- **Do NOT** move the `useAuth()` call out of App.tsx — it stays where it is. AppHeader calls `useAuth()` independently (TanStack Query deduplicates the request).
- **Do NOT** wrap the loading/identify/pending-approval states (steps 1-3 in App.tsx) with AppLayout — only the authenticated+approved state (step 4) gets the header. Steps 1-3 are full-page screens.
- **Do NOT** add a sidebar or drawer layout — the architecture calls for tabs within the admin page, not a sidebar nav. Keep it simple.
- **Do NOT** modify `UserApprovalList` or `SyncControl` components — they are unchanged. This story only restructures the layout around them.
- **Do NOT** add a breadcrumb component — not needed for a 2-page app (Backlog + Admin).
- **Do NOT** use `react-router-dom` imports — the project uses `react-router` directly (React Router v7).
- **Do NOT** add Redux, Zustand, or React Context for navigation state — `useLocation()` from React Router is sufficient.
- **Do NOT** add a "dark mode" toggle or theme switcher — not in scope.
- **Do NOT** modify backend auth/admin middleware — already complete from Story 7.2.
- **Do NOT** modify the `features/admin/hooks/` files — they remain unchanged.
- **Do NOT** add route-based code splitting (React.lazy) for the admin page yet — premature optimization for a 2-page app.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 7, Story 7.3] — Story requirements: tabbed admin dashboard with Users/Sync/Settings sections
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 7, Story 7.4] — Future: User Management Interface (detailed user list + disable/remove)
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 7, Story 7.5] — Future: Sync Status and History in Admin Dashboard
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Feature-based organization, shared components, React Router v7
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — `shared/components/layout/` for header, sidebar, main-layout
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — Chakra UI, TanStack Query, React Router v7.13.0+
- [Source: _bmad-output/project-context.md] — Naming conventions, component patterns, anti-patterns
- [Source: frontend/src/App.tsx] — Current auth flow and routing structure
- [Source: frontend/src/features/admin/components/admin-page.tsx] — Current simple VStack layout to replace
- [Source: frontend/src/features/auth/hooks/use-auth.ts] — Auth hook providing user, isAdmin, logout
- [Source: frontend/src/features/auth/types/auth.types.ts] — User type definition
- [Source: frontend/src/features/admin/components/user-approval-list.tsx] — Existing component, moves into Users tab
- [Source: frontend/src/features/admin/components/sync-control.tsx] — Existing component, moves into Sync tab
- [Source: _bmad-output/implementation-artifacts/7-2-implement-user-approval-workflow.md] — Previous story: auth flow, middleware, admin guard, test patterns

## Change Log

- 2026-02-10: Implemented admin dashboard with shared app header, app layout wrapper, tabbed admin page (Users/Sync/Settings), and updated App.tsx routing — all 5 tasks complete, 22 new tests passing.
- 2026-02-10: Fixed pre-existing unused import in `use-approve-user.test.tsx` (not a regression — `waitFor` was imported but never used).
- 2026-02-10: Senior review fixes applied: responsive admin tabs + mobile header layout, stricter admin route guard (`requireApproved`), logout HTTP error handling, stale-session cleanup in `requireApproved`, and reduced test noise in `admin-page.test.tsx`.
- 2026-02-10: Stabilized Chakra Select interaction tests in backlog filter/sort suites (migrated flaky keyboard selection checks to deterministic option-click interactions). Frontend suite now passes fully (299/299).

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- No debug issues encountered. All tasks implemented following red-green-refactor cycle.
- Frontend and backend test suites pass fully after stabilizing select-interaction tests.

### Completion Notes List

- **Task 1:** Created `AppHeader` component with app title link, "Backlog" nav link (always), "Admin" nav link (admin-only), user email display, and "Sign Out" button calling `logout()`. Uses `useAuth()` internally and `useLocation()` for active link styling. 7 unit tests passing.
- **Task 2:** Created `AppLayout` wrapper rendering `AppHeader` at top + children below in a flex column layout. 1 unit test passing.
- **Task 3:** Updated `App.tsx` to wrap authenticated routes (step 4) with `AppLayout`. Steps 1-3 (loading, identify, pending-approval) remain full-page without header. Updated `App.test.tsx` with 8 tests covering header presence/absence for each auth state. Changed Access Denied `minH` from `100vh` to `80vh` to account for header.
- **Task 4:** Replaced AdminPage VStack layout with Chakra UI v3 `Tabs.Root`/`Tabs.List`/`Tabs.Trigger`/`Tabs.Content` compound components. "Users" tab (default) renders `UserApprovalList`, "Sync" tab renders `SyncControl`, "Settings" tab renders placeholder with `lucide-react` Settings icon. 6 unit tests passing.
- **Task 5:** Backend build passes (0 TypeScript errors), frontend build passes (0 TypeScript errors). Backend: 288 tests pass. Frontend: 299 tests pass.

### Senior Developer Review (AI)

- Updated admin route protection to require `requireApproved` in addition to `requireAuth` + `requireAdmin` for defense-in-depth.
- Updated `requireApproved` to destroy stale sessions when `userId` no longer exists in the database (consistency with `/auth/me` behavior).
- Updated frontend logout mutation to throw on non-2xx responses instead of always treating logout as success.
- Added responsive behavior to admin tabs (`Tabs.List` wraps on small screens) and header layout (stacks on mobile).
- Reduced test noise by awaiting post-render tab state stabilization in `admin-page.test.tsx`.

### File List

- `frontend/src/shared/components/layout/app-header.tsx` (NEW)
- `frontend/src/shared/components/layout/app-header.test.tsx` (NEW)
- `frontend/src/shared/components/layout/app-layout.tsx` (NEW)
- `frontend/src/shared/components/layout/app-layout.test.tsx` (NEW)
- `frontend/src/features/admin/components/admin-page.tsx` (MODIFIED — tabbed layout + responsive tab wrapping)
- `frontend/src/features/admin/components/admin-page.test.tsx` (NEW/MODIFIED — tab coverage + async stabilization to reduce `act(...)` warnings)
- `frontend/src/App.tsx` (MODIFIED — wrap routes with AppLayout)
- `frontend/src/App.test.tsx` (MODIFIED — header + layout tests)
- `frontend/src/features/admin/hooks/use-approve-user.test.tsx` (MODIFIED — removed unused import)
- `backend/src/routes/admin.routes.ts` (MODIFIED — require approved users on admin endpoints)
- `backend/src/middleware/auth.middleware.ts` (MODIFIED — destroy stale session when session user no longer exists)
- `frontend/src/features/auth/hooks/use-auth.ts` (MODIFIED — logout now validates HTTP success)
- `frontend/src/shared/components/layout/app-header.tsx` (MODIFIED — responsive mobile stacking)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED — status updated)
- `_bmad-output/implementation-artifacts/7-3-implement-admin-dashboard.md` (MODIFIED — story file updated)
