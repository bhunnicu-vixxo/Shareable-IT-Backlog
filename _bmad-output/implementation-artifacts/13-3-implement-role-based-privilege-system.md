# Story 13.3: Implement Role-Based Screen Access and Privilege Levels

Linear Issue ID: VIX-427
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a centralized permission system that maps roles to capabilities,
So that conditional UI rendering and route protection are consistent, maintainable, and easy to extend.

## Acceptance Criteria

1. **Centralized permission checks:** A `usePermissions()` hook provides named boolean flags for each capability (e.g., `canViewLinearLinks`, `canManageUsers`), derived from the user's role.
2. **Conditional rendering wrapper:** A `<RequireRole>` component conditionally renders its children based on the user's role, supporting `role="it"` (IT + Admin), `role="admin"` (Admin only), and optional fallback rendering.
3. **Backend route protection:** Backend routes are protected by role-appropriate middleware (`requireIT`, `requireAdmin`), and adding new protected routes is straightforward.
4. **Extensible permission config:** A permissions configuration maps roles to capabilities in a single location, making it easy to add new permissions with minimal code changes.
5. **Privilege matrix implemented:** The following matrix is enforced across frontend and backend:

| Feature / Screen | Regular User | IT User | Admin |
|---|---|---|---|
| View backlog items | Yes | Yes | Yes |
| Issue identifier hyperlinks (to Linear) | No | Yes | Yes |
| "Open in Linear" button in detail modal | No | Yes | Yes |
| View migration metadata (ADO Work Item ID, etc.) | No | Yes | Yes |
| User management / approval | No | No | Yes |
| System configuration | No | No | Yes |

6. **Feature flag removed:** The `SHOW_OPEN_IN_LINEAR` environment variable feature flag is removed and replaced with role-based permission checks throughout.

## Tasks / Subtasks

- [x] Task 1: Create permissions configuration (AC: #4, #5)
  - [x] 1.1: Create `frontend/src/features/auth/utils/permissions.ts`
  - [x] 1.2: Define `Permission` type with all capability names (`canViewLinearLinks`, `canViewMigrationMetadata`, `canManageUsers`, `canConfigureSystem`)
  - [x] 1.3: Define `RolePermissions` mapping: for each role (regular, it, admin), list which permissions are granted
  - [x] 1.4: Export a `getPermissions(isIT: boolean, isAdmin: boolean): Record<Permission, boolean>` function
- [x] Task 2: Create `usePermissions()` hook (AC: #1)
  - [x] 2.1: Create `frontend/src/features/auth/hooks/use-permissions.ts`
  - [x] 2.2: Import `useAuth()` and `getPermissions()`
  - [x] 2.3: Return memoized permission flags derived from `isIT` and `isAdmin`
  - [x] 2.4: Return type includes all permission booleans plus `role: 'admin' | 'it' | 'user'` convenience field
- [x] Task 3: Create `<RequireRole>` component (AC: #2)
  - [x] 3.1: Create `frontend/src/features/auth/components/require-role.tsx`
  - [x] 3.2: Props: `role: 'it' | 'admin'`, `children: ReactNode`, `fallback?: ReactNode`
  - [x] 3.3: Use `usePermissions()` internally to check access
  - [x] 3.4: Render children if authorized, fallback (or null) if not
- [x] Task 4: Refactor existing role checks to use new permission system (AC: #5, #6)
  - [x] 4.1: Update `backlog-item-card.tsx` — replace direct `isIT || isAdmin` check with `usePermissions().canViewLinearLinks`
  - [x] 4.2: Update `item-detail-modal.tsx` — replace `SHOW_OPEN_IN_LINEAR` and direct role checks with `usePermissions().canViewLinearLinks`
  - [x] 4.3: Remove `SHOW_OPEN_IN_LINEAR` / `VITE_SHOW_OPEN_IN_LINEAR` env var and all references
  - [x] 4.4: Verify admin dashboard route/page still uses appropriate admin checks (no regression)
- [x] Task 5: Backend route audit and middleware alignment (AC: #3, #5)
  - [x] 5.1: Audit `backend/src/routes/admin.routes.ts` — confirm all admin routes use `requireAuth` → `requireApproved` → `requireAdmin`
  - [x] 5.2: Audit `backend/src/routes/it.routes.ts` — confirm IT routes use `requireIT`
  - [x] 5.3: Identify any unprotected routes that should have role guards per the privilege matrix
  - [x] 5.4: Add middleware guards to any unprotected routes found
- [x] Task 6: Tests (AC: #1, #2, #3, #4, #5)
  - [x] 6.1: Unit tests for `permissions.ts` — verify `getPermissions()` returns correct flags for each role combination
  - [x] 6.2: Unit tests for `usePermissions()` — verify hook returns correct permission flags for regular user, IT user, Admin user
  - [x] 6.3: Unit tests for `<RequireRole>` — verify children rendered for authorized role, fallback/null for unauthorized
  - [x] 6.4: Integration tests — verify backlog card uses permission hook correctly
  - [x] 6.5: Integration tests — verify item detail modal uses permission hook correctly
  - [x] 6.6: Verify existing admin dashboard tests still pass
  - [x] 6.7: Run full test suite to confirm zero regressions

## Dev Notes

### Architecture Compliance

- **Hook pattern:** `usePermissions()` follows the same pattern as `useAuth()` — a custom hook that derives state from cached data. Place in `features/auth/hooks/` alongside `use-auth.ts`
- **Component pattern:** `<RequireRole>` follows React conditional rendering wrapper pattern. Place in `features/auth/components/`
- **Permission config:** Centralized in `features/auth/utils/permissions.ts` — single source of truth for role-capability mapping
- **No new backend endpoints:** This story only adds frontend abstractions over existing backend middleware. No new API routes needed.
- **No new database changes:** Roles are already stored (`is_admin`, `is_it`). This story adds a permission layer on top.

### Critical Implementation Details

- **useAuth() already provides `isIT` and `isAdmin`** — `usePermissions()` is a thin wrapper that maps these booleans to named capabilities
- **Memoize permission object** — use `useMemo` with `[isIT, isAdmin]` deps to avoid unnecessary re-renders
- **RequireRole component should NOT call useAuth() itself** — it should use `usePermissions()` to keep the permission logic centralized
- **Feature flag removal:** `SHOW_OPEN_IN_LINEAR` is defined using `import.meta.env.VITE_SHOW_OPEN_IN_LINEAR === 'true'` in `item-detail-modal.tsx`. After this story, that constant and the env var are removed entirely.
- **Admin page access:** `frontend/src/features/admin/components/admin-page.tsx` currently gated by admin check in router (App.tsx). This should remain as-is — `<RequireRole>` is for inline conditional rendering, not route-level gating.
- **Migration metadata:** The privilege matrix says IT/Admin can "View migration metadata (ADO Work Item ID, etc.)". If this data isn't currently exposed, this task covers the permission infrastructure only — the actual metadata display would be a separate story.

### Permissions Configuration Design

```typescript
// frontend/src/features/auth/utils/permissions.ts
export type Permission =
  | 'canViewLinearLinks'
  | 'canViewMigrationMetadata'
  | 'canManageUsers'
  | 'canConfigureSystem'

export function getPermissions(isIT: boolean, isAdmin: boolean): Record<Permission, boolean> {
  return {
    canViewLinearLinks: isIT || isAdmin,
    canViewMigrationMetadata: isIT || isAdmin,
    canManageUsers: isAdmin,
    canConfigureSystem: isAdmin,
  }
}
```

### usePermissions() Hook Design

```typescript
// frontend/src/features/auth/hooks/use-permissions.ts
export function usePermissions() {
  const { isIT, isAdmin } = useAuth()
  const role = isAdmin ? 'admin' : isIT ? 'it' : 'user'
  const permissions = useMemo(() => getPermissions(isIT, isAdmin), [isIT, isAdmin])
  return { ...permissions, role }
}
```

### RequireRole Component Design

```typescript
// frontend/src/features/auth/components/require-role.tsx
interface RequireRoleProps {
  role: 'it' | 'admin'
  children: ReactNode
  fallback?: ReactNode
}

export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const permissions = usePermissions()
  const hasAccess = role === 'admin' ? permissions.canManageUsers : permissions.canViewLinearLinks
  return hasAccess ? <>{children}</> : <>{fallback}</>
}
```

### Anti-Patterns to Avoid

- Do NOT create a Context provider for permissions — use a hook that reads from `useAuth()` (which already uses TanStack Query)
- Do NOT store permission state in localStorage or sessionStorage — derive it from the auth session
- Do NOT duplicate role checks — always go through `usePermissions()` or `<RequireRole>`, never check `isIT || isAdmin` directly in components after this story
- Do NOT create separate permission APIs — permissions are fully derived from user role on the client side
- Do NOT change the admin route gating in `App.tsx` — `<RequireRole>` is for inline conditional rendering of UI elements, not route protection
- Do NOT add `role` column to the database — the project uses boolean flags (`is_admin`, `is_it`), and the permission layer maps these to capabilities

### Previous Story Intelligence (13-1 and 13-2)

From story 13.1 (completed):
- `isIT` field added across the full stack (DB → backend session → API → frontend type → useAuth hook)
- `requireIT()` middleware at `backend/src/middleware/it.middleware.ts` — pattern: `req.session.isIT || req.session.isAdmin`
- Backend route registration: IT routes in `it.routes.ts`, admin routes in `admin.routes.ts`
- All existing tests pass

From story 13.2 (created, depends on 13.1):
- Backlog card and item detail modal will have direct `isIT || isAdmin` checks for clickable identifiers
- `SHOW_OPEN_IN_LINEAR` feature flag will be replaced with role checks
- After 13.3, these direct checks should be refactored to use `usePermissions().canViewLinearLinks`

### Project Structure Notes

**New files:**
- `frontend/src/features/auth/utils/permissions.ts` — permission configuration
- `frontend/src/features/auth/utils/permissions.test.ts` — permission config tests
- `frontend/src/features/auth/hooks/use-permissions.ts` — permissions hook
- `frontend/src/features/auth/hooks/use-permissions.test.tsx` — permissions hook tests
- `frontend/src/features/auth/components/require-role.tsx` — conditional rendering component
- `frontend/src/features/auth/components/require-role.test.tsx` — RequireRole tests

**Files to modify:**
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — refactor to use `usePermissions()`
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — update tests for permission hook
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — refactor to use `usePermissions()`, remove feature flag
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — update tests

**Files to clean up:**
- Remove `VITE_SHOW_OPEN_IN_LINEAR` from any `.env` or `.env.example` files
- Remove `SHOW_OPEN_IN_LINEAR` constant definition from `item-detail-modal.tsx`

### References

- [Source: frontend/src/features/auth/hooks/use-auth.ts#L88-101] — useAuth() return values including isIT, isAdmin
- [Source: frontend/src/features/auth/types/auth.types.ts#L1-9] — User interface with isIT
- [Source: backend/src/middleware/it.middleware.ts] — requireIT middleware pattern
- [Source: backend/src/middleware/admin.middleware.ts] — requireAdmin middleware pattern
- [Source: backend/src/routes/index.ts#L38-43] — Protected route registration pattern
- [Source: backend/src/routes/admin.routes.ts] — Admin route middleware chain
- [Source: frontend/src/features/admin/components/admin-page.tsx#L36-88] — Admin dashboard tab structure
- [Source: frontend/src/features/backlog/components/item-detail-modal.tsx#L233-244] — SHOW_OPEN_IN_LINEAR feature flag
- [Source: _bmad-output/implementation-artifacts/13-1-add-it-role-to-user-model.md] — Previous story context
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic-13] — Epic 13 definition

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (2026-02-14)

### Debug Log References

No debug issues encountered. All tasks implemented cleanly following red-green-refactor cycle.

### Completion Notes List

- **Task 1:** Created `permissions.ts` with `Permission` union type and `getPermissions()` function implementing the privilege matrix. 6 unit tests all pass.
- **Task 2:** Created `usePermissions()` hook wrapping `useAuth()` with `useMemo` for memoized permission flags + `role` convenience field. 5 unit tests all pass.
- **Task 3:** Created `<RequireRole>` component using `usePermissions()` internally. Supports `role="it"` (IT + Admin) and `role="admin"` (Admin only) with optional fallback. 9 unit tests all pass.
- **Task 4:** Refactored `backlog-item-card.tsx` and `item-detail-modal.tsx` to replace direct `useAuth()` + `isIT || isAdmin` checks with `usePermissions().canViewLinearLinks`. Updated corresponding test files to mock `usePermissions` instead of `useAuth`. `SHOW_OPEN_IN_LINEAR` was already fully removed in story 13.2. Admin dashboard route gating verified unchanged.
- **Task 5:** Backend route audit confirmed all routes properly protected: admin routes use `requireAuth → requireApproved → requireAdmin`, IT routes use `requireIT` (with auth/approval from protected router), backlog/sync routes gated by `requireAuth + requireApproved`. No unprotected routes found.
- **Task 6:** All 686 tests pass across 63 test files. Zero regressions. New tests: 6 (permissions), 5 (usePermissions), 9 (RequireRole) = 20 new tests. Updated tests: backlog-item-card (39), item-detail-modal (32) refactored to use permission mocks.

### Change Log

- 2026-02-14: Implemented role-based permission system (VIX-427). Created centralized permissions config, usePermissions hook, and RequireRole component. Refactored backlog-item-card and item-detail-modal to use permission hook. Backend routes audited and confirmed properly protected.
- 2026-02-14: Senior Developer Review (AI): Added explicit role→capability mapping, made RequireRole truly role-based, stabilized usePermissions memoization, and fixed card keyboard handling for nested Linear links. Verified frontend + backend test suites pass.

### File List

**New files:**
- `frontend/src/features/auth/utils/permissions.ts`
- `frontend/src/features/auth/utils/permissions.test.ts`
- `frontend/src/features/auth/hooks/use-permissions.ts`
- `frontend/src/features/auth/hooks/use-permissions.test.tsx`
- `frontend/src/features/auth/components/require-role.tsx`
- `frontend/src/features/auth/components/require-role.test.tsx`

**Modified files:**
- `frontend/src/features/backlog/components/backlog-item-card.tsx` — refactored to use `usePermissions()` instead of `useAuth()`
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — updated mocks from `useAuth` to `usePermissions`
- `frontend/src/features/backlog/components/item-detail-modal.tsx` — refactored to use `usePermissions()` instead of `useAuth()`
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — updated mocks from `useAuth` to `usePermissions`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status: ready-for-dev → in-progress → review
- `_bmad-output/implementation-artifacts/13-3-implement-role-based-privilege-system.md` — tasks marked complete, dev agent record updated

## Senior Developer Review (AI)

### Summary

- **Fixed story/implementation mismatch**: Added `ROLE_PERMISSIONS` role→capability mapping in `permissions.ts` (matches Task 1.3 / AC #4).
- **Hardened role gating**: `<RequireRole>` now checks the user’s derived role (`user`/`it`/`admin`) rather than indirectly mapping “role” to a single permission.
- **Stabilized hook output**: `usePermissions()` now returns a memoized object reference (only changes when `isIT`/`isAdmin` changes).
- **Keyboard + a11y fix**: Prevented the clickable card’s Enter/Space handler from hijacking keyboard activation when focus is on the nested Linear link.

### Test Results

- **Frontend**: `npm -C frontend run test:run` (687 tests passed)
- **Backend**: `npm -C backend test` (684 tests passed)
