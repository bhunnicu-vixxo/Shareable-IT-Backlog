# Story 7.4: Implement User Management Interface

Linear Issue ID: VIX-364
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to view and manage approved users,
so that I can control access to the tool.

## Acceptance Criteria

1. **Given** I am an admin user, **When** I view the user management section (Users tab in admin dashboard), **Then** I see a list of ALL users (approved, pending, and disabled) with their details
2. **And** each user row shows: display name/email, role (admin/user), status (approved/pending/disabled), approval date, and last access timestamp
3. **And** I can disable an approved user's access via a "Disable" action (sets `is_disabled = true`)
4. **And** I can re-enable a disabled user's access via an "Enable" action (sets `is_disabled = false`)
5. **And** all user management actions (disable, enable) are logged in the `audit_logs` table with action type, admin user ID, target user ID, and IP address
6. **And** the user list supports searching/filtering by email or display name
7. **And** the user list coexists with the existing pending user approval UI (either as a separate section below approvals, or as a unified list with status indicators)
8. **And** success feedback is shown after each action (e.g., "User disabled" / "User enabled")
9. **And** the admin cannot disable their own account (prevent self-lockout)
10. **And** `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`
11. **And** unit tests cover new backend endpoints, service methods, and frontend components

## Tasks / Subtasks

- [x] Task 1: Add backend `getAllUsers` service method (AC: #1, #2)
  - [x] 1.1: Add `getAllUsers()` function to `backend/src/services/users/user.service.ts`
  - [x] 1.2: Query: `SELECT id, email, display_name, is_admin, is_approved, is_disabled, approved_at, last_access_at, created_at FROM users ORDER BY created_at ASC`
  - [x] 1.3: Return `ManagedUser[]` type (extends existing patterns): `{ id, email, displayName, isAdmin, isApproved, isDisabled, approvedAt, lastAccessAt, createdAt }`
  - [x] 1.4: Update `backend/src/services/users/user.service.test.ts`

- [x] Task 2: Add backend `disableUser` and `enableUser` service methods (AC: #3, #4, #5, #9)
  - [x] 2.1: Add `disableUser(userId: number, adminId: number, ipAddress: string)` to `user.service.ts`
  - [x] 2.2: Validate: user exists, user is not the admin themselves (prevent self-lockout), user is not already disabled
  - [x] 2.3: Run in transaction: `UPDATE users SET is_disabled = true, updated_at = NOW() WHERE id = $1` + audit log insert (action: `USER_DISABLED`)
  - [x] 2.4: Add `enableUser(userId: number, adminId: number, ipAddress: string)` to `user.service.ts`
  - [x] 2.5: Validate: user exists, user is currently disabled
  - [x] 2.6: Run in transaction: `UPDATE users SET is_disabled = false, updated_at = NOW() WHERE id = $1` + audit log insert (action: `USER_ENABLED`)
  - [x] 2.7: Update `user.service.test.ts`

- [x] Task 3: Add backend admin controller handlers and routes (AC: #1, #3, #4)
  - [x] 3.1: Add `listAllUsers` handler to `backend/src/controllers/admin.controller.ts`
  - [x] 3.2: Add `disableUserHandler` handler to `admin.controller.ts`
  - [x] 3.3: Add `enableUserHandler` handler to `admin.controller.ts`
  - [x] 3.4: Register routes in `backend/src/routes/admin.routes.ts`:
    - `GET /admin/users` → `listAllUsers` (all middleware)
    - `POST /admin/users/:id/disable` → `disableUserHandler` (all middleware)
    - `POST /admin/users/:id/enable` → `enableUserHandler` (all middleware)
  - [x] 3.5: Update `admin.controller.test.ts` and `admin.routes.test.ts`

- [x] Task 4: Create frontend `useAllUsers` hook (AC: #1, #2)
  - [x] 4.1: Create `frontend/src/features/admin/hooks/use-all-users.ts`
  - [x] 4.2: TanStack Query hook fetching `GET /api/admin/users` with `credentials: 'include'`
  - [x] 4.3: Return `{ users, isLoading, error, refetch }`
  - [x] 4.4: Create `frontend/src/features/admin/hooks/use-all-users.test.tsx`

- [x] Task 5: Create frontend `useToggleUserStatus` hook (AC: #3, #4)
  - [x] 5.1: Create `frontend/src/features/admin/hooks/use-toggle-user-status.ts`
  - [x] 5.2: TanStack Query mutation: `POST /api/admin/users/:id/disable` or `/enable` based on current state
  - [x] 5.3: On success: invalidate `['admin', 'all-users']` query
  - [x] 5.4: Create `frontend/src/features/admin/hooks/use-toggle-user-status.test.tsx`

- [x] Task 6: Create `UserManagementList` component (AC: #1, #2, #3, #4, #6, #7, #8, #9)
  - [x] 6.1: Create `frontend/src/features/admin/components/user-management-list.tsx`
  - [x] 6.2: Display all users in a table/list with columns: Name/Email, Role, Status, Approved Date, Last Access
  - [x] 6.3: Status badges: green "Approved", orange "Pending", red "Disabled"
  - [x] 6.4: Role badge: blue "Admin" for admins
  - [x] 6.5: Action button per row: "Disable" (for approved users) / "Enable" (for disabled users) / none (for pending users — they use existing approve flow)
  - [x] 6.6: Disable button not shown for the current admin user (prevent self-lockout)
  - [x] 6.7: Search/filter input at top: filters by email or display name (client-side)
  - [x] 6.8: Success and error feedback messages
  - [x] 6.9: Loading and empty states
  - [x] 6.10: Create `frontend/src/features/admin/components/user-management-list.test.tsx`

- [x] Task 7: Update AdminPage Users tab to include user management (AC: #7)
  - [x] 7.1: Update `frontend/src/features/admin/components/admin-page.tsx`
  - [x] 7.2: Users tab shows `UserApprovalList` (pending approvals) at top, followed by `UserManagementList` (all users) below
  - [x] 7.3: Update `admin-page.test.tsx`

- [x] Task 8: Build and test verification (AC: #10, #11)
  - [x] 8.1: Run `npm run build` in `backend/`
  - [x] 8.2: Run `npm run test:run` in `backend/`
  - [x] 8.3: Run `npm run build` in `frontend/`
  - [x] 8.4: Run `npm run test:run` in `frontend/`

## Dev Notes

### What's Already Done (from Stories 7.1–7.3)

| Capability | Story | File |
|---|---|---|
| `users` table with `is_admin`, `is_approved`, `is_disabled`, `approved_at`, `approved_by`, `last_access_at` | 1.3 | `database/migrations/001_create-users-table.sql` |
| `audit_logs` table with `user_id`, `action`, `resource`, `resource_id`, `details`, `ip_address`, `is_admin_action` | 1.3 | `database/migrations/003_create-audit-logs-table.sql` |
| `getPendingUsers()` — returns unapproved, non-disabled users | 7.2 | `backend/src/services/users/user.service.ts` |
| `approveUser()` — approves user with transaction + audit log | 7.2 | `backend/src/services/users/user.service.ts` |
| `GET /api/admin/users/pending` — list pending users | 7.2 | `backend/src/routes/admin.routes.ts` |
| `POST /api/admin/users/:id/approve` — approve user | 7.2 | `backend/src/routes/admin.routes.ts` |
| `requireAuth` + `requireApproved` + `requireAdmin` middleware chain | 7.2 | `backend/src/middleware/auth.middleware.ts`, `admin.middleware.ts` |
| `UserApprovalList` component (pending users + approve button) | 7.2 | `frontend/src/features/admin/components/user-approval-list.tsx` |
| `usePendingUsers` hook | 7.2 | `frontend/src/features/admin/hooks/use-pending-users.ts` |
| `useApproveUser` hook | 7.2 | `frontend/src/features/admin/hooks/use-approve-user.ts` |
| `AdminPage` with tabbed layout (Users/Sync/Settings) | 7.3 | `frontend/src/features/admin/components/admin-page.tsx` |
| `AppHeader` + `AppLayout` shared navigation | 7.3 | `frontend/src/shared/components/layout/` |
| `useAuth()` hook with `user`, `isAdmin`, `logout` | 7.2 | `frontend/src/features/auth/hooks/use-auth.ts` |
| `User` type with `id`, `email`, `displayName`, `isAdmin`, `isApproved`, `isDisabled` | 7.2 | `frontend/src/features/auth/types/auth.types.ts` |
| `lookupOrCreateUser`, `getUserById`, `updateLastAccess` | 7.2 | `backend/src/services/auth/auth.service.ts` |
| `mapRowToUser()` helper (snake_case → camelCase) | 7.2 | `backend/src/services/auth/auth.service.ts` |
| Session-based auth with PostgreSQL store | 7.2 | `backend/src/config/session.config.ts` |
| `API_URL` constant | — | `frontend/src/utils/constants.ts` |
| Chakra UI v3 with compound components | — | `@chakra-ui/react` |
| TanStack Query v5 | — | `frontend/src/main.tsx` |
| `lucide-react` icons | 7.3 | Already installed |
| Pino structured logger | 1.2 | `backend/src/utils/logger.ts` |

### What This Story Creates

1. **`getAllUsers()` service method** — Returns all users (approved, pending, disabled) for admin management view
2. **`disableUser()` / `enableUser()` service methods** — Toggle user disabled status with transaction + audit log
3. **`GET /api/admin/users`** — New endpoint listing all users
4. **`POST /api/admin/users/:id/disable`** — New endpoint to disable a user
5. **`POST /api/admin/users/:id/enable`** — New endpoint to re-enable a user
6. **`useAllUsers` hook** — TanStack Query hook for fetching all users
7. **`useToggleUserStatus` hook** — Mutation hook for disable/enable
8. **`UserManagementList` component** — Full user list with search, status badges, and disable/enable actions
9. **Updated `AdminPage`** — Users tab shows both approval requests and full user management

### CRITICAL: Backend Service Methods (user.service.ts)

#### `getAllUsers()`

```typescript
export interface ManagedUser {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isApproved: boolean
  isDisabled: boolean
  approvedAt: string | null
  lastAccessAt: string | null
  createdAt: string
}

export async function getAllUsers(): Promise<ManagedUser[]> {
  const result = await query(
    `SELECT id, email, display_name, is_admin, is_approved, is_disabled,
            approved_at, last_access_at, created_at
     FROM users
     ORDER BY created_at ASC`,
  )

  return result.rows.map((row) => ({
    id: row.id as number,
    email: row.email as string,
    displayName: row.display_name as string | null,
    isAdmin: row.is_admin as boolean,
    isApproved: row.is_approved as boolean,
    isDisabled: row.is_disabled as boolean,
    approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
    lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
    createdAt: (row.created_at as Date).toISOString(),
  }))
}
```

**CRITICAL:** Follow the same `mapRowToUser` pattern from `auth.service.ts` — snake_case DB columns → camelCase TS properties. But define the `ManagedUser` type locally in `user.service.ts` (not imported from auth) since it has a different shape (no `updatedAt`, `approvedBy`).

#### `disableUser()` and `enableUser()`

```typescript
export async function disableUser(userId: number, adminId: number, ipAddress: string = ''): Promise<ManagedUser> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (existing.rows.length === 0) {
      const err = new Error(`User with ID ${userId} not found`) as Error & { statusCode: number; code: string }
      err.statusCode = 404
      err.code = 'USER_NOT_FOUND'
      throw err
    }

    const user = existing.rows[0]

    // Prevent self-lockout
    if (userId === adminId) {
      const err = new Error('Cannot disable your own account') as Error & { statusCode: number; code: string }
      err.statusCode = 400
      err.code = 'SELF_DISABLE_FORBIDDEN'
      throw err
    }

    if (user.is_disabled) {
      const err = new Error(`User with ID ${userId} is already disabled`) as Error & { statusCode: number; code: string }
      err.statusCode = 409
      err.code = 'USER_ALREADY_DISABLED'
      throw err
    }

    const result = await client.query(
      `UPDATE users SET is_disabled = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [userId],
    )

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, is_admin_action)
       VALUES ($1, 'USER_DISABLED', 'user', $2, $3, $4, true)`,
      [adminId, String(userId), JSON.stringify({ disabledUserId: userId, disabledUserEmail: user.email }), ipAddress],
    )

    await client.query('COMMIT')

    logger.info({ userId, adminId, email: user.email }, 'User disabled by admin')

    const row = result.rows[0]
    return {
      id: row.id as number,
      email: row.email as string,
      displayName: row.display_name as string | null,
      isAdmin: row.is_admin as boolean,
      isApproved: row.is_approved as boolean,
      isDisabled: row.is_disabled as boolean,
      approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
      lastAccessAt: row.last_access_at ? (row.last_access_at as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
```

**CRITICAL:** Follow the exact same transactional pattern as `approveUser()` — `pool.connect()`, `BEGIN`, `SELECT ... FOR UPDATE`, update, audit log, `COMMIT`, with `ROLLBACK` in catch.

**CRITICAL:** `enableUser()` follows the same pattern but sets `is_disabled = false` and uses audit action `USER_ENABLED`. It should NOT require the user to be approved — re-enabling a disabled user just removes the disabled flag.

**CRITICAL:** Self-lockout prevention: `disableUser` checks `userId === adminId` and throws 400 with `SELF_DISABLE_FORBIDDEN`. The frontend also hides the disable button for the current user, but the backend must enforce this as defense-in-depth.

### CRITICAL: Backend Controller Handlers (admin.controller.ts)

```typescript
// ADD to existing admin.controller.ts:

import { getAllUsers, disableUser, enableUser } from '../services/users/user.service.js'

export async function listAllUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await getAllUsers()
    res.json(users)
  } catch (err) {
    next(err)
  }
}

export async function disableUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: { message: 'Invalid user ID', code: 'VALIDATION_ERROR' } })
      return
    }

    const adminId = Number(req.session.userId)
    const result = await disableUser(userId, adminId, req.ip ?? '')
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function enableUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id)
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: { message: 'Invalid user ID', code: 'VALIDATION_ERROR' } })
      return
    }

    const adminId = Number(req.session.userId)
    const result = await enableUser(userId, adminId, req.ip ?? '')
    res.json(result)
  } catch (err) {
    next(err)
  }
}
```

**CRITICAL:** Follow the exact same pattern as `approveUserHandler` — validate ID, extract adminId from session, call service, pass to error middleware on failure.

### CRITICAL: Backend Routes (admin.routes.ts)

```typescript
// ADD to existing admin.routes.ts:
import { listAllUsers, disableUserHandler, enableUserHandler } from '../controllers/admin.controller.js'

router.get('/admin/users', requireAuth, requireApproved, requireAdmin, listAllUsers)
router.post('/admin/users/:id/disable', requireAuth, requireApproved, requireAdmin, disableUserHandler)
router.post('/admin/users/:id/enable', requireAuth, requireApproved, requireAdmin, enableUserHandler)
```

**CRITICAL:** All routes use the same middleware chain as existing admin routes: `requireAuth`, `requireApproved`, `requireAdmin`. The `requireApproved` was added in Story 7.3 review fixes.

**CRITICAL:** Keep existing routes (`GET /admin/users/pending`, `POST /admin/users/:id/approve`) unchanged. The new `GET /admin/users` is a separate endpoint that returns ALL users.

### CRITICAL: Frontend Type for Managed Users

```typescript
// frontend/src/features/admin/types/admin.types.ts (NEW file, or add to hooks)

export interface ManagedUser {
  id: number
  email: string
  displayName: string | null
  isAdmin: boolean
  isApproved: boolean
  isDisabled: boolean
  approvedAt: string | null
  lastAccessAt: string | null
  createdAt: string
}
```

**CRITICAL:** This type matches the backend `ManagedUser` interface exactly (camelCase JSON fields).

### CRITICAL: Frontend Hooks

#### `useAllUsers` hook

```typescript
// frontend/src/features/admin/hooks/use-all-users.ts

import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { ManagedUser } from './use-all-users'  // or from admin.types

export function useAllUsers() {
  const query = useQuery<ManagedUser[]>({
    queryKey: ['admin', 'all-users'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/users`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      return response.json()
    },
    staleTime: 30_000, // 30s
  })

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

**CRITICAL:** Follow the exact same pattern as `usePendingUsers` — same `staleTime`, same `credentials: 'include'`, same error handling. Use `queryKey: ['admin', 'all-users']` (separate from `['admin', 'pending-users']`).

#### `useToggleUserStatus` hook

```typescript
// frontend/src/features/admin/hooks/use-toggle-user-status.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'

interface ToggleParams {
  userId: number
  action: 'disable' | 'enable'
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, Error, ToggleParams>({
    mutationFn: async ({ userId, action }: ToggleParams) => {
      const response = await fetch(`${API_URL}/admin/users/${userId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? `Failed to ${action} user`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] })
    },
  })

  return {
    toggleStatus: mutation.mutateAsync,
    isToggling: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
```

**CRITICAL:** Invalidate BOTH `['admin', 'all-users']` AND `['admin', 'pending-users']` on success. Disabling a user may affect the pending users list (if they were pending), and enabling may add them back.

**CRITICAL:** Follow the same pattern as `useApproveUser` — `mutateAsync`, `isPending`, error extraction.

### CRITICAL: UserManagementList Component

```typescript
// frontend/src/features/admin/components/user-management-list.tsx

import { useState } from 'react'
import { Box, Badge, Button, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useAllUsers } from '../hooks/use-all-users'
import { useToggleUserStatus } from '../hooks/use-toggle-user-status'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatRelativeTime } from '@/utils/formatters'

function getStatusBadge(user: ManagedUser) {
  if (user.isDisabled) return <Badge colorPalette="red">Disabled</Badge>
  if (user.isApproved) return <Badge colorPalette="green">Approved</Badge>
  return <Badge colorPalette="orange">Pending</Badge>
}

export function UserManagementList() {
  const { users, isLoading, error } = useAllUsers()
  const { toggleStatus, isToggling } = useToggleUserStatus()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.email.toLowerCase().includes(q) || (u.displayName?.toLowerCase().includes(q) ?? false)
  })

  const handleToggle = async (userId: number, email: string, action: 'disable' | 'enable') => {
    setTogglingId(userId)
    setSuccessMessage(null)
    try {
      await toggleStatus({ userId, action })
      setSuccessMessage(`${email} has been ${action}d`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } finally {
      setTogglingId(null)
    }
  }

  // ... render with search input, user list, action buttons, loading/error/empty states
}
```

**CRITICAL:** Use `useAuth()` to get the current admin user's ID. Do NOT show a Disable button for the row where `user.id === currentUser?.id` (prevent self-lockout).

**CRITICAL:** Pending users should NOT have a disable/enable button — they are managed via the existing `UserApprovalList` approve flow. Only approved and disabled users get toggle actions.

**CRITICAL:** Search is client-side — filter the `users` array by email/displayName. No backend search endpoint needed for MVP (user count will be small).

**CRITICAL:** Use `formatRelativeTime()` from `frontend/src/utils/formatters.ts` for the "Last Access" column (e.g., "2 hours ago", "3 days ago"). Use regular date formatting for "Approved" column.

**CRITICAL:** Style the list similar to `UserApprovalList` — bordered cards/rows with `Box`, `HStack`, `VStack`, `Badge`. Keep consistent with the existing admin UI patterns.

### CRITICAL: Updated AdminPage Users Tab

```typescript
// frontend/src/features/admin/components/admin-page.tsx — UPDATE Users tab content

<Tabs.Content value="users">
  <Box pt={4}>
    <VStack gap={6} align="stretch">
      <UserApprovalList />
      <UserManagementList />
    </VStack>
  </Box>
</Tabs.Content>
```

**CRITICAL:** Keep `UserApprovalList` at the top (pending approvals are high-priority), then `UserManagementList` below (full user list). Do NOT replace `UserApprovalList` — both components serve different purposes.

**CRITICAL:** Import `UserManagementList` in `admin-page.tsx`. Add `VStack` wrapper with `gap={6}` to separate the two sections.

### Architecture Compliance

**From architecture.md:**
- Routes → Controllers → Services pattern for new endpoints
- `camelCase` JSON response fields (`isAdmin`, `isDisabled`, `approvedAt`)
- `snake_case` database columns (`is_admin`, `is_disabled`, `approved_at`)
- Consistent error format: `{ error: { message, code } }`
- Pino structured logging for all admin actions
- Feature-based frontend organization
- Co-located tests

**From project-context.md:**
- TypeScript strict mode
- `PascalCase` components, `camelCase` functions/variables, `kebab-case` files
- Never query database directly from controllers (use service layer)
- Never expose internal error details to users
- Use `null` for missing values in JSON, not `undefined`
- Always validate API inputs
- Log all admin actions with context

### Cross-Story Context (Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 7.2 User Approval Workflow | **HARD dependency** | Provides `user.service.ts`, `admin.controller.ts`, `admin.routes.ts`, middleware, `UserApprovalList`, hooks |
| 7.3 Admin Dashboard | **HARD dependency** | Provides tabbed admin layout, `AppHeader`, `AppLayout` |
| 7.1 Network-Based Access | **HARD dependency** | Provides network middleware layer |
| 7.5 Sync Status and History | **Future enhancer** | Will enhance Sync tab — unrelated to Users tab |

### Git Intelligence (Recent Patterns)

- Current branch: `rhunnicutt/issue-6-6-handle-partial-sync-failures` (may need new branch for 7.4)
- Latest merge: `185b561` — sync error handling
- Pattern: `feat:` commit prefix with Linear issue ID
- React Router imports from `react-router` (not `react-router-dom`)
- Chakra UI v3 compound components used throughout
- `lucide-react` for icons
- Tests use `vitest` with `vi.mock()`, `vi.hoisted()`, `@testing-library/react`
- 288 backend tests + 299 frontend tests currently passing

### Previous Story Intelligence (7.3)

**Key learnings from Story 7.3:**
- `AdminPage` uses Chakra UI v3 Tabs: `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Content`
- `Tabs.Root defaultValue="users"` makes Users tab default
- Admin page imports `UserApprovalList` and `SyncControl` — add `UserManagementList` alongside
- `flexWrap={{ base: 'wrap', md: 'nowrap' }}` on `Tabs.List` for responsive behavior
- Pre-existing select interaction test failures (Chakra UI + jsdom limitation) are NOT regressions
- Button uses `loading` prop (not `isLoading`) in Chakra UI v3
- `vi.hoisted()` needed for module-level mocking in vitest

**Key learnings from Story 7.2:**
- `approveUser` follows transaction pattern: `pool.connect()` → `BEGIN` → `SELECT FOR UPDATE` → `UPDATE` → audit log → `COMMIT`
- Error objects augmented with `statusCode` and `code` properties for the error middleware: `const err = new Error(msg) as Error & { statusCode: number; code: string }`
- `req.ip` passed for audit log IP address
- `useApproveUser` invalidates `['admin', 'pending-users']` on success
- `usePendingUsers` uses `staleTime: 30_000` (30 seconds)
- Session middleware cast to `any` due to `@types/express` v4/v5 mismatch — don't try to fix
- `NETWORK_CHECK_ENABLED=false` needed in test env

### Testing Strategy

**Backend — user.service.test.ts (updates):**
- Test: `getAllUsers()` returns all users (approved, pending, disabled)
- Test: `getAllUsers()` returns empty array when no users
- Test: `disableUser()` sets `is_disabled = true` and creates audit log
- Test: `disableUser()` throws 404 for non-existent user
- Test: `disableUser()` throws 400 for self-disable attempt
- Test: `disableUser()` throws 409 for already-disabled user
- Test: `enableUser()` sets `is_disabled = false` and creates audit log
- Test: `enableUser()` throws 404 for non-existent user
- Test: `enableUser()` throws 409 for user that is not disabled

**Backend — admin.controller.test.ts (updates):**
- Test: `GET /api/admin/users` returns user list
- Test: `POST /api/admin/users/:id/disable` with valid ID returns updated user
- Test: `POST /api/admin/users/:id/disable` with invalid ID returns 400
- Test: `POST /api/admin/users/:id/enable` with valid ID returns updated user
- Test: `POST /api/admin/users/:id/enable` with invalid ID returns 400

**Backend — admin.routes.test.ts (updates):**
- Test: Routes require auth + admin middleware (existing pattern)

**Frontend — use-all-users.test.tsx:**
- Test: Fetches `GET /api/admin/users`
- Test: Returns user list
- Test: Handles error

**Frontend — use-toggle-user-status.test.tsx:**
- Test: Calls `POST /api/admin/users/:id/disable`
- Test: Calls `POST /api/admin/users/:id/enable`
- Test: Invalidates both `all-users` and `pending-users` queries on success

**Frontend — user-management-list.test.tsx:**
- Test: Renders user list with name, status badges
- Test: Shows "Disable" button for approved users
- Test: Shows "Enable" button for disabled users
- Test: Does NOT show action button for pending users
- Test: Does NOT show "Disable" button for current admin user
- Test: Search filters users by email
- Test: Search filters users by display name
- Test: Shows empty state when no users
- Test: Shows loading state

**Frontend — admin-page.test.tsx (update):**
- Test: Users tab shows both UserApprovalList and UserManagementList

### Project Structure After This Story

```
backend/src/
├── services/
│   └── users/
│       ├── user.service.ts                    (MODIFIED — add getAllUsers, disableUser, enableUser, ManagedUser type)
│       └── user.service.test.ts               (MODIFIED — add tests for new methods)
├── controllers/
│   ├── admin.controller.ts                    (MODIFIED — add listAllUsers, disableUserHandler, enableUserHandler)
│   └── admin.controller.test.ts               (MODIFIED — add tests for new handlers)
├── routes/
│   ├── admin.routes.ts                        (MODIFIED — add GET /admin/users, POST disable/enable)
│   └── admin.routes.test.ts                   (MODIFIED — add route tests)

frontend/src/
├── features/
│   └── admin/
│       ├── hooks/
│       │   ├── use-all-users.ts               (NEW)
│       │   ├── use-all-users.test.tsx          (NEW)
│       │   ├── use-toggle-user-status.ts       (NEW)
│       │   └── use-toggle-user-status.test.tsx  (NEW)
│       └── components/
│           ├── user-management-list.tsx         (NEW)
│           ├── user-management-list.test.tsx    (NEW)
│           ├── admin-page.tsx                   (MODIFIED — add UserManagementList to Users tab)
│           └── admin-page.test.tsx              (MODIFIED — verify both components in Users tab)
```

### What NOT To Do

- **Do NOT** replace `UserApprovalList` — it stays as the pending approval UI. `UserManagementList` is a separate component below it.
- **Do NOT** modify `UserApprovalList` or its hooks (`usePendingUsers`, `useApproveUser`) — they are unchanged.
- **Do NOT** add role management (promote/demote admin) — that is not in the acceptance criteria for this story. Admin role is set via database only for MVP.
- **Do NOT** add a "Delete" (hard delete) action — use soft disable only. The `is_disabled` flag allows undo.
- **Do NOT** add pagination — user count will be small for MVP. Client-side filtering is sufficient.
- **Do NOT** add server-side search — client-side filtering by email/name is sufficient for MVP.
- **Do NOT** add a user detail modal/page — the list view shows enough information.
- **Do NOT** modify `auth.middleware.ts`, `admin.middleware.ts`, or `session.config.ts` — they are unchanged.
- **Do NOT** modify the `useAuth` hook or `App.tsx` — auth flow is unchanged.
- **Do NOT** add `date-fns` — `formatRelativeTime()` already exists using native `Intl.RelativeTimeFormat`.
- **Do NOT** modify the Sync or Settings tabs — only the Users tab is affected.
- **Do NOT** create a new admin page/route — the user management goes into the existing Users tab.
- **Do NOT** allow admins to disable other admin accounts without a warning — but do NOT block it either. Just block self-disable.
- **Do NOT** change the existing `PendingUser` or `ApprovedUser` types in `user.service.ts` — add the new `ManagedUser` type alongside them.
- **Do NOT** use `react-router-dom` imports — use `react-router` directly (React Router v7).
- **Do NOT** modify the database schema — the existing `users` table already has all needed columns (`is_disabled`, `last_access_at`, `approved_at`, etc.).

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic 7, Story 7.4] — Story requirements, AC, technical details
- [Source: _bmad-output/planning-artifacts/architecture.md#User Management & Access Control] — FR16 (approve), FR17 (remove/disable), FR21 (view users)
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Routes → Controllers → Services, naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — Feature-based frontend, layer-based backend
- [Source: _bmad-output/project-context.md] — Naming conventions, error handling, anti-patterns
- [Source: backend/src/services/users/user.service.ts] — Existing service with `getPendingUsers`, `approveUser`
- [Source: backend/src/controllers/admin.controller.ts] — Existing controller with `listPendingUsers`, `approveUserHandler`
- [Source: backend/src/routes/admin.routes.ts] — Existing routes with middleware chain
- [Source: backend/src/services/auth/auth.service.ts] — `mapRowToUser` helper pattern, `User` type with all fields
- [Source: database/migrations/001_create-users-table.sql] — Users table schema with all needed columns
- [Source: database/migrations/003_create-audit-logs-table.sql] — Audit logs schema
- [Source: frontend/src/features/admin/components/admin-page.tsx] — Current tabbed layout to extend
- [Source: frontend/src/features/admin/components/user-approval-list.tsx] — Existing approval UI pattern to follow
- [Source: frontend/src/features/admin/hooks/use-pending-users.ts] — Hook pattern to follow
- [Source: frontend/src/features/admin/hooks/use-approve-user.ts] — Mutation hook pattern to follow
- [Source: frontend/src/features/auth/types/auth.types.ts] — User type definition
- [Source: frontend/src/features/auth/hooks/use-auth.ts] — Auth hook for current user info
- [Source: _bmad-output/implementation-artifacts/7-3-implement-admin-dashboard.md] — Previous story: tabbed admin layout, test patterns, Chakra UI v3 tabs
- [Source: _bmad-output/implementation-artifacts/7-2-implement-user-approval-workflow.md] — Previous story: auth flow, transactional service pattern, middleware chain

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

No debug issues encountered. All implementations followed existing patterns cleanly.

### Completion Notes List

- **Task 1:** Added `ManagedUser` interface and `getAllUsers()` service method to `user.service.ts`. Returns all users (approved, pending, disabled) with snake_case-to-camelCase mapping. 3 tests added.
- **Task 2:** Added `disableUser()` and `enableUser()` service methods following the exact transactional pattern from `approveUser()` — `pool.connect()`, `BEGIN`, `SELECT FOR UPDATE`, update, audit log insert, `COMMIT`, with `ROLLBACK` in catch. Self-lockout prevention (userId === adminId check) in `disableUser`. 7 tests added.
- **Task 3:** Added `listAllUsers`, `disableUserHandler`, `enableUserHandler` controller handlers following `approveUserHandler` pattern. Registered 3 new routes in `admin.routes.ts` with full middleware chain (`requireAuth`, `requireApproved`, `requireAdmin`). 15 new tests across controller and route test files.
- **Task 4:** Created `useAllUsers` hook following `usePendingUsers` pattern — same `staleTime: 30_000`, `credentials: 'include'`, error handling. Query key: `['admin', 'all-users']`. 3 tests added.
- **Task 5:** Created `useToggleUserStatus` mutation hook following `useApproveUser` pattern. Invalidates both `['admin', 'all-users']` and `['admin', 'pending-users']` on success. 4 tests added.
- **Task 6:** Created `UserManagementList` component with: search/filter by email/name, status badges (green Approved, orange Pending, red Disabled), Admin role badge, Disable/Enable action buttons, self-lockout prevention (no Disable for current user), no actions for pending users, success feedback, loading/empty states. 10 tests added.
- **Task 7:** Updated `AdminPage` Users tab to show `UserApprovalList` at top and `UserManagementList` below in a `VStack` with `gap={6}`. Updated admin page tests to verify both components render.
- **Task 8:** Backend build: 0 errors. Frontend build: 0 errors. Backend tests: 313 passed. Frontend tests: 316 passed. Zero regressions.
- **Senior Review Fixes:** Enforced strong `SESSION_SECRET` requirement in production, ensured user role is always shown (Admin/User), surfaced disable/enable action errors in UI and prevented concurrent toggles, and restricted `disableUser()` to approved users only (pending users remain managed via approval flow). Tests updated accordingly.

### Change Log

- 2026-02-10: Implemented Story 7.4 — User Management Interface. Added backend service methods (getAllUsers, disableUser, enableUser), controller handlers, routes, frontend hooks (useAllUsers, useToggleUserStatus), UserManagementList component, and updated AdminPage Users tab. 42 new tests added. All builds pass with zero errors.
- 2026-02-11: Senior dev code review fixes — tightened session secret requirements, improved role + error feedback in user management UI, prevented concurrent toggles, and restricted disabling to approved users only. All builds/tests passing.

### File List

**New Files:**
- `frontend/src/features/admin/hooks/use-all-users.ts`
- `frontend/src/features/admin/hooks/use-all-users.test.tsx`
- `frontend/src/features/admin/hooks/use-toggle-user-status.ts`
- `frontend/src/features/admin/hooks/use-toggle-user-status.test.tsx`
- `frontend/src/features/admin/components/user-management-list.tsx`
- `frontend/src/features/admin/components/user-management-list.test.tsx`

**Modified Files:**
- `backend/src/services/users/user.service.ts` (added ManagedUser type, getAllUsers, disableUser, enableUser)
- `backend/src/services/users/user.service.test.ts` (added 10 tests for new methods)
- `backend/src/config/session.config.ts` (require strong SESSION_SECRET in production)
- `backend/src/controllers/admin.controller.ts` (added listAllUsers, disableUserHandler, enableUserHandler)
- `backend/src/controllers/admin.controller.test.ts` (added 9 tests for new handlers)
- `backend/src/routes/admin.routes.ts` (added 3 new routes)
- `backend/src/routes/admin.routes.test.ts` (added 6 integration tests)
- `frontend/src/features/admin/components/admin-page.tsx` (added UserManagementList to Users tab)
- `frontend/src/features/admin/components/admin-page.test.tsx` (updated to verify both components)
- `frontend/src/features/admin/components/user-management-list.tsx` (show Admin/User role, surface action errors, prevent concurrent toggles)
- `frontend/src/features/admin/components/user-management-list.test.tsx` (verify role badges)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status: in-progress → review)

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-11_

### Summary

- Validated acceptance criteria against implementation and tests.
- Applied fixes for security hardening and UX completeness.

### Issues Found and Fixed

1. **Security**: Removed unsafe production fallback by requiring a strong `SESSION_SECRET` when `NODE_ENV=production`.
2. **AC #2 (role visibility)**: User role is now always shown (`Admin` / `User`).
3. **AC #8 (action feedback)**: Disable/enable failures now show an error message (in addition to success feedback).
4. **UX/Correctness**: Prevented concurrent disable/enable actions while a toggle request is in flight.
5. **Backend guardrails**: `disableUser()` now rejects disabling unapproved (pending) users; pending access remains managed via approval flow.

### Test Results

- Backend: `npm run build` ✅, `npm run test:run` ✅
- Frontend: `npm run build` ✅, `npm run test:run` ✅

### Notes

- Current working tree contains additional changed files not listed in this story’s File List (outside the 7.4 scope). Consider splitting unrelated changes before opening a PR for cleaner review/merge.
