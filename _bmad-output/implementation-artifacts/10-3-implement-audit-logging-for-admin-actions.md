# Story 10.3: Implement Audit Logging for Admin Actions

Linear Issue ID: VIX-381
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an IT admin and security/compliance stakeholder,
I want all administrative actions (user approvals, enable/disable, sync triggers, and admin settings changes) to be audit-logged with enough context to reconstruct what changed,
so that we can satisfy audit/compliance requirements and investigate misuse or incidents.

## Acceptance Criteria

1. **Given** an admin approves a user via `POST /api/admin/users/:id/approve`, **When** the request succeeds, **Then** an audit log entry is created with:
   - `user_id` = admin user id
   - `action` = `USER_APPROVED`
   - `resource` = `user`
   - `resource_id` = target user id (string)
   - `is_admin_action` = `true`
   - `details` includes: target user email, and **before/after** approval-related fields (at minimum: `isApproved`, `approvedAt`, `approvedBy`, `isDisabled`)
   - `ip_address` = request IP

2. **Given** an admin disables or enables a user via `POST /api/admin/users/:id/disable` or `POST /api/admin/users/:id/enable`, **When** the request succeeds, **Then** an audit log entry is created with:
   - `action` = `USER_DISABLED` or `USER_ENABLED`
   - `resource` = `user`
   - `resource_id` = target user id (string)
   - `is_admin_action` = `true`
   - `details` includes: target user email, and **before/after** status fields (at minimum: `isDisabled`)

3. **Given** an admin triggers a manual sync via `POST /api/admin/sync/trigger`, **When** the request is accepted (202), **Then** an audit log entry is created with:
   - `action` = `TRIGGER_SYNC`
   - `resource` = `sync`
   - `resource_id` is `null`
   - `is_admin_action` = `true`
   - `details` includes: `triggerType: "manual"`, and the response `statusCode`

4. **Given** an admin updates the sync schedule via `PUT /api/admin/settings/sync-schedule`, **When** the request succeeds, **Then** an audit log entry is created with:
   - `action` = `SYNC_SCHEDULE_UPDATED` (or a similarly explicit settings action name)
   - `resource` = `admin` (or `sync` if you prefer to categorize schedule under sync)
   - `resource_id` = `sync_cron_schedule`
   - `is_admin_action` = `true`
   - `details` includes: **before/after** cron schedule values and whether validation passed

5. **Given** an admin views audit logs in the UI, **When** they open an “Audit Logs” section in the admin dashboard, **Then** they can view **admin action** audit log entries with:
   - pagination (page/limit)
   - filtering at minimum by: action, admin user id, date range
   - default sort by `created_at` descending
   - a clearly visible indicator that entries are “Admin action” (derived from `isAdminAction`)

6. **Given** the audit log query endpoint exists (`GET /api/admin/audit-logs`), **When** it is called with `?isAdminAction=true`, **Then** only admin action entries are returned; and **When** called without that parameter, **Then** behavior remains backward-compatible (returns all logs, as it does today).

7. **And** all existing backend and frontend tests continue to pass (no regressions).

## Tasks / Subtasks

### Backend (audit logging + query support)

- [x] Task 1: Add `isAdminAction` filtering to audit log queries (AC: #5, #6)
  - [x] 1.1: Update `backend/src/types/audit.types.ts` — extend `AuditLogQueryParams` with `isAdminAction?: boolean`
  - [x] 1.2: Update `backend/src/models/audit-log.model.ts` — include optional `is_admin_action = $n` filter in `queryAuditLogs` when provided
  - [x] 1.3: Update `backend/src/controllers/audit.controller.ts` — parse `isAdminAction` query param (`"true" | "false"`) and pass through to the service/model
  - [x] 1.4: Update `backend/src/routes/audit.routes.test.ts` — add coverage for `?isAdminAction=true` and `false`

- [x] Task 2: Standardize admin action audit payload shape (before/after) (AC: #1, #2, #4)
  - [x] 2.1: Update `backend/src/services/users/user.service.ts` — enrich existing admin audit log `details` for `USER_APPROVED`, `USER_DISABLED`, `USER_ENABLED` to include consistent shape:
    - `target: { userId, email }`
    - `before: { ... }`
    - `after: { ... }`
  - [x] 2.2: Keep the audit insert **transactional** with the admin change (approval/disable/enable). If the audit insert fails, the admin change must not commit.
  - [x] 2.3: Update `backend/src/services/users/user.service.test.ts` — assert audit details include before/after fields (avoid brittle exact JSON string matching; parse JSON where possible)

- [x] Task 3: Add audit logs for admin sync trigger + sync schedule updates (AC: #3, #4)
  - [x] 3.1: Update `backend/src/controllers/admin.controller.ts`:
    - On `adminTriggerSync`, write an audit log entry with `is_admin_action=true`
    - On `updateSyncSchedule`, write an audit log entry with before/after schedule values
  - [x] 3.2: Decide and document action names (recommended):
    - `TRIGGER_SYNC` (already used elsewhere)
    - `SYNC_SCHEDULE_UPDATED`
  - [x] 3.3: Add/extend tests:
    - `backend/src/controllers/admin.controller.test.ts` and/or `backend/src/routes/admin.routes.test.ts` to verify audit insert occurs and fields are correct

### Frontend (admin dashboard audit log UI)

- [x] Task 4: Add “Audit Logs” tab to admin dashboard (AC: #5)
  - [x] 4.1: Update `frontend/src/features/admin/components/admin-page.tsx` — add a new tab: `Audit Logs`
  - [x] 4.2: Create `frontend/src/features/admin/hooks/use-audit-logs.ts`:
    - Calls `GET ${API_URL}/admin/audit-logs?isAdminAction=true&page=1&limit=50...`
    - Uses `apiFetchJson` and TanStack Query
  - [x] 4.3: Create `frontend/src/features/admin/components/audit-log-list.tsx`:
    - Table view with columns: Timestamp, Admin (userId), Action, Resource/ID, Summary
    - Optional expandable row to show `details` JSON prettified (guard against large payloads)
    - Pagination controls (simple “Prev/Next” is fine for MVP)
    - Filters (at minimum): action text input, date range inputs, admin userId input
  - [x] 4.4: Add tests:
    - `frontend/src/features/admin/components/audit-log-list.test.tsx` for rendering states (loading/error/empty) and query param wiring (mock fetch)

## Dev Notes

### What’s Already Done (CRITICAL — extend, don’t recreate)

- `audit_logs` table + indexes already exist (`database/migrations/003_create-audit-logs-table.sql`, `005_create-additional-indexes.sql`, `008_add_performance_indexes.sql`).
- User access audit logging middleware exists and is intentionally **non-blocking**:
  - `backend/src/middleware/audit.middleware.ts` → writes `isAdminAction: false` for all request access events.
- Audit log read endpoint already exists:
  - `GET /api/admin/audit-logs` via `backend/src/routes/audit.routes.ts` + `backend/src/controllers/audit.controller.ts`.
- Some admin actions already write audit logs transactionally in `backend/src/services/users/user.service.ts`:
  - `USER_APPROVED`, `USER_DISABLED`, `USER_ENABLED` with `is_admin_action = true`.

### Key Guardrails (Disaster Prevention)

- **Do not add a new migration** for audit logs. Use the existing `audit_logs` schema.
- **Do not change** the user-access audit middleware to start marking admin actions; keep it focused on request access logging with `isAdminAction: false`.
- **Admin action audit logs should be transactional** for state-changing admin operations (user enable/disable/approve, settings updates). This differs from user access auditing (best-effort, non-blocking).
- **Never log secrets** in `details` (e.g., do not include `SYNC_TRIGGER_TOKEN`, session contents, auth cookies).
- Keep the backend error response format unchanged (`{ error: { message, code } }`) and continue using Pino for server-side error logging.

### Files / Areas Likely to Touch

- Backend:
  - `backend/src/services/users/user.service.ts` (existing admin audit writes)
  - `backend/src/controllers/admin.controller.ts` (sync trigger + schedule update)
  - `backend/src/controllers/audit.controller.ts`, `backend/src/models/audit-log.model.ts`, `backend/src/types/audit.types.ts` (query filter plumbing)
- Frontend:
  - `frontend/src/features/admin/components/admin-page.tsx`
  - `frontend/src/features/admin/components/*` (new audit UI)
  - `frontend/src/features/admin/hooks/*` (new query hook)
  - `frontend/src/utils/api-fetch.ts` (use as standard fetch wrapper)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 10.3] — Story requirements and baseline ACs
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] — Security: audit logging of admin actions + retention policy
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified] — Audit & compliance requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Monitoring & Logging] — Pino logging + audit logging as a cross-cutting concern
- [Source: _bmad-output/implementation-artifacts/10-2-implement-audit-logging-for-user-access.md] — Existing audit service/middleware/route patterns and guardrails
- [Source: backend/src/services/users/user.service.ts] — Existing transactional admin audit log inserts
- [Source: backend/src/controllers/admin.controller.ts] — Admin sync + settings endpoints that must now be audited
- [Source: database/migrations/003_create-audit-logs-table.sql] — Audit log schema
- [Source: database/migrations/007_create-app-settings-table.sql] — Sync schedule setting key (`sync_cron_schedule`)

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor)

### Debug Log References

 - `backend`: `npm test` and `npm run build`
 - `frontend`: `npm test` and `npm run build`

### Completion Notes List

- Added `isAdminAction` query param support end-to-end (controller → service → model) and verified backward compatible behavior when omitted.
- Enriched existing admin user-management audit log `details` payloads to a consistent `{ target, before, after }` shape.
- Added required admin audit writes for:
  - `POST /api/admin/sync/trigger` → `TRIGGER_SYNC`
  - `PUT /api/admin/settings/sync-schedule` → `SYNC_SCHEDULE_UPDATED` (includes before/after schedule)
- Added an **Audit Logs** admin tab that displays admin action audit entries with filters, pagination, and expandable JSON details.

### Code Review Fixes (2026-02-12)

- **[HIGH]** Reordered `updateSyncSchedule` to write audit log BEFORE persisting the schedule change, satisfying the transactional guardrail. Added 2 new tests verifying ordering and audit-failure rollback.
- **[HIGH]** Removed duplicate unchecked task entries from story Tasks section.
- **[MEDIUM]** Added `USER_APPROVED`, `USER_DISABLED`, `USER_ENABLED` to `AuditAction` type union for type completeness.
- **[MEDIUM]** Added `syncScheduler` mock to `admin.controller.test.ts` for proper unit test isolation.
- **[MEDIUM]** Refactored `parseOptionalBoolean` from string-sentinel return to structured `{ valid, value }` result object.
- **[MEDIUM]** Added 2 pagination behavior tests to `audit-log-list.test.tsx`.
- **[LOW]** Added clarifying comment on hardcoded `statusCode: 202` in `adminTriggerSync` audit details.
- **[LOW]** Renamed `useAuditLogs` to `useAdminAuditLogs` to reflect hardcoded `isAdminAction=true` filter.
- **[LOW]** Added 200-char max-length validation on cron schedule input.
- **[LOW]** Removed redundant `key` prop on `Table.Row` inside keyed `Fragment`.

### File List

- `_bmad-output/implementation-artifacts/10-3-implement-audit-logging-for-admin-actions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/controllers/admin.controller.test.ts`
- `backend/src/controllers/audit.controller.ts`
- `backend/src/controllers/audit.controller.test.ts`
- `backend/src/models/audit-log.model.ts`
- `backend/src/routes/admin.routes.test.ts`
- `backend/src/routes/audit.routes.test.ts`
- `backend/src/services/audit/audit.service.ts`
- `backend/src/services/audit/audit.service.test.ts`
- `backend/src/services/users/user.service.ts`
- `backend/src/services/users/user.service.test.ts`
- `backend/src/types/audit.types.ts`
- `frontend/src/features/admin/components/admin-page.tsx`
- `frontend/src/features/admin/components/audit-log-list.tsx`
- `frontend/src/features/admin/components/audit-log-list.test.tsx`
- `frontend/src/features/admin/hooks/use-audit-logs.ts`

