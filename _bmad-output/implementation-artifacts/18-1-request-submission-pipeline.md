# Story 18.1: Request Submission Pipeline — Business Users Submit IT Requests

Linear Issue ID: VIX-439
Status: ready-for-dev

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

- [ ] Task 1: Backend — Create requests data model and migrations (AC: #2, #7)
  - [ ] Create migration: `requests` table with columns:
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
- [ ] Task 2: Backend — Create request API endpoints (AC: #1-#7)
  - [ ] Create `backend/src/routes/requests.routes.ts`
  - [ ] Create `backend/src/controllers/requests.controller.ts`
  - [ ] Create `backend/src/services/requests/request.service.ts`
  - [ ] `POST /api/requests` — submit new request (authenticated users)
  - [ ] `GET /api/requests/mine` — user's own requests (authenticated)
  - [ ] `GET /api/admin/requests` — triage queue (admin only)
  - [ ] `GET /api/admin/requests/:id` — single request detail (admin only)
  - [ ] `PUT /api/admin/requests/:id/approve` — approve + create Linear issue (admin only)
  - [ ] `PUT /api/admin/requests/:id/reject` — reject with reason (admin only)
  - [ ] `PUT /api/admin/requests/:id/merge` — link to existing item (admin only, Phase 2)
- [ ] Task 3: Backend — Linear issue creation on approval (AC: #5)
  - [ ] On approval, use `@linear/sdk` to create a new Linear issue
  - [ ] Map request fields: title → issue title, description → issue description
  - [ ] Add label based on category if provided
  - [ ] Add a note: "Submitted by {user.name} via Shareable IT Backlog"
  - [ ] Store the created `linear_issue_id` back on the request record
  - [ ] Trigger a sync so the new issue appears in the backlog
- [ ] Task 4: Backend — Duplicate detection endpoint (AC: #3)
  - [ ] `GET /api/requests/similar?title={searchText}` — returns top 5 similar backlog items
  - [ ] Use simple text search (ILIKE or ts_vector) against backlog item titles
  - [ ] Return `{ identifier, title, status }` for each match
- [ ] Task 5: Frontend — Create request submission form (AC: #1, #2, #3)
  - [ ] Create `frontend/src/features/requests/` feature directory
  - [ ] Create `frontend/src/features/requests/components/request-form.tsx`
  - [ ] Form fields: Title (required), Description (required, textarea), Business Impact (dropdown), Category (dropdown of labels), Urgency (dropdown)
  - [ ] Use Chakra UI form components with validation
  - [ ] Add debounced title search for duplicate detection (call `/api/requests/similar`)
  - [ ] Show similar items panel when matches found
  - [ ] On submit success: show confirmation toast and redirect to "My Requests"
- [ ] Task 6: Frontend — Create "My Requests" view (AC: #2, #7)
  - [ ] Create `frontend/src/features/requests/components/my-requests-page.tsx`
  - [ ] List user's requests with status badges (Submitted, Under Review, Approved, Rejected)
  - [ ] Show admin feedback/rejection reason when available
  - [ ] Show link to created Linear issue when approved
  - [ ] Add to `/my-requests` route
- [ ] Task 7: Frontend — Create admin triage queue (AC: #4, #5, #6)
  - [ ] Create `frontend/src/features/requests/components/triage-queue.tsx`
  - [ ] Add triage queue tab/section to admin page
  - [ ] List pending requests sorted by date
  - [ ] For each request: show details, approve button, reject button (with reason textarea)
  - [ ] Approve action: calls API, shows success with created issue link
  - [ ] Reject action: prompts for reason, calls API, shows confirmation
- [ ] Task 8: Frontend — Navigation and routing (AC: #1)
  - [ ] Add "Submit Request" button to `AppHeader` (prominent placement)
  - [ ] Add `/submit-request` route for the form
  - [ ] Add `/my-requests` route for user's request history
  - [ ] Add triage queue to admin section
- [ ] Task 9: Write tests (AC: #8)
  - [ ] Backend: Test CRUD operations on requests
  - [ ] Backend: Test approval creates Linear issue (mock Linear SDK)
  - [ ] Backend: Test rejection stores reason
  - [ ] Backend: Test duplicate detection returns similar items
  - [ ] Frontend: Test form renders all fields with validation
  - [ ] Frontend: Test duplicate detection shows similar items
  - [ ] Frontend: Test My Requests page lists requests with status
  - [ ] Frontend: Test triage queue shows pending requests
  - [ ] Frontend: Test approve/reject actions call correct APIs

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

### Debug Log References

### Completion Notes List

### File List
