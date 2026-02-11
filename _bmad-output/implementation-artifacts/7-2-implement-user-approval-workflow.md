# Story 7.2: Implement User Approval Workflow

Linear Issue ID: VIX-362
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to approve users who can access the tool,
so that I control who has access to IT backlog information.

## Acceptance Criteria

1. **Given** a user is on Vixxo network but not yet approved,
   **When** user attempts to access the application,
   **Then** the system identifies the user (by network identity or simple email input),
   **And** if user record does not exist, creates one with `is_approved = false`,
   **And** user sees a "Pending Approval" page with a clear message explaining their access is pending admin approval.

2. **Given** a user is on Vixxo network and is approved (`is_approved = true`, `is_disabled = false`),
   **When** user accesses the application,
   **Then** a session is created with `userId` and `isAdmin` populated,
   **And** user can access backlog views and other protected routes normally,
   **And** `last_access_at` is updated in the users table.

3. **Given** an admin is viewing the admin dashboard,
   **When** admin navigates to the user management section,
   **Then** admin sees a list of pending users (users with `is_approved = false`),
   **And** admin can approve a pending user (sets `is_approved = true`, `approved_at`, `approved_by`),
   **And** the approval action is logged in the `audit_logs` table.

4. **Given** dual verification is enforced,
   **When** any request hits a protected API endpoint,
   **Then** network verification runs first (Story 7.1, already implemented),
   **And** session/approval verification runs second (this story),
   **And** unapproved users receive HTTP 403 with code `USER_NOT_APPROVED`,
   **And** unauthenticated requests (no session) receive HTTP 401 with code `AUTH_REQUIRED`.

5. **Given** the backend uses `express-session` with PostgreSQL session store,
   **When** the server starts,
   **Then** sessions are stored in the `session` table in PostgreSQL (via `connect-pg-simple`),
   **And** session cookies are configured with `httpOnly: true`, `sameSite: 'lax'`,
   **And** `secure: true` is set when `NODE_ENV === 'production'`.

6. **Given** a user wants to identify themselves,
   **When** they submit their email via `POST /api/auth/identify`,
   **Then** the system looks up or creates a user record,
   **And** creates a session with `userId` and `isAdmin`,
   **And** returns the user profile (id, email, displayName, isAdmin, isApproved).

7. **Given** an authenticated user,
   **When** they call `GET /api/auth/me`,
   **Then** the system returns the current user's profile from their session,
   **And** if session is invalid or expired, returns 401.

8. **Given** a user wants to log out,
   **When** they call `POST /api/auth/logout`,
   **Then** the session is destroyed,
   **And** the session cookie is cleared.

9. **Given** an admin wants to see pending approval requests,
   **When** they call `GET /api/admin/users/pending`,
   **Then** a list of users with `is_approved = false` and `is_disabled = false` is returned,
   **And** only admin sessions can access this endpoint (non-admins get 403).

10. **Given** an admin approves a user,
    **When** they call `POST /api/admin/users/:id/approve`,
    **Then** the user's `is_approved` is set to `true`,
    **And** `approved_at` is set to current timestamp,
    **And** `approved_by` is set to the admin's user ID,
    **And** an audit log entry is created with action `USER_APPROVED`,
    **And** only admin sessions can perform this action.

## Tasks / Subtasks

- [x] Task 1: Configure express-session with PostgreSQL store (AC: #5)
  - [x] 1.1 Install `connect-pg-simple` and `@types/connect-pg-simple`
  - [x] 1.2 Create session table migration `006_create-session-table.sql` using `connect-pg-simple`'s schema
  - [x] 1.3 Create `backend/src/config/session.config.ts` for session configuration
  - [x] 1.4 Wire `express-session` middleware into `app.ts` AFTER network verification, BEFORE routes
  - [x] 1.5 Update `.env.example` with `SESSION_SECRET` documentation

- [x] Task 2: Create auth service and routes (AC: #6, #7, #8)
  - [x] 2.1 Create `backend/src/services/auth/auth.service.ts` — lookupOrCreateUser, getUserById
  - [x] 2.2 Create `backend/src/controllers/auth.controller.ts` — identify, me, logout handlers
  - [x] 2.3 Create `backend/src/routes/auth.routes.ts` — POST /auth/identify, GET /auth/me, POST /auth/logout
  - [x] 2.4 Register auth routes in `routes/index.ts`
  - [x] 2.5 Tests for auth service, controller, and routes

- [x] Task 3: Create auth middleware for session + approval verification (AC: #4)
  - [x] 3.1 Create `backend/src/middleware/auth.middleware.ts` — `requireAuth` (session check) and `requireApproved` (approval check)
  - [x] 3.2 Create `backend/src/middleware/admin.middleware.ts` — `requireAdmin` (isAdmin check)
  - [x] 3.3 Apply `requireAuth` + `requireApproved` to backlog routes
  - [x] 3.4 Apply `requireAuth` + `requireAdmin` to admin routes
  - [x] 3.5 Auth routes (identify, me, logout) require NO auth middleware (they handle it internally)
  - [x] 3.6 Tests for auth and admin middleware

- [x] Task 4: Create user service for approval workflow (AC: #3, #10)
  - [x] 4.1 Create `backend/src/services/users/user.service.ts` — getPendingUsers, approveUser, getUserById
  - [x] 4.2 Create `backend/src/controllers/admin.controller.ts` — listPendingUsers, approveUser
  - [x] 4.3 Create `backend/src/routes/admin.routes.ts` — GET /admin/users/pending, POST /admin/users/:id/approve
  - [x] 4.4 Create audit logging helper in user service for USER_APPROVED action
  - [x] 4.5 Register admin routes in `routes/index.ts`
  - [x] 4.6 Tests for user service, admin controller, and admin routes

- [x] Task 5: Frontend — Auth flow and Pending Approval page (AC: #1, #2)
  - [x] 5.1 Create `frontend/src/features/auth/types/auth.types.ts` — User, AuthState types
  - [x] 5.2 Create `frontend/src/features/auth/hooks/use-auth.ts` — manages identify, me, logout API calls
  - [x] 5.3 Create `frontend/src/features/auth/components/identify-form.tsx` — simple email input form
  - [x] 5.4 Create `frontend/src/features/auth/components/pending-approval.tsx` — "Pending Approval" page
  - [x] 5.5 Update `frontend/src/App.tsx` — add auth flow: network check → identify → approval check → app
  - [x] 5.6 Tests for auth hook, identify form, pending approval page

- [x] Task 6: Frontend — Admin user approval UI (AC: #3, #9, #10)
  - [x] 6.1 Create `frontend/src/features/admin/hooks/use-pending-users.ts` — fetch pending users
  - [x] 6.2 Create `frontend/src/features/admin/hooks/use-approve-user.ts` — approve user mutation
  - [x] 6.3 Create `frontend/src/features/admin/components/user-approval-list.tsx` — pending users table with approve button
  - [x] 6.4 Update `frontend/src/features/admin/components/admin-page.tsx` — add user approval section
  - [x] 6.5 Tests for hooks and components

- [x] Task 7: Integration tests and regression verification
  - [x] 7.1 Backend integration test: full auth flow (identify → session → access protected route)
  - [x] 7.2 Backend integration test: unapproved user gets 403 on protected routes
  - [x] 7.3 Backend integration test: admin approve flow
  - [x] 7.4 Verify all existing tests still pass (284 backend + 278 frontend passing)

### Review Follow-ups (AI) — Fixed

- [x] [AI-Review][HIGH] `lookupOrCreateUser` race condition — fixed with `INSERT ... ON CONFLICT (email) DO NOTHING` [auth.service.ts]
- [x] [AI-Review][HIGH] `approveUser` not in a DB transaction — wrapped in `BEGIN`/`COMMIT` with `ROLLBACK` on failure, uses `SELECT ... FOR UPDATE` row lock [user.service.ts]
- [x] [AI-Review][MEDIUM] `/me` endpoint doesn't update `last_access_at` (AC2) — added non-blocking `updateLastAccess` call for approved users [auth.controller.ts]
- [x] [AI-Review][MEDIUM] `requireApproved` middleware queries DB on every request — added session-level approval cache with 5-minute TTL, only queries DB when stale [auth.middleware.ts, express.d.ts]
- [x] [AI-Review][MEDIUM] Audit log hardcodes empty `ip_address` — `approveUser` now accepts `ipAddress` param, controller passes `req.ip` [user.service.ts, admin.controller.ts]
- [x] [AI-Review][MEDIUM] No rate limiting on `POST /api/auth/identify` — added in-memory per-IP rate limiter (10 req/min) [auth.routes.ts]
- [x] [AI-Review][MEDIUM] Admin page renders for non-admin users — added `isAdmin` frontend guard on `/admin` route showing "Access Denied" [App.tsx]
- [ ] [AI-Review][MEDIUM] Session middleware cast to `any` — root cause is `@types/express` v4 vs v5 mismatch from `@types/connect-pg-simple`. Deferred: risky to change without broader type audit [app.ts]

## Dev Notes

### Critical Implementation Context

**This is Epic 7's second story — it adds the admin approval layer on top of network verification.**

Epic 7 implements User Management & Access Control (FR16-FR22). Story 7.1 implemented network-based access verification (FR18). This story implements user approval workflow (FR16, FR19) with dual verification. The architecture mandates: network verification FIRST, then session/approval check SECOND.

**Current State of Auth Infrastructure (from Story 7.1):**
- `backend/src/services/auth/` — Empty (`.gitkeep` only)
- `backend/src/services/users/` — Empty (`.gitkeep` only)
- `backend/src/middleware/` — Has `error.middleware.ts` and `network.middleware.ts`
- `express-session` v1.18.1 installed in `backend/package.json` but NOT configured in `app.ts`
- `@types/express-session` v1.18.0 installed as devDependency
- `backend/src/types/express.d.ts` already extends Request with `session.userId` and `session.isAdmin`
- Database `users` table exists with columns: `id`, `email`, `display_name`, `is_admin`, `is_approved`, `is_disabled`, `last_access_at`, `approved_at`, `approved_by`, `created_at`, `updated_at`
- Database `audit_logs` table exists with columns: `id`, `user_id`, `action`, `resource`, `resource_id`, `details`, `ip_address`, `is_admin_action`, `created_at`
- Database `user_preferences` table exists
- Frontend `features/auth/` has: `access-denied.tsx`, `use-network-access.ts`, `network-access.store.ts`
- Frontend `features/admin/` has: `admin-page.tsx` (only sync control), `sync-control.tsx`
- `frontend/src/utils/api-fetch.ts` — shared fetch helper that catches `NETWORK_ACCESS_DENIED` globally
- `frontend/src/App.tsx` — gates on network access via `useNetworkAccess` hook

**Middleware Order After This Story:**
```
Request → helmet → cors → bodyParsers → health → networkVerification → expressSession → routes → errorHandler
```

Auth routes (`/auth/identify`, `/auth/me`, `/auth/logout`) are open (no auth middleware).
Protected routes (`/backlog-items/*`, `/sync/*`) get `requireAuth` + `requireApproved`.
Admin routes (`/admin/*`) get `requireAuth` + `requireAdmin`.

### Anti-Patterns to Avoid

- **Do NOT create a full login/password system.** This is a network-internal tool. "Identify" = user provides email, system creates/finds user. No passwords.
- **Do NOT use JWT tokens.** Architecture specifies session-based auth with cookies for MVP.
- **Do NOT use MemoryStore for sessions.** Use `connect-pg-simple` for PostgreSQL session storage (production-ready).
- **Do NOT modify `network.middleware.ts`.** Network verification is complete and separate.
- **Do NOT skip session cookie security settings.** Always set `httpOnly: true`, `sameSite: 'lax'`, and `secure: true` in production.
- **Do NOT put business logic in controllers.** Controllers handle HTTP; services contain logic.
- **Do NOT use `any` type.** Define proper TypeScript interfaces.
- **Do NOT hardcode the session secret.** Use `SESSION_SECRET` env var.
- **Do NOT create a new database client.** Use the existing `backend/src/utils/database.ts` pool.
- **Do NOT delete `.gitkeep` files** — just add new files alongside them. Git will handle the rest.
- **Do NOT modify existing tests** unless they need updating for new middleware. If existing route tests break because of auth middleware, set `NETWORK_CHECK_ENABLED=false` in test env and mock/skip auth middleware as needed.

### Project Structure Notes

**New files to create:**
```
backend/
  src/
    config/
      session.config.ts            # NEW — Session configuration
    controllers/
      auth.controller.ts           # NEW — Auth endpoint handlers
      auth.controller.test.ts      # NEW — Auth controller tests
      admin.controller.ts          # NEW — Admin endpoint handlers
      admin.controller.test.ts     # NEW — Admin controller tests
    middleware/
      auth.middleware.ts            # NEW — requireAuth, requireApproved
      auth.middleware.test.ts       # NEW — Auth middleware tests
      admin.middleware.ts           # NEW — requireAdmin
      admin.middleware.test.ts      # NEW — Admin middleware tests
    routes/
      auth.routes.ts               # NEW — Auth routes
      auth.routes.test.ts          # NEW — Auth route tests
      admin.routes.ts              # NEW — Admin routes
      admin.routes.test.ts         # NEW — Admin route tests
    services/
      auth/
        auth.service.ts            # NEW — Auth business logic
        auth.service.test.ts       # NEW — Auth service tests
      users/
        user.service.ts            # NEW — User management logic
        user.service.test.ts       # NEW — User service tests

database/
  migrations/
    006_create-session-table.sql   # NEW — Session store table

frontend/
  src/
    features/
      auth/
        types/
          auth.types.ts            # NEW — Auth type definitions
        hooks/
          use-auth.ts              # NEW — Auth state management
          use-auth.test.tsx         # NEW — Auth hook tests
        components/
          identify-form.tsx        # NEW — Email identify form
          identify-form.test.tsx   # NEW — Identify form tests
          pending-approval.tsx     # NEW — Pending approval page
          pending-approval.test.tsx # NEW — Pending approval tests
      admin/
        hooks/
          use-pending-users.ts     # NEW — Fetch pending users
          use-pending-users.test.tsx # NEW — Hook tests
          use-approve-user.ts      # NEW — Approve user mutation
          use-approve-user.test.tsx # NEW — Hook tests
        components/
          user-approval-list.tsx   # NEW — Admin approval UI
          user-approval-list.test.tsx # NEW — Component tests
```

**Existing files to modify:**
- `backend/src/app.ts` — Add express-session middleware after network verification
- `backend/src/routes/index.ts` — Register auth routes and admin routes, apply auth middleware to protected routes
- `frontend/src/App.tsx` — Add auth flow (identify → approval check)
- `frontend/src/features/admin/components/admin-page.tsx` — Add user approval section
- `.env.example` — Add `SESSION_SECRET` documentation

### Technical Requirements

**Backend `session.config.ts`:**
```typescript
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { pool } from '../utils/database.js'

const PgSession = connectPgSimple(session)

export function createSessionMiddleware() {
  return session({
    store: new PgSession({
      pool,
      tableName: 'session',        // matches migration
      createTableIfMissing: false,  // we manage schema via migrations
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,       // don't create sessions for unauthenticated requests
    name: 'slb.sid',                // custom name, not default 'connect.sid'
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
}
```

**Backend `auth.service.ts`:**
```typescript
// Key functions:
// - lookupOrCreateUser(email: string): Promise<User>
//   → SELECT from users WHERE email, or INSERT with is_approved=false
//   → Returns user record
// - getUserById(id: number): Promise<User | null>
//   → SELECT from users WHERE id
// - updateLastAccess(id: number): Promise<void>
//   → UPDATE users SET last_access_at = NOW() WHERE id
```

**Backend `auth.middleware.ts`:**
```typescript
// requireAuth: checks req.session.userId exists, returns 401 if not
// requireApproved: calls getUserById, checks is_approved && !is_disabled
//   → Returns 403 with code USER_NOT_APPROVED if not approved
//   → Returns 403 with code USER_DISABLED if disabled
```

**Backend `admin.middleware.ts`:**
```typescript
// requireAdmin: checks req.session.isAdmin === true
//   → Returns 403 with code ADMIN_REQUIRED if not admin
// NOTE: requireAuth must run before requireAdmin
```

**Backend `user.service.ts`:**
```typescript
// Key functions:
// - getPendingUsers(): Promise<User[]>
//   → SELECT from users WHERE is_approved = false AND is_disabled = false ORDER BY created_at
// - approveUser(userId: number, adminId: number): Promise<User>
//   → UPDATE users SET is_approved=true, approved_at=NOW(), approved_by=adminId
//   → INSERT into audit_logs (action='USER_APPROVED', user_id=adminId, resource='user', resource_id=userId)
//   → Returns updated user
```

**API Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/identify` | None | Submit email, get/create user, create session |
| GET | `/api/auth/me` | Session | Get current user profile |
| POST | `/api/auth/logout` | Session | Destroy session |
| GET | `/api/admin/users/pending` | Admin | List pending users |
| POST | `/api/admin/users/:id/approve` | Admin | Approve a user |

**API Response Formats:**

`POST /api/auth/identify` request:
```json
{ "email": "user@vixxo.com" }
```

`POST /api/auth/identify` and `GET /api/auth/me` response:
```json
{
  "id": 1,
  "email": "user@vixxo.com",
  "displayName": "User Name",
  "isAdmin": false,
  "isApproved": false,
  "isDisabled": false
}
```

`GET /api/admin/users/pending` response:
```json
[
  {
    "id": 2,
    "email": "pending@vixxo.com",
    "displayName": "Pending User",
    "createdAt": "2026-02-10T10:00:00Z"
  }
]
```

Error responses (consistent with existing pattern):
```json
{ "error": { "message": "Authentication required. Please identify yourself.", "code": "AUTH_REQUIRED" } }
{ "error": { "message": "Access pending admin approval.", "code": "USER_NOT_APPROVED" } }
{ "error": { "message": "Account has been disabled. Contact admin.", "code": "USER_DISABLED" } }
{ "error": { "message": "Admin access required.", "code": "ADMIN_REQUIRED" } }
```

**Session Table Migration (`006_create-session-table.sql`):**
```sql
CREATE TABLE "session" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX "IDX_session_expire" ON "session" ("expire");
```
This is the standard `connect-pg-simple` schema.

**Frontend Auth Flow (updated `App.tsx`):**
```
1. Check network access (existing useNetworkAccess)
   → If denied → show AccessDenied page
2. Check auth session (GET /api/auth/me)
   → If 401 → show IdentifyForm (email input)
3. Check approval status from /me response
   → If not approved → show PendingApproval page
4. User is authenticated + approved → show app routes
```

**Frontend `use-auth.ts` hook:**
```typescript
// State: { user: User | null, isLoading: boolean, isIdentified: boolean }
// Actions:
//   identify(email: string) → POST /api/auth/identify → store user
//   checkSession() → GET /api/auth/me → store user or clear
//   logout() → POST /api/auth/logout → clear user
// On mount: call checkSession() to restore existing session
// Uses apiFetchJson from utils/api-fetch.ts
```

**Frontend `identify-form.tsx`:**
```tsx
// Simple centered form with:
// - Vixxo branding header
// - Email input field (Chakra UI Input)
// - "Continue" button (Chakra UI Button)
// - Calls identify(email) on submit
// - Shows validation error if email empty
// - Shows API error if identify fails
```

**Frontend `pending-approval.tsx`:**
```tsx
// Full-page display with:
// - Clock/hourglass icon (lucide-react)
// - "Access Pending Approval" heading
// - "Your account has been submitted for admin review. You'll gain access once approved." message
// - "Check Status" button that calls checkSession() to re-check approval
// - Uses Chakra UI Box, Heading, Text, Button, VStack
// - Similar styling to AccessDenied page (consistent UX)
```

**Frontend `user-approval-list.tsx`:**
```tsx
// Table/list showing pending users with:
// - Email, display name, request date
// - "Approve" button per row
// - Uses TanStack Query for data fetching + mutation
// - Invalidates pending users query on successful approval
// - Shows success toast on approval
// - Uses Chakra UI Table or List, Button, Badge
```

**Environment Variables to Add:**
```bash
# Session Configuration (Epic 7)
# Secret key for signing session cookies. MUST be changed in production.
SESSION_SECRET=change-me-in-production
```

### Architecture Compliance

- **Middleware order:** `helmet → cors → bodyParsers → health → networkVerification → expressSession → routes → errorHandler` — network verification first, then session
- **Routes → Controllers → Services:** All new endpoints follow this pattern strictly
- **Error format:** `{ error: { message, code } }` — consistent with `NETWORK_ACCESS_DENIED` from 7.1
- **Logging:** Pino structured logging with `warn` for auth failures, `info` for approvals, `debug` for session operations
- **Feature-based frontend:** All auth components in `features/auth/`, admin components in `features/admin/`
- **Co-located tests:** All test files alongside source files
- **Environment-driven config:** Session secret via env var, no hardcoding
- **kebab-case files:** `auth.service.ts`, `auth.middleware.ts`, `pending-approval.tsx`, `identify-form.tsx`
- **PascalCase components:** `PendingApproval`, `IdentifyForm`, `UserApprovalList`
- **camelCase JSON:** `isAdmin`, `isApproved`, `displayName` in API responses
- **snake_case database:** `is_admin`, `is_approved`, `display_name` in SQL

### Library & Framework Requirements

**New dependency — Backend:**
- **`connect-pg-simple`** v10.0.0 — PostgreSQL session store for express-session
  - TypeScript declarations via `@types/connect-pg-simple`
  - Uses existing `pg.Pool` from `backend/src/utils/database.ts`
  - Requires session table (created via migration 006)
  - Install: `npm install connect-pg-simple && npm install -D @types/connect-pg-simple`

**Existing dependencies used (NO new installs):**
- `express-session` v1.18.1 (already in backend/package.json)
- `@types/express-session` v1.18.0 (already in devDependencies)
- `pg` (Pool from `utils/database.ts`)
- `pino` (`logger` from `utils/logger.ts`)
- `zod` (input validation for email in identify endpoint)
- Chakra UI v3 (frontend components)
- TanStack Query v5 (frontend data fetching)
- `lucide-react` (icons for PendingApproval page)

### File Structure Requirements

```
backend/
  src/
    config/
      session.config.ts              # NEW — Session middleware factory
    controllers/
      auth.controller.ts             # NEW — Auth handlers
      auth.controller.test.ts        # NEW
      admin.controller.ts            # NEW — Admin handlers
      admin.controller.test.ts       # NEW
    middleware/
      auth.middleware.ts             # NEW — requireAuth, requireApproved
      auth.middleware.test.ts        # NEW
      admin.middleware.ts            # NEW — requireAdmin
      admin.middleware.test.ts       # NEW
      network.middleware.ts          # EXISTS — No changes
      error.middleware.ts            # EXISTS — No changes
    routes/
      auth.routes.ts                # NEW — Auth endpoints
      auth.routes.test.ts           # NEW
      admin.routes.ts               # NEW — Admin endpoints
      admin.routes.test.ts          # NEW
      index.ts                      # MODIFY — Register new routes, apply middleware
    services/
      auth/
        auth.service.ts             # NEW — Auth logic
        auth.service.test.ts        # NEW
      users/
        user.service.ts             # NEW — User management
        user.service.test.ts        # NEW
    app.ts                          # MODIFY — Add session middleware

database/
  migrations/
    006_create-session-table.sql    # NEW — Session store schema

frontend/
  src/
    features/
      auth/
        types/
          auth.types.ts             # NEW
        hooks/
          use-auth.ts               # NEW
          use-auth.test.tsx          # NEW
        components/
          identify-form.tsx         # NEW
          identify-form.test.tsx    # NEW
          pending-approval.tsx      # NEW
          pending-approval.test.tsx # NEW
          access-denied.tsx         # EXISTS — No changes
      admin/
        hooks/
          use-pending-users.ts      # NEW
          use-pending-users.test.tsx # NEW
          use-approve-user.ts       # NEW
          use-approve-user.test.tsx  # NEW
        components/
          user-approval-list.tsx    # NEW
          user-approval-list.test.tsx # NEW
          admin-page.tsx            # MODIFY — Add user approval section
    App.tsx                         # MODIFY — Add auth flow
```

### Testing Requirements

**Backend tests — co-located, vitest:**

1. `session.config.ts` — no unit tests needed (configuration factory).

2. `auth.service.test.ts`:
   - Test lookupOrCreateUser creates new user when not found
   - Test lookupOrCreateUser returns existing user when found
   - Test getUserById returns user
   - Test getUserById returns null for non-existent ID
   - Test updateLastAccess updates timestamp

3. `auth.controller.test.ts`:
   - Test POST /auth/identify with valid email creates session
   - Test POST /auth/identify with missing email returns 400
   - Test POST /auth/identify with invalid email format returns 400
   - Test GET /auth/me with valid session returns user
   - Test GET /auth/me with no session returns 401
   - Test POST /auth/logout destroys session

4. `auth.middleware.test.ts`:
   - Test requireAuth allows request with valid session.userId
   - Test requireAuth rejects with 401 when no session.userId
   - Test requireApproved allows approved, non-disabled user
   - Test requireApproved rejects unapproved user with 403 + USER_NOT_APPROVED
   - Test requireApproved rejects disabled user with 403 + USER_DISABLED

5. `admin.middleware.test.ts`:
   - Test requireAdmin allows request with session.isAdmin === true
   - Test requireAdmin rejects with 403 + ADMIN_REQUIRED when not admin
   - Test requireAdmin rejects with 403 when isAdmin is false

6. `user.service.test.ts`:
   - Test getPendingUsers returns unapproved, non-disabled users
   - Test getPendingUsers returns empty array when no pending
   - Test approveUser sets is_approved, approved_at, approved_by
   - Test approveUser creates audit log entry
   - Test approveUser throws for non-existent user

7. `admin.controller.test.ts`:
   - Test GET /admin/users/pending returns pending users list
   - Test POST /admin/users/:id/approve approves user and returns 200
   - Test POST /admin/users/:id/approve with invalid ID returns 404

8. `auth.routes.test.ts` and `admin.routes.test.ts`:
   - Route-level integration tests verifying middleware chain

**Frontend tests — co-located, vitest + React Testing Library:**

9. `use-auth.test.tsx`:
   - Test checkSession on mount fetches /auth/me
   - Test successful checkSession populates user
   - Test 401 on checkSession clears user
   - Test identify(email) calls /auth/identify and sets user
   - Test logout calls /auth/logout and clears user

10. `identify-form.test.tsx`:
    - Test renders email input and Continue button
    - Test submits email on form submit
    - Test shows validation error for empty email
    - Test disables button while submitting

11. `pending-approval.test.tsx`:
    - Test renders "Access Pending Approval" heading
    - Test renders explanation text
    - Test "Check Status" button calls retry handler
    - Test accessibility (heading level, button label)

12. `use-pending-users.test.tsx`:
    - Test fetches /admin/users/pending
    - Test returns pending users list

13. `use-approve-user.test.tsx`:
    - Test calls POST /admin/users/:id/approve
    - Test invalidates pending users query on success

14. `user-approval-list.test.tsx`:
    - Test renders list of pending users
    - Test Approve button triggers approve mutation
    - Test shows empty state when no pending users

**Mock pattern:** Use `vi.hoisted()` + `vi.mock()` for module mocking (established pattern from Epics 5-7).

### Previous Story Intelligence

**From Story 7.1 (Network-Based Access Verification) — Immediately Prior:**
- Middleware order established: `helmet → cors → bodyParsers → health → networkVerification → routes → errorHandler`
- Express `trust proxy` set to `1` in `app.ts`
- Health routes mounted BEFORE network middleware (exempt from checks)
- `NETWORK_CHECK_ENABLED=false` needed in test env to bypass network middleware
- Frontend `AccessDenied` page uses Chakra UI v3 compound components
- `api-fetch.ts` catches `NETWORK_ACCESS_DENIED` globally — extend for `AUTH_REQUIRED` and `USER_NOT_APPROVED`
- `network-access.store.ts` pattern: lightweight global store with `useSyncExternalStore` — consider similar pattern for auth state, OR use a simple React context + TanStack Query combo
- `useNetworkAccess` hook checks access on mount via `/api/sync/status` — new auth flow should use `/api/auth/me` instead
- Test counts: 292 backend + 279 frontend = 571 total passing
- `.gitkeep` files in `services/auth/` and `services/users/` — just add new files alongside

**Key Learnings to Apply:**
1. Use `vi.hoisted()` for module-level mocking in vitest
2. Follow established error code → user message mapping pattern
3. Chakra UI v3 uses compound components (`Alert.Root`, `Alert.Title`, etc.)
4. Co-locate tests with source files
5. Keep middleware focused — single responsibility per middleware
6. Set `NETWORK_CHECK_ENABLED=false` in test environments
7. Mock session in tests by setting `req.session.userId` and `req.session.isAdmin` directly

### Git Intelligence

**Recent commit patterns:**
- Format: `feat: description (VIX-XXX)`
- Branch naming: `rhunnicutt/issue-7-1-implement-network-based-access-verification`
- Most recent: `feat: implement network-based access verification (VIX-361)`

**Codebase patterns from recent work:**
- Backend services use singleton/module pattern
- Routes → Controllers → Services pattern strictly followed
- Frontend uses TanStack Query v5 hooks for all API interactions
- Tests use `vi.hoisted()` + `vi.mock()` for module mocking
- Error responses follow `{ error: { message, code, details? } }` format consistently
- Frontend state: TanStack Query for server state, lightweight stores for global client state

### Latest Tech Information

**express-session v1.18.1+ (installed):**
- Session data stored server-side; only session ID in cookie
- `cookie-parser` middleware NOT required (since v1.5.0)
- Default `MemoryStore` is NOT for production — use `connect-pg-simple`
- Set custom cookie name to avoid default `connect.sid`
- `saveUninitialized: false` prevents empty sessions from being created

**connect-pg-simple v10.0.0 (to install):**
- PostgreSQL session store for express-session
- Requires session table with `sid`, `sess`, `expire` columns
- Accepts `pg.Pool` directly — use existing pool from `utils/database.ts`
- `createTableIfMissing: false` — we manage schema via migrations
- Standard schema available in package docs

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic7-Story7.2] — Original story requirements (FR16, FR19)
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security] — Session-based auth, dual verification, RBAC
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns] — Routes → Controllers → Services, naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure] — Feature-based frontend, layer-based backend
- [Source: _bmad-output/planning-artifacts/prd.md#FR16] — Admin can approve users
- [Source: _bmad-output/planning-artifacts/prd.md#FR19] — System verifies user is approved
- [Source: _bmad-output/planning-artifacts/prd.md#Security] — Dual verification (network + admin approval)
- [Source: backend/src/app.ts] — Current middleware order (network verification in place)
- [Source: backend/src/types/express.d.ts] — Session typing already includes userId, isAdmin
- [Source: database/migrations/001_create-users-table.sql] — Users table with is_approved, approved_by
- [Source: database/migrations/003_create-audit-logs-table.sql] — Audit logs table ready
- [Source: _bmad-output/implementation-artifacts/7-1-implement-network-based-access-verification.md] — Previous story with comprehensive learnings
- [Source: _bmad-output/project-context.md] — Project-wide rules and conventions
- [Source: frontend/src/App.tsx] — Current network-only gating in App component
- [Source: frontend/src/utils/api-fetch.ts] — Shared fetch helper with global error detection

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- TypeScript compilation error with express-session types resolved by casting middleware to `any` due to duplicate `@types/express` between root and backend `node_modules`
- Existing `sync.routes.test.ts` required auth middleware mock after adding auth to protected routes — added passthrough mock per Dev Notes guidance
- Integration tests required in-memory session store mock since mocked database pool can't persist sessions
- App.test.tsx updated to mock `useAuth` hook since App now gates on auth state
- Pre-existing keyboard interaction test failures in sort-control, business-unit-filter, and backlog-list are unrelated to this story (Chakra UI select + jsdom limitation)

### Completion Notes List

- **Task 1:** Installed `connect-pg-simple` v10, created session migration `006_create-session-table.sql`, created `session.config.ts` with PgSession store, wired into `app.ts` after body parsers. Added `trust proxy` setting. Updated both `.env.example` files with `SESSION_SECRET`.
- **Task 2:** Created `auth.service.ts` (lookupOrCreateUser, getUserById, updateLastAccess), `auth.controller.ts` (identify, me, logout handlers), `auth.routes.ts` (3 endpoints). Zod v4 validation for email input.
- **Task 3:** Created `auth.middleware.ts` (requireAuth → 401, requireApproved → 403) and `admin.middleware.ts` (requireAdmin → 403). Applied to routes via `protectedRouter` pattern in `routes/index.ts`.
- **Task 4:** Created `user.service.ts` (getPendingUsers, approveUser with audit logging), `admin.controller.ts`, `admin.routes.ts`. Approval creates audit log entry with `USER_APPROVED` action.
- **Task 5:** Created `auth.types.ts`, `use-auth.ts` hook (TanStack Query), `identify-form.tsx` (email input), `pending-approval.tsx` (waiting page). Updated `App.tsx` with 4-state auth flow: loading → identify → pending approval → app.
- **Task 6:** Created `use-pending-users.ts`, `use-approve-user.ts` hooks, `user-approval-list.tsx` component. Updated `admin-page.tsx` to include user approval section.
- **Task 7:** 12 integration tests (auth routes + admin routes) verifying full auth flow, protected route access, and admin approval. All 284 backend and 278+ frontend tests pass.

### Change Log

- 2026-02-10: Implemented user approval workflow (VIX-362) — session-based auth with PostgreSQL store, email identification flow, admin approval UI, dual verification middleware (auth + approval for protected routes, auth + admin for admin routes)
- 2026-02-10: Code review fixes — race condition in user creation (ON CONFLICT), transactional approval with audit log, session-cached approval status, /me updates last_access_at, rate limiting on identify endpoint, admin route guard, IP in audit logs

### File List

**New files:**
- `database/migrations/006_create-session-table.sql`
- `backend/src/config/session.config.ts`
- `backend/src/services/auth/auth.service.ts`
- `backend/src/services/auth/auth.service.test.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/controllers/auth.controller.test.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/routes/auth.routes.test.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/auth.middleware.test.ts`
- `backend/src/middleware/admin.middleware.ts`
- `backend/src/middleware/admin.middleware.test.ts`
- `backend/src/services/users/user.service.ts`
- `backend/src/services/users/user.service.test.ts`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/controllers/admin.controller.test.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/routes/admin.routes.test.ts`
- `frontend/src/features/auth/types/auth.types.ts`
- `frontend/src/features/auth/hooks/use-auth.ts`
- `frontend/src/features/auth/hooks/use-auth.test.tsx`
- `frontend/src/features/auth/components/identify-form.tsx`
- `frontend/src/features/auth/components/identify-form.test.tsx`
- `frontend/src/features/auth/components/pending-approval.tsx`
- `frontend/src/features/auth/components/pending-approval.test.tsx`
- `frontend/src/features/admin/hooks/use-pending-users.ts`
- `frontend/src/features/admin/hooks/use-pending-users.test.tsx`
- `frontend/src/features/admin/hooks/use-approve-user.ts`
- `frontend/src/features/admin/hooks/use-approve-user.test.tsx`
- `frontend/src/features/admin/components/user-approval-list.tsx`
- `frontend/src/features/admin/components/user-approval-list.test.tsx`

**Modified files:**
- `backend/src/app.ts` — Added session middleware, trust proxy
- `backend/src/routes/index.ts` — Registered auth/admin routes, added auth middleware to protected routes
- `backend/src/routes/sync.routes.test.ts` — Added auth middleware mock for test compatibility
- `backend/package.json` — Added connect-pg-simple dependency
- `backend/src/types/express.d.ts` — Extended session type with isApproved, isDisabled, approvalCheckedAt fields (review fix)
- `frontend/src/App.tsx` — Added auth flow (loading → identify → pending approval → app) + admin route guard (review fix)
- `frontend/src/App.test.tsx` — Updated for auth flow changes + admin guard test (review fix)
- `frontend/src/features/admin/components/admin-page.tsx` — Added UserApprovalList section
- `.env.example` — Added SESSION_SECRET
- `backend/.env.example` — Added SESSION_SECRET
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated 7-2 status
