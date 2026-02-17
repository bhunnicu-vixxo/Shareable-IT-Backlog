# Story 7.7: Flesh Out Admin User Management - Reject, Remove, Promote, and Confirmation

Linear Issue ID: VIX-453
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to reject pending users, remove users from the system, promote/demote admin roles, and see confirmation dialogs before destructive actions,
so that I have full control over user lifecycle management with safe, intentional actions.

## Acceptance Criteria

1. **Reject Pending Users:** Admin can reject a pending user request, which sets the user as disabled and records the rejection in the audit log. Rejected users appear in the "Disabled" section of the user management list with appropriate visual indication.

2. **Remove Users from System:** Admin can permanently remove a disabled or rejected user from the system (hard delete). Only disabled users can be removed (not active/approved users — they must be disabled first). Removal deletes the user record and all associated data (preferences, etc.) and is logged in the audit trail before deletion.

3. **Promote/Demote Admin Role:** Admin can promote an approved, non-disabled user to admin role or demote an admin back to regular user. An admin cannot demote themselves (self-lockout prevention). Role changes are logged in the audit trail.

4. **Confirmation Dialogs for Destructive Actions:** All destructive or significant actions require a confirmation dialog before execution:
   - Reject user (destructive)
   - Remove user (destructive, irreversible)
   - Disable user (destructive)
   - Promote to admin (significant privilege change)
   - Demote from admin (significant privilege change)
   The confirmation dialog clearly states the action, the affected user, and any consequences. The "Remove user" dialog has an extra warning about irreversibility.

5. **Consistent Action Feedback:** All actions display success or error toast messages after completion, consistent with existing patterns (3-second auto-dismiss for success, persistent for errors).

6. **Audit Logging:** All new actions (reject, remove, promote/demote admin) create audit log entries with action type, target user, admin performing the action, IP address, and relevant details JSON.

7. **UI Integration:** New actions integrate seamlessly into the existing `UserManagementList` and `UserApprovalList` components with consistent button styling, loading states, and disabled states during mutation.

## Tasks / Subtasks

- [x] Task 1: Add reject user backend (AC: #1, #6)
  - [x] 1.1: Add `rejectUser(userId, adminId, ipAddress)` function to `user.service.ts` — sets `is_disabled = true` on a pending (not yet approved) user, creates `USER_REJECTED` audit log entry, runs in transaction
  - [x] 1.2: Add `rejectUserHandler()` to `admin.controller.ts` — validates user ID param, calls service, returns updated user
  - [x] 1.3: Add `POST /api/admin/users/:id/reject` route to `admin.routes.ts` with requireAdmin middleware
  - [x] 1.4: Add `USER_REJECTED` to audit action types in `audit.types.ts`
  - [x] 1.5: Write unit tests for `rejectUser()` service function (success, user not found, already approved, already disabled)

- [x] Task 2: Add remove user backend (AC: #2, #6)
  - [x] 2.1: Add `removeUser(userId, adminId, ipAddress)` function to `user.service.ts` — hard-deletes a disabled user and associated `user_preferences` rows, creates `USER_REMOVED` audit log entry BEFORE deletion (so audit trail preserves the record), runs in transaction
  - [x] 2.2: Add `removeUserHandler()` to `admin.controller.ts` — validates user ID param, calls service, returns `{ success: true }`
  - [x] 2.3: Add `DELETE /api/admin/users/:id` route to `admin.routes.ts` with requireAdmin middleware
  - [x] 2.4: Add `USER_REMOVED` to audit action types
  - [x] 2.5: Write unit tests for `removeUser()` service function (success, user not found, user not disabled, self-removal prevention)

- [x] Task 3: Add promote/demote admin backend (AC: #3, #6)
  - [x] 3.1: Add `updateUserAdminRole(userId, isAdmin, adminId, ipAddress)` function to `user.service.ts` — updates `is_admin` flag, prevents self-demotion, creates `USER_ADMIN_ROLE_UPDATED` audit log entry, runs in transaction
  - [x] 3.2: Add `updateUserAdminRoleHandler()` to `admin.controller.ts` — validates user ID and `isAdmin` boolean from request body, calls service, returns updated user
  - [x] 3.3: Add `PUT /api/admin/users/:id/admin-role` route to `admin.routes.ts` with requireAdmin middleware
  - [x] 3.4: Add `USER_ADMIN_ROLE_UPDATED` to audit action types
  - [x] 3.5: Write unit tests for `updateUserAdminRole()` service function (promote, demote, self-demotion prevention, user not found, user disabled)

- [x] Task 4: Create reusable confirmation dialog component (AC: #4)
  - [x] 4.1: Create `frontend/src/shared/components/confirmation-dialog.tsx` — a reusable Chakra UI `AlertDialog` component that accepts: title, body message, confirm button label, confirm button color scheme, onConfirm callback, onCancel callback, isOpen, isLoading
  - [x] 4.2: Write tests for `confirmation-dialog.test.tsx` — renders title/body, calls onConfirm on confirm click, calls onCancel on cancel click, shows loading state, closes on overlay click

- [x] Task 5: Add frontend hooks for new actions (AC: #1, #2, #3)
  - [x] 5.1: Create `frontend/src/features/admin/hooks/use-reject-user.ts` — mutation hook calling `POST /api/admin/users/:id/reject`, invalidates `['admin', 'pending-users']` and `['admin', 'all-users']`
  - [x] 5.2: Create `frontend/src/features/admin/hooks/use-remove-user.ts` — mutation hook calling `DELETE /api/admin/users/:id`, invalidates `['admin', 'all-users']`
  - [x] 5.3: Create `frontend/src/features/admin/hooks/use-toggle-admin-role.ts` — mutation hook calling `PUT /api/admin/users/:id/admin-role` with `{ isAdmin: boolean }` body, invalidates `['admin', 'all-users']`

- [x] Task 6: Integrate reject action into UserApprovalList (AC: #1, #4, #5, #7)
  - [x] 6.1: Add "Reject" button (red color scheme) alongside existing "Approve" button in `user-approval-list.tsx`
  - [x] 6.2: Wire up confirmation dialog for reject action with message: "Are you sure you want to reject {email}? This user will be moved to the disabled list."
  - [x] 6.3: Display success/error toast messages after reject completes
  - [x] 6.4: Add loading/disabled state to reject button during mutation

- [x] Task 7: Integrate remove, promote/demote, and confirmations into UserManagementList (AC: #2, #3, #4, #5, #7)
  - [x] 7.1: Add "Remove" button (red, visible only for disabled users) to `user-management-list.tsx`
  - [x] 7.2: Wire up confirmation dialog for remove action with strong warning: "Permanently remove {email}? This action cannot be undone. All user data will be deleted."
  - [x] 7.3: Add "Promote to Admin" / "Demote from Admin" button for approved non-disabled users (not visible for self)
  - [x] 7.4: Wire up confirmation dialog for promote/demote with message explaining the privilege change
  - [x] 7.5: Add confirmation dialogs to existing disable/enable actions (currently execute without confirmation)
  - [x] 7.6: Display success/error toast messages for all new actions
  - [x] 7.7: Ensure all buttons have proper loading/disabled states during mutations

- [x] Task 8: End-to-end integration testing (AC: #1-7)
  - [x] 8.1: Write component tests for UserApprovalList with reject flow (render reject button, open dialog, confirm, verify API call, verify list refresh)
  - [x] 8.2: Write component tests for UserManagementList with remove, promote/demote flows and confirmation dialogs
  - [x] 8.3: Verify existing disable/enable tests still pass with new confirmation dialogs added

## Dev Notes

### Architecture & Patterns

**Follow existing patterns exactly:**
- **Service layer:** All new service functions follow the transaction + audit log pattern established in `disableUser()` and `enableUser()` in `backend/src/services/users/user.service.ts`
- **Controller layer:** Handlers follow the existing error pattern with `statusCode` and `code` properties on thrown errors (see `disableUserHandler()` in `admin.controller.ts`)
- **Route layer:** Use existing middleware chain: `requireAuth`, `requireApproved`, `requireAdmin` (see `admin.routes.ts`)
- **Frontend hooks:** Follow the TanStack Query mutation pattern in `use-toggle-user-status.ts` and `use-toggle-it-role.ts`
- **Query invalidation:** Match existing cache key patterns: `['admin', 'all-users']`, `['admin', 'pending-users']`

**Database considerations:**
- **Reject:** Uses existing `is_disabled = true` flag — no schema changes needed. A pending user (`is_approved = false`) that is rejected becomes `is_disabled = true`. The audit log `USER_REJECTED` differentiates from `USER_DISABLED` (which is for approved users).
- **Remove:** Hard-deletes the user row. Must delete from `user_preferences` first (FK constraint) and any `backlog_items_seen` rows. Create the `USER_REMOVED` audit log entry BEFORE deleting the user row (use `details` JSONB to store the deleted user's email/info for the audit trail).
- **Promote/Demote:** Updates `is_admin` flag — no schema changes needed.

**Tables that reference users.id (check for FK constraints before hard delete):**
- `user_preferences.user_id` (FK)
- `audit_logs.user_id` (FK — DO NOT delete audit logs; set `user_id = NULL` or skip if no FK constraint)
- `users.approved_by` (self-referencing FK)
- `backlog_items_seen.user_id` (if exists from Story 15.3)

### Self-Protection Rules
- Admin cannot disable themselves (existing)
- Admin cannot demote themselves from admin (new)
- Admin cannot remove themselves (new)
- These checks MUST be in the service layer, not just the UI

### Confirmation Dialog Design
- Use Chakra UI `AlertDialog` (not `Modal`) — it traps focus and is the correct semantic component for confirmations
- Standard confirmations: Blue/green confirm button
- Destructive confirmations: Red confirm button (`colorScheme="red"`)
- Remove confirmation: Extra-strong warning text, red confirm button
- All dialogs show the target user's email in the message

### Existing Files to Modify
- `backend/src/services/users/user.service.ts` — add `rejectUser`, `removeUser`, `updateUserAdminRole`
- `backend/src/controllers/admin.controller.ts` — add handlers
- `backend/src/routes/admin.routes.ts` — add routes
- `backend/src/types/audit.types.ts` — add new audit action types
- `frontend/src/features/admin/components/user-approval-list.tsx` — add reject button + dialog
- `frontend/src/features/admin/components/user-management-list.tsx` — add remove, promote/demote buttons + dialogs for all actions

### New Files to Create
- `frontend/src/shared/components/confirmation-dialog.tsx`
- `frontend/src/shared/components/confirmation-dialog.test.tsx`
- `frontend/src/features/admin/hooks/use-reject-user.ts`
- `frontend/src/features/admin/hooks/use-remove-user.ts`
- `frontend/src/features/admin/hooks/use-toggle-admin-role.ts`
- `backend/src/services/users/user.service.test.ts` (extend existing tests)

### API Endpoint Summary
| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `/api/admin/users/:id/reject` | — | Reject pending user |
| DELETE | `/api/admin/users/:id` | — | Remove disabled user |
| PUT | `/api/admin/users/:id/admin-role` | `{ isAdmin: boolean }` | Promote/demote admin |

### Previous Story Learnings (from 7-4, 13-1)
- Story 7-4 established the UserManagementList patterns — extend, don't replace
- Story 13-1 added `is_it` column and IT role toggle — follow same patterns for admin role toggle
- The `use-toggle-it-role.ts` hook is the closest template for `use-toggle-admin-role.ts`
- The `use-toggle-user-status.ts` hook is the template for `use-reject-user.ts` and `use-remove-user.ts`
- Self-lockout prevention pattern already exists in `disableUser()` — replicate for `updateUserAdminRole()` and `removeUser()`

### Testing Standards
- Co-located test files (`.test.ts` / `.test.tsx` alongside source)
- Backend: Test service functions with mocked database pool (see existing `user.service.test.ts`)
- Frontend: Test components with React Testing Library, mock fetch calls
- Test confirmation dialog interactions: open, confirm, cancel, loading states

### Project Structure Notes
- Frontend admin feature: `frontend/src/features/admin/`
- Shared components: `frontend/src/shared/components/`
- Backend services: `backend/src/services/users/`
- Backend controllers: `backend/src/controllers/`
- Backend routes: `backend/src/routes/`
- All paths follow existing kebab-case conventions

### References
- [Source: _bmad-output/implementation-artifacts/7-4-implement-user-management-interface.md] — Current user management patterns
- [Source: _bmad-output/implementation-artifacts/13-1-add-it-role-to-user-model.md] — IT role toggle pattern
- [Source: _bmad-output/planning-artifacts/architecture.md] — FR16-FR17 admin capabilities
- [Source: _bmad-output/planning-artifacts/prd.md] — User management requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Confirmation modal patterns
- [Source: _bmad-output/project-context.md] — Coding standards and patterns

## Dev Agent Record

### Agent Model Used
Claude claude-4.6-opus-high-thinking

### Debug Log References
None — no debug issues encountered.

### Completion Notes List
- **Task 1-3 (Backend):** Implemented `rejectUser()`, `removeUser()`, and `updateUserAdminRole()` service functions with full transaction support, audit logging, and self-protection rules. Added corresponding controller handlers and routes. Added `USER_REJECTED`, `USER_REMOVED`, `USER_ADMIN_ROLE_UPDATED` to audit action types. `removeUser()` deletes `user_preferences`, clears `approved_by` self-references, then deletes the user, and now includes guardrails to prevent removing the last admin account.
- **Task 4 (Confirmation Dialog):** Created reusable `ConfirmationDialog` component using Chakra UI v3 `Dialog` with `role="alertdialog"`. Supports configurable title, body, confirm label, color palette, loading state. 7 tests pass.
- **Task 5 (Frontend Hooks):** Created `use-reject-user.ts`, `use-remove-user.ts`, `use-toggle-admin-role.ts` following existing TanStack Query mutation patterns. Each invalidates appropriate query cache keys on success.
- **Task 6 (UserApprovalList):** Added "Reject" button (red outline) alongside "Approve". Confirmation dialog warns user will be moved to disabled list. Uses Chakra toaster for success/error feedback (success auto-dismiss; error persistent). All buttons disabled during any mutation. 8 tests pass.
- **Task 7 (UserManagementList):** Added "Remove" (red, solid, disabled users only), "Make Admin"/"Demote Admin" (blue) buttons. ALL destructive actions now go through confirmation dialogs (disable, enable, remove, promote, demote). Remove dialog has strong "cannot be undone" warning. Self-protection: no admin role/disable/remove buttons shown for current user. Uses Chakra toaster for success/error feedback. All buttons have proper loading/disabled states. 19 tests pass.
- **Task 8 (Integration Testing):** Updated both component test files with mocks for new hooks. Added tests for reject flow, remove flow, promote/demote flows, confirmation dialog open/close/confirm interactions. All pre-existing tests updated to work with new confirmation dialogs. 36 backend + 34 frontend tests pass for modified files. Pre-existing failures in unrelated files (backlog-item-card, item-detail-modal, backlog.service, route integration tests) were not introduced by this story.

### Change Log
- 2026-02-17: Story 7.7 implementation complete — all 8 tasks done
- 2026-02-17: Senior dev review fixes — toaster feedback, last-admin guardrails, confirmation dialog close dedupe, removeUser audit/detail improvements

### File List
**New files:**
- `frontend/src/shared/components/confirmation-dialog.tsx`
- `frontend/src/shared/components/confirmation-dialog.test.tsx`
- `frontend/src/features/admin/hooks/use-reject-user.ts`
- `frontend/src/features/admin/hooks/use-remove-user.ts`
- `frontend/src/features/admin/hooks/use-toggle-admin-role.ts`

**Modified files:**
- `backend/src/services/users/user.service.ts` — added `rejectUser()`, `removeUser()`, `updateUserAdminRole()`
- `backend/src/services/users/user.service.test.ts` — added tests for new service functions
- `backend/src/controllers/admin.controller.ts` — added handlers for reject, remove, admin-role
- `backend/src/routes/admin.routes.ts` — added 3 new routes
- `backend/src/types/audit.types.ts` — added audit action types
- `frontend/src/features/admin/components/user-approval-list.tsx` — added reject button + confirmation dialog
- `frontend/src/features/admin/components/user-approval-list.test.tsx` — updated mocks, added reject flow tests
- `frontend/src/features/admin/components/user-management-list.tsx` — added remove, promote/demote buttons + confirmation dialogs for all actions
- `frontend/src/features/admin/components/user-management-list.test.tsx` — updated mocks, added new flow tests
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to done

## Senior Developer Review (AI)

### Summary
- Replaced inline success/error banners with Chakra `toaster` messages per project pattern:
  - Success: auto-dismiss after 3 seconds
  - Error: persistent (no auto-dismiss)
- Hardened `ConfirmationDialog` close behavior to avoid double-firing `onCancel` in controlled mode.
- Backend guardrails:
  - Prevent demoting the **last active admin**
  - Prevent removing the **last admin account**
- Improved `removeUser()` audit details: captures which users had `approved_by` cleared as part of the removal transaction.

### Test Notes
- `npm run test:run`:
  - Backend: PASS
  - Frontend: existing failures in unrelated backlog components remain (not introduced by this story)
