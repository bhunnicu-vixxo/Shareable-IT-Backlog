# Story 18.1: Request Submission Pipeline — Business Users Submit IT Requests

Linear Issue ID: VIX-439
Status: done

## Story

As a business user,
I want to submit new IT requests directly through the app using a structured form,
so that I have a single, trackable place to ask for IT work — instead of sending emails, Slack messages, or hallway requests that get lost.

## Acceptance Criteria

1. **Given** I am a logged-in, approved user, **When** I click "Submit Request," **Then** I see a structured request form.
2. **Given** I fill out the form and submit, **When** the request is saved, **Then** I see a confirmation and the request appears in "My Requests."
3. **Given** I am submitting a request, **When** I type a title, **Then** the app suggests similar existing backlog items to reduce duplicates ("Did you mean...?").
4. **Given** I am an admin, **When** I navigate to the triage queue, **Then** I see all pending requests sorted by submission date.
5. **Given** I am an admin reviewing a request, **When** I approve it, **Then** a Linear issue is created with the request details, submitter attribution, and appropriate labels.
6. **Given** I am an admin reviewing a request, **When** I reject it, **Then** the submitter is notified with the rejection reason.
7. **Given** I submitted a request, **When** I check "My Requests," **Then** I see its current status and any admin feedback.
8. **Build passes**: `npm run build` passes with zero TypeScript errors in both `backend/` and `frontend/`. All existing tests continue to pass.

## Tasks / Subtasks

- [x] Task 1: Backend — Create requests data model and migrations (AC: #2, #7)
  - [x] Create migration: `requests` table with columns:
    - `id` (UUID primary key)
    - `user_id` (FK to users)
    - `title` (varchar, required)
    - `description` (text, required)
    - `business_impact` (enum: critical, high, medium, low)
    - `category` (varchar, nullable — label/system area)
    - `urgency` (varchar, nullable — ASAP, this_quarter, this_year, no_rush)
    - `status` (enum: submitted, reviewing, approved, rejected, merged)
    - `admin_notes` (text, nullable)
    - `rejection_reason` (text, nullable)
    - `linear_issue_id` (varchar, nullable — set on approval)
    - `created_at`, `updated_at` (timestamps)
- [x] Task 2: Backend — Create request API endpoints (AC: #1-#7)
  - [x] Create `backend/src/routes/requests.routes.ts`
  - [x] Create `backend/src/controllers/requests.controller.ts`
  - [x] Create `backend/src/services/requests/request.service.ts`
  - [x] `POST /api/requests` — submit new request (authenticated users)
  - [x] `GET /api/requests/mine` — user's own requests (authenticated)
  - [x] `GET /api/admin/requests` — triage queue (admin only)
  - [x] `GET /api/admin/requests/:id` — single request detail (admin only)
  - [x] `PUT /api/admin/requests/:id/approve` — approve + create Linear issue (admin only)
  - [x] `PUT /api/admin/requests/:id/reject` — reject with reason (admin only)
  - [x] `PUT /api/admin/requests/:id/merge` — link to existing item (admin only, Phase 2)
- [x] Task 3: Backend — Linear issue creation on approval (AC: #5)
  - [x] On approval, use `@linear/sdk` to create a new Linear issue
  - [x] Map request fields: title → issue title, description → issue description
  - [x] Add label based on category if provided
  - [x] Add a note: "Submitted by {user.name} via Shareable IT Backlog"
  - [x] Store the created `linear_issue_id` back on the request record
  - [x] Trigger a sync so the new issue appears in the backlog
- [x] Task 4: Backend — Duplicate detection endpoint (AC: #3)
  - [x] `GET /api/requests/similar?title={searchText}` — returns top 5 similar backlog items
  - [x] Use simple text search (ILIKE or ts_vector) against backlog item titles
  - [x] Return `{ identifier, title, status }` for each match
- [x] Task 5: Frontend — Create request submission form (AC: #1, #2, #3)
  - [x] Create `frontend/src/features/requests/` feature directory
  - [x] Create `frontend/src/features/requests/components/request-form.tsx`
  - [x] Form fields: Title (required), Description (required, textarea), Business Impact (dropdown), Category (dropdown of labels), Urgency (dropdown)
  - [x] Use Chakra UI form components with validation
  - [x] Add debounced title search for duplicate detection (call `/api/requests/similar`)
  - [x] Show similar items panel when matches found
  - [x] On submit success: show confirmation toast and redirect to "My Requests"
- [x] Task 6: Frontend — Create "My Requests" view (AC: #2, #7)
  - [x] Create `frontend/src/features/requests/components/my-requests-page.tsx`
  - [x] List user's requests with status badges (Submitted, Under Review, Approved, Rejected)
  - [x] Show admin feedback/rejection reason when available
  - [x] Show link to created Linear issue when approved
  - [x] Add to `/my-requests` route
- [x] Task 7: Frontend — Create admin triage queue (AC: #4, #5, #6)
  - [x] Create `frontend/src/features/requests/components/triage-queue.tsx`
  - [x] Add triage queue tab/section to admin page
  - [x] List pending requests sorted by date
  - [x] For each request: show details, approve button, reject button (with reason textarea)
  - [x] Approve action: calls API, shows success with created issue link
  - [x] Reject action: prompts for reason, calls API, shows confirmation
- [x] Task 8: Frontend — Navigation and routing (AC: #1)
  - [x] Add "Submit Request" button to `AppHeader` (prominent placement)
  - [x] Add `/submit-request` route for the form
  - [x] Add `/my-requests` route for user's request history
  - [x] Add triage queue to admin section
- [x] Task 9: Write tests (AC: #8)
  - [x] Backend: Test CRUD operations on requests
  - [x] Backend: Test approval creates Linear issue (mock Linear SDK)
  - [x] Backend: Test rejection stores reason
  - [x] Backend: Test duplicate detection returns similar items
  - [x] Frontend: Test form renders all fields with validation
  - [x] Frontend: Test duplicate detection shows similar items
  - [x] Frontend: Test My Requests page lists requests with status
  - [x] Frontend: Test triage queue shows pending requests
  - [x] Frontend: Test approve/reject actions call correct APIs

## Dev Notes

### Architecture Compliance

- **Backend**: Follow routes → controllers → services pattern. New `backend/src/services/requests/` directory.
- **Frontend**: New `frontend/src/features/requests/` feature directory with components, hooks, types.
- **Database**: New `requests` table with proper constraints and indexes.
- **Auth**: All endpoints require authentication. Admin endpoints require admin middleware.
- **Linear integration**: Use existing `@linear/sdk` (already installed) for issue creation on approval.

### Critical Implementation Details

- **Phase 1 scope**: Form → triage → approve/reject. No attachments, no merge, no advanced duplicate detection.
- **Form validation**: Use controlled components with Chakra form validation. Required: title (min 10 chars), description (min 50 chars), business_impact. Optional: category, urgency.
- **Business impact mapping to Linear priority**: `critical` → Urgent (1), `high` → High (2), `medium` → Normal (3), `low` → Low (4).
- **Linear SDK for issue creation**: Already installed as `@linear/sdk`. Pattern from sync service:
  ```typescript
  const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  const issue = await linearClient.createIssue({ teamId, title, description, priority });
  ```
- **Duplicate detection**: Use PostgreSQL `ILIKE` for Phase 1 with parameterized queries: `SELECT identifier, title, status FROM backlog_items WHERE title ILIKE $1 LIMIT 5` (pass `['%' + searchText + '%']` as params). For Phase 2, consider `pg_trgm` extension for fuzzy matching.
- **Status enum**: `submitted` → `reviewing` → `approved`/`rejected`/`merged`. Transitions enforced server-side.
- **Category options**: Populate from the same labels available in the backlog (query visible labels from the labels API).

### Existing Code to Reuse

- `@linear/sdk` configuration from `backend/src/config/linear.config.ts` — Linear client setup
- Auth middleware at `backend/src/middleware/auth.middleware.ts`
- Admin middleware at `backend/src/middleware/admin.middleware.ts`
- Database utility at `backend/src/utils/database.ts` — query execution
- Chakra form components — already used in auth forms (`identify-form.tsx`)
- TanStack Query patterns from existing hooks
- `getLabelColor()` for category display in forms and lists

### Anti-Patterns to Avoid

- Do NOT call Linear API on form submit — only on admin approval (keeps triage control with IT)
- Do NOT allow unauthenticated request submission — all requests need user attribution
- Do NOT skip server-side validation — client validation is for UX, server validation is for security
- Do NOT block on duplicate detection — make it async/debounced, not a blocking check
- Do NOT create a complex workflow engine — simple status enum transitions are sufficient for Phase 1
- Do NOT add email notifications in Phase 1 — focus on in-app status tracking

### Project Structure Notes

**New files:**
- `backend/src/routes/requests.routes.ts`
- `backend/src/controllers/requests.controller.ts`
- `backend/src/services/requests/request.service.ts`
- `frontend/src/features/requests/components/request-form.tsx`
- `frontend/src/features/requests/components/my-requests-page.tsx`
- `frontend/src/features/requests/components/triage-queue.tsx`
- `frontend/src/features/requests/hooks/use-requests.ts`
- `frontend/src/features/requests/types/request.types.ts`
- Database migration for `requests` table

**Modified files:**
- `frontend/src/App.tsx` (add routes)
- `frontend/src/shared/components/layout/app-header.tsx` (add Submit Request button)
- `frontend/src/features/admin/components/admin-page.tsx` (add triage queue tab)
- `backend/src/routes/index.ts` (register request routes)

### References

- [Source: backend/src/config/linear.config.ts] — Linear SDK configuration
- [Source: backend/src/services/sync/linear-transformers.ts] — Linear data patterns
- [Source: frontend/src/features/auth/components/identify-form.tsx] — Chakra form patterns
- [Source: backend/src/middleware/admin.middleware.ts] — Admin authorization
- [Source: backend/src/utils/database.ts] — Database query patterns
- [Source: _bmad-output/planning-artifacts/architecture.md] — Layer architecture, Linear SDK, PostgreSQL

## Dev Agent Record

### Agent Model Used
Claude claude-4.6-opus-high-thinking (via Cursor)

### Debug Log References
- No blocking issues encountered during implementation.
- Code review follow-up: fixed the pre-existing frontend test failures by restoring Business Unit display in backlog card + item detail modal.
- node-pg-migrate had issues with pre-existing migration state; migration applied directly via Node.js pg module.

### Completion Notes List
- **Task 1**: Created `014_create-requests-table.sql` migration with `request_business_impact` and `request_status` PostgreSQL enums. Table has UUID primary key, FK to users, all required columns per spec, and performance indexes.
- **Task 2**: Full REST API: POST /api/requests, GET /api/requests/mine, GET /api/admin/requests, GET /api/admin/requests/:id, PUT /api/admin/requests/:id/approve, PUT /api/admin/requests/:id/reject. Server-side validation (title >= 10 chars, description >= 50 chars, valid impact/urgency enums).
- **Task 3**: On approval, uses `@linear/sdk` to create a Linear issue with mapped priority, submitter attribution, category labels, and project assignment. Linear issue creation is best-effort (approval succeeds even if Linear fails). Uses transactional DB flow with SELECT FOR UPDATE.
- **Task 4**: GET /api/requests/similar?title= uses PostgreSQL ILIKE against backlog_items table, returns top 5 matches with identifier, title, and status.
- **Task 5**: Full request form with Chakra UI, inline validation, debounced duplicate detection (400ms), similar items panel, category populated from visible labels, urgency dropdown, success toast and redirect on submit.
- **Task 6**: My Requests page with request cards showing status badges, rejection reasons, admin notes, and business impact/urgency/category metadata. Empty state with CTA to submit.
- **Task 7**: Triage Queue with pending/processed sections, approve and reject actions, inline rejection reason form, toast notifications, badge count on admin tab.
- **Task 8**: Routes added: /submit-request, /my-requests. "Submit Request" button with Plus icon added to AppHeader. "My Requests" nav link added. "Triage" tab added to admin page with pending count badge.
- **Task 9**: 26 backend tests (12 service + 14 controller) and 16 frontend tests (6 form + 5 my-requests + 5 triage-queue). All 742 backend tests pass, all new frontend tests pass.

### File List

**New files:**
- `database/migrations/014_create-requests-table.sql`
- `database/migrations/015_request-pipeline-hardening.sql`
- `backend/src/services/requests/request.service.ts`
- `backend/src/services/requests/request.service.test.ts`
- `backend/src/controllers/requests.controller.ts`
- `backend/src/controllers/requests.controller.test.ts`
- `backend/src/routes/requests.routes.ts`
- `frontend/src/features/requests/types/request.types.ts`
- `frontend/src/features/requests/hooks/use-requests.ts`
- `frontend/src/features/requests/components/request-form.tsx`
- `frontend/src/features/requests/components/request-form.test.tsx`
- `frontend/src/features/requests/components/my-requests-page.tsx`
- `frontend/src/features/requests/components/my-requests-page.test.tsx`
- `frontend/src/features/requests/components/triage-queue.tsx`
- `frontend/src/features/requests/components/triage-queue.test.tsx`

**Modified files:**
- `backend/src/routes/index.ts` (added requestsRoutes import and registration)
- `backend/src/services/sync/sync-backlog-items.ts` (persist backlog item status for duplicate detection)
- `database/migrations/014_create-requests-table.sql` (UUID default removed — app generates UUIDs)
- `frontend/src/App.tsx` (added /submit-request and /my-requests routes)
- `frontend/src/shared/components/layout/app-header.tsx` (added Submit Request button and My Requests nav link)
- `frontend/src/features/admin/components/admin-page.tsx` (added Triage tab with pending count badge)
- `frontend/src/features/admin/components/user-approval-list.tsx`
- `frontend/src/features/admin/components/user-approval-list.test.tsx`
- `frontend/src/features/admin/components/user-management-list.tsx`
- `frontend/src/features/admin/components/user-management-list.test.tsx`
- `frontend/src/features/backlog/components/backlog-item-card.tsx` (restore Business Unit display)
- `frontend/src/features/backlog/components/item-detail-modal.tsx` (restore Business Unit display)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status: in-progress → review)
- `_bmad-output/implementation-artifacts/18-1-request-submission-pipeline.md` (this file)

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-17_

### Summary

- Fixed migration portability: removed `gen_random_uuid()` default from `requests.id` (no `pgcrypto` dependency) and generate UUIDs in the backend service.
- Added missing API surface area: implemented `PUT /api/admin/requests/:id/merge`.
- Improved duplicate detection correctness: persisted `backlog_items.status` during sync and return real status values from `/api/requests/similar`.
- Improved request approval UX: store Linear issue `identifier` + `url`, and show real “Open in Linear” links in admin triage + My Requests.
- Fixed pre-existing frontend test failures (Business Unit display), and verified `npm run build` + `npm run test:run` pass.

## Change Log
- 2026-02-17: Story 18.1 implementation complete — Request Submission Pipeline with full CRUD, Linear integration on approval, duplicate detection, admin triage queue, and comprehensive tests (42 new tests).
- 2026-02-17: Senior dev review fixes — migration portability, merge endpoint, duplicate detection status, Linear links for approved requests, and pre-existing test repairs. `npm run build` + `npm run test:run` passing.
