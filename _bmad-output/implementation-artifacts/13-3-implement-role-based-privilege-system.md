# Story 13.3: Implement Role-Based Screen Access and Privilege Levels

Linear Issue ID: VIX-427
Status: ready-for-dev

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

- [ ] Task 1: Create permissions configuration (AC: #4, #5)
  - [ ] 1.1: Create `frontend/src/features/auth/utils/permissions.ts`
  - [ ] 1.2: Define `Permission` type with all capability names (`canViewLinearLinks`, `canViewMigrationMetadata`, `canManageUsers`, `canConfigureSystem`)
  - [ ] 1.3: Define `RolePermissions` mapping: for each role (regular, it, admin), list which permissions are granted
  - [ ] 1.4: Export a `getPermissions(isIT: boolean, isAdmin: boolean): Record<Permission, boolean>` function
- [ ] Task 2: Create `usePermissions()` hook (AC: #1)
  - [ ] 2.1: Create `frontend/src/features/auth/hooks/use-permissions.ts`
  - [ ] 2.2: Import `useAuth()` and `getPermissions()`
  - [ ] 2.3: Return memoized permission flags derived from `isIT` and `isAdmin`
  - [ ] 2.4: Return type includes all permission booleans plus `role: 'admin' | 'it' | 'user'` convenience field
- [ ] Task 3: Create `<RequireRole>` component (AC: #2)
  - [ ] 3.1: Create `frontend/src/features/auth/components/require-role.tsx`
  - [ ] 3.2: Props: `role: 'it' | 'admin'`, `children: ReactNode`, `fallback?: ReactNode`
  - [ ] 3.3: Use `usePermissions()` internally to check access
  - [ ] 3.4: Render children if authorized, fallback (or null) if not
- [ ] Task 4: Refactor existing role checks to use new permission system (AC: #5, #6)
  - [ ] 4.1: Update `backlog-item-card.tsx` — replace direct `isIT || isAdmin` check with `usePermissions().canViewLinearLinks`
  - [ ] 4.2: Update `item-detail-modal.tsx` — replace `SHOW_OPEN_IN_LINEAR` and direct role checks with `usePermissions().canViewLinearLinks`
  - [ ] 4.3: Remove `SHOW_OPEN_IN_LINEAR` / `VITE_SHOW_OPEN_IN_LINEAR` env var and all references
  - [ ] 4.4: Verify admin dashboard route/page still uses appropriate admin checks (no regression)
- [ ] Task 5: Backend route audit and middleware alignment (AC: #3, #5)
  - [ ] 5.1: Audit `backend/src/routes/admin.routes.ts` — confirm all admin routes use `requireAuth` → `requireApproved` → `requireAdmin`
  - [ ] 5.2: Audit `backend/src/routes/it.routes.ts` — confirm IT routes use `requireIT`
  - [ ] 5.3: Identify any unprotected routes that should have role guards per the privilege matrix
  - [ ] 5.4: Add middleware guards to any unprotected routes found
- [ ] Task 6: Tests (AC: #1, #2, #3, #4, #5)
  - [ ] 6.1: Unit tests for `permissions.ts` — verify `getPermissions()` returns correct flags for each role combination
  - [ ] 6.2: Unit tests for `usePermissions()` — verify hook returns correct permission flags for regular user, IT user, Admin user
  - [ ] 6.3: Unit tests for `<RequireRole>` — verify children rendered for authorized role, fallback/null for unauthorized
  - [ ] 6.4: Integration tests — verify backlog card uses permission hook correctly
  - [ ] 6.5: Integration tests — verify item detail modal uses permission hook correctly
  - [ ] 6.6: Verify existing admin dashboard tests still pass
  - [ ] 6.7: Run full test suite to confirm zero regressions

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
