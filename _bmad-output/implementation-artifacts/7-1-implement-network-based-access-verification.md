# Story 7.1: Implement Network-Based Access Verification

Linear Issue ID: VIX-361
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system,
I want to verify users are on Vixxo network before allowing access,
so that only authorized network users can access the tool.

## Acceptance Criteria

1. **Given** a user attempts to access any API endpoint (except health check),
   **When** their request originates from an IP address outside the configured Vixxo network ranges,
   **Then** the request is rejected with HTTP 403 status,
   **And** the response includes a user-friendly error message: "Access denied — Vixxo network required."

2. **Given** a user attempts to access any API endpoint,
   **When** their request originates from an IP address within the configured Vixxo network ranges (including VPN),
   **Then** the request proceeds to the next middleware/route handler normally.

3. **Given** network verification is configured with CIDR ranges via environment variable,
   **When** the server starts,
   **Then** the allowed network ranges are parsed and validated,
   **And** invalid CIDR entries are logged as warnings and skipped.

4. **Given** network verification is disabled via environment variable (development mode),
   **When** any request is made,
   **Then** all requests are allowed through regardless of source IP,
   **And** a debug-level log message indicates network verification is bypassed.

5. **Given** the application is running behind a reverse proxy or load balancer,
   **When** a request arrives,
   **Then** the system uses the `X-Forwarded-For` header (with Express `trust proxy` configured) to determine the real client IP,
   **And** the client IP is logged at debug level for troubleshooting.

6. **Given** a user on an external network attempts to access the frontend,
   **When** any API call returns 403 with error code `NETWORK_ACCESS_DENIED`,
   **Then** the frontend displays an "Access Denied" page with a clear message explaining Vixxo network/VPN is required,
   **And** the page provides guidance on how to connect to the Vixxo network.

## Tasks / Subtasks

- [x] Task 1: Add network verification environment variables and configuration (AC: #3, #4)
  - [x] 1.1 Add `ALLOWED_NETWORKS` env var to `.env.example` with CIDR notation documentation
  - [x] 1.2 Add `NETWORK_CHECK_ENABLED` env var (default: `true` in production, `false` in development)
  - [x] 1.3 Create `backend/src/config/network.config.ts` to parse and validate CIDR ranges
  - [x] 1.4 Validate CIDR format on startup, log warnings for invalid entries

- [x] Task 2: Implement network verification middleware (AC: #1, #2, #4, #5)
  - [x] 2.1 Create `backend/src/middleware/network.middleware.ts`
  - [x] 2.2 Install `ip-cidr` package for CIDR range matching
  - [x] 2.3 Implement `networkVerificationMiddleware` that checks client IP against allowed ranges
  - [x] 2.4 Handle `X-Forwarded-For` header parsing with Express `trust proxy` setting
  - [x] 2.5 Return 403 with `{ error: { message, code: 'NETWORK_ACCESS_DENIED' } }` for denied IPs
  - [x] 2.6 Bypass check when `NETWORK_CHECK_ENABLED=false` with debug log
  - [x] 2.7 Log denied access attempts at `warn` level with source IP

- [x] Task 3: Integrate middleware into Express app (AC: #1, #2, #5)
  - [x] 3.1 Add `trust proxy` setting to Express app (`app.set('trust proxy', true)`)
  - [x] 3.2 Mount network middleware AFTER helmet/cors but BEFORE routes in `app.ts`
  - [x] 3.3 Exclude `/api/health` endpoint from network verification (health checks must be accessible)
  - [x] 3.4 Ensure existing SYNC_TRIGGER_TOKEN auth still works for sync endpoints (network check happens first)

- [x] Task 4: Create frontend Access Denied page (AC: #6)
  - [x] 4.1 Create `frontend/src/features/auth/components/access-denied.tsx` component
  - [x] 4.2 Display clear "Access Denied — Vixxo Network Required" heading
  - [x] 4.3 Include guidance text on connecting to Vixxo VPN
  - [x] 4.4 Style with Chakra UI using Vixxo brand colors (Red/warning palette)
  - [x] 4.5 Add a "Retry" button that re-checks access

- [x] Task 5: Add frontend 403 detection and Access Denied routing (AC: #6)
  - [x] 5.1 Create `frontend/src/features/auth/hooks/use-network-access.ts` hook
  - [x] 5.2 Update API client or TanStack Query global error handler to detect 403 + `NETWORK_ACCESS_DENIED`
  - [x] 5.3 Add `networkAccessDenied` state to auth context or create lightweight network access context
  - [x] 5.4 Conditionally render Access Denied page when network access is denied

- [x] Task 6: Tests for all changes
  - [x] 6.1 Backend: Test network middleware allows IPs within CIDR ranges
  - [x] 6.2 Backend: Test network middleware blocks IPs outside CIDR ranges with 403
  - [x] 6.3 Backend: Test bypass mode when `NETWORK_CHECK_ENABLED=false`
  - [x] 6.4 Backend: Test health endpoint is excluded from network check
  - [x] 6.5 Backend: Test `X-Forwarded-For` header parsing
  - [x] 6.6 Backend: Test CIDR config parsing with valid and invalid entries
  - [x] 6.7 Frontend: Test AccessDenied component renders correctly
  - [x] 6.8 Frontend: Test 403 network error triggers Access Denied display
  - [x] 6.9 Frontend: Test retry button re-checks network access

## Dev Notes

### Critical Implementation Context

**This is Epic 7's first story — it establishes the authentication/access control foundation.**

Epic 7 implements User Management & Access Control (FR16-FR22). Story 7.1 focuses exclusively on **network-based access verification** (FR18), which is the primary security layer. The secondary layer (admin approval, FR19) is Story 7.2. The architecture mandates that network verification happens BEFORE any other authentication checks.

**Current State of Auth Infrastructure:**
- `backend/src/services/auth/` — Empty (`.gitkeep` only)
- `backend/src/services/users/` — Empty (`.gitkeep` only)
- `backend/src/middleware/` — Only `error.middleware.ts` exists
- `express-session` is installed in `package.json` but NOT configured in `app.ts`
- `backend/src/types/express.d.ts` already extends Request with `session.userId` and `session.isAdmin`
- Database migration `001_create-users-table.sql` exists with `is_admin`, `is_approved`, `is_disabled` columns
- Frontend `features/auth/` directory structure exists with `.gitkeep` placeholders
- Temporary `SYNC_TRIGGER_TOKEN` auth exists for sync endpoints (will be superseded by proper auth in 7.2+)

**Network Verification Scope — Keep it Focused:**
This story implements ONLY the IP-based network check. It does NOT:
- Set up `express-session` (that's Story 7.2)
- Implement user login/registration (Story 7.2)
- Create the admin dashboard (Story 7.3)
- Add user management (Story 7.4)
- Add session-based authentication middleware (Story 7.2)

**Design Decision: Separate middleware file, not part of auth middleware.**
Create `network.middleware.ts` as a standalone middleware. The auth middleware (Story 7.2) will be separate and run AFTER network verification. This keeps concerns isolated:
```
Request → helmet → cors → networkVerification → [auth (7.2)] → routes → errorHandler
```

**Design Decision: CIDR-based IP checking, not hostname-based.**
Use CIDR notation (e.g., `10.0.0.0/8`, `172.16.0.0/12`) for network ranges. This is the standard approach for corporate VPN and internal network verification. The `ip-cidr` library provides lightweight, typed CIDR matching.

**Design Decision: Environment-variable-driven configuration.**
Network ranges MUST be configurable via `ALLOWED_NETWORKS` env var, not hardcoded. This supports:
- Different networks in dev/staging/prod
- Easy addition of new VPN ranges without code changes
- Development bypass (`NETWORK_CHECK_ENABLED=false`)

**Design Decision: Health endpoint excluded.**
`/api/health` MUST remain accessible without network verification. Health checks from monitoring tools, load balancers, and orchestrators need unrestricted access.

**Trust Proxy Consideration:**
When running behind a reverse proxy (nginx, AWS ALB, Azure App Gateway), Express needs `app.set('trust proxy', true)` to read the real client IP from `X-Forwarded-For`. Without this, `req.ip` returns the proxy's IP, making network verification useless. This setting is safe for internal deployment where the proxy is trusted.

### Anti-Patterns to Avoid

- **Do NOT hardcode IP ranges** in source code. Use environment variables exclusively.
- **Do NOT use `req.connection.remoteAddress`** directly. Use `req.ip` which respects `trust proxy` setting.
- **Do NOT block health checks.** Load balancers and monitoring tools need unrestricted access.
- **Do NOT install `express-ipfilter`** — it's heavyweight for our needs. The lightweight `ip-cidr` library (CIDR matching only) is sufficient and has better TypeScript support.
- **Do NOT set up express-session in this story.** Session management is Story 7.2's scope.
- **Do NOT create user service or user routes.** Those are Stories 7.2-7.4.
- **Do NOT modify existing sync trigger token auth.** It continues working as-is; network check is an additional layer that runs before it.
- **Do NOT use `any` type.** Define proper TypeScript interfaces for configuration and middleware.

### Project Structure Notes

**New files to create:**
- `backend/src/config/network.config.ts` — CIDR range parsing and validation
- `backend/src/middleware/network.middleware.ts` — Network verification middleware
- `backend/src/middleware/network.middleware.test.ts` — Middleware tests
- `backend/src/config/network.config.test.ts` — Config parsing tests
- `frontend/src/features/auth/components/access-denied.tsx` — Access Denied page
- `frontend/src/features/auth/components/access-denied.test.tsx` — Component tests
- `frontend/src/features/auth/hooks/use-network-access.ts` — Network access hook
- `frontend/src/features/auth/hooks/use-network-access.test.ts` — Hook tests

**Existing files to modify:**
- `backend/src/app.ts` — Add `trust proxy` setting and mount network middleware
- `.env.example` — Add `ALLOWED_NETWORKS` and `NETWORK_CHECK_ENABLED` documentation
- `backend/src/routes/index.ts` — May need adjustment to exclude health from network check

**No files to delete.**

### Technical Requirements

**Backend `network.config.ts`:**
```typescript
import IPCIDR from 'ip-cidr'
import { logger } from '../utils/logger.js'

export interface NetworkConfig {
  enabled: boolean
  allowedRanges: IPCIDR[]
  rawRanges: string[]
}

export function loadNetworkConfig(): NetworkConfig {
  const enabled = process.env.NETWORK_CHECK_ENABLED !== 'false'
  const rawRanges = (process.env.ALLOWED_NETWORKS ?? '')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean)

  const allowedRanges: IPCIDR[] = []
  for (const range of rawRanges) {
    if (IPCIDR.isValidCIDR(range)) {
      allowedRanges.push(new IPCIDR(range))
    } else {
      logger.warn({ range }, 'Invalid CIDR range in ALLOWED_NETWORKS — skipping')
    }
  }

  if (enabled && allowedRanges.length === 0) {
    logger.warn('NETWORK_CHECK_ENABLED is true but no valid ALLOWED_NETWORKS configured — all requests will be denied')
  }

  return { enabled, allowedRanges, rawRanges }
}
```

**Backend `network.middleware.ts`:**
```typescript
import type { Request, Response, NextFunction } from 'express'
import { loadNetworkConfig, type NetworkConfig } from '../config/network.config.js'
import { logger } from '../utils/logger.js'

let networkConfig: NetworkConfig | null = null

function getConfig(): NetworkConfig {
  if (!networkConfig) {
    networkConfig = loadNetworkConfig()
  }
  return networkConfig
}

export function networkVerificationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig()

  if (!config.enabled) {
    logger.debug('Network verification bypassed (NETWORK_CHECK_ENABLED=false)')
    next()
    return
  }

  const clientIp = req.ip ?? req.socket.remoteAddress ?? ''
  logger.debug({ clientIp }, 'Network verification check')

  // Handle IPv4-mapped IPv6 (e.g., ::ffff:10.0.0.1 → 10.0.0.1)
  const normalizedIp = clientIp.startsWith('::ffff:') ? clientIp.slice(7) : clientIp

  const isAllowed = config.allowedRanges.some(cidr => cidr.contains(normalizedIp))

  if (!isAllowed) {
    logger.warn({ clientIp: normalizedIp }, 'Network access denied — IP not in allowed ranges')
    res.status(403).json({
      error: {
        message: 'Access denied — Vixxo network required. Please connect to the Vixxo VPN and try again.',
        code: 'NETWORK_ACCESS_DENIED',
      },
    })
    return
  }

  next()
}

/** Reset cached config — for testing only */
export function resetNetworkConfig(): void {
  networkConfig = null
}
```

**Frontend `access-denied.tsx`:**
```tsx
// Renders full-page Access Denied with Vixxo branding
// Shows heading, explanation, VPN connection guidance, and Retry button
// Uses Chakra UI Box, Heading, Text, Button, VStack, Icon
```

**Frontend `use-network-access.ts`:**
```typescript
// Lightweight hook that:
// 1. Makes a HEAD or GET request to /api/health (or a lightweight /api/auth/check endpoint)
//    to test if the API is reachable
// 2. If any API call returns 403 + NETWORK_ACCESS_DENIED, sets networkDenied = true
// 3. Exposes { isNetworkDenied, isChecking, retry } for the App to conditionally render
```

**Environment Variables to Add:**
```bash
# Network Access Control (Epic 7)
# Comma-separated CIDR ranges for allowed networks (e.g., 10.0.0.0/8,172.16.0.0/12,192.168.0.0/16)
# When NETWORK_CHECK_ENABLED=true, only IPs within these ranges can access the API.
ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
# Set to false to disable network verification (development). Default: true in production.
NETWORK_CHECK_ENABLED=false
```

### Architecture Compliance

- **Middleware order:** `helmet → cors → networkVerification → routes → errorHandler` — matches architecture specification
- **Error format:** `{ error: { message, code } }` — consistent with existing error middleware pattern
- **Logging:** Pino structured logging with `warn` for denied access, `debug` for IP checks
- **Feature-based organization:** Frontend auth components in `features/auth/`
- **Co-located tests:** All test files alongside source files
- **Environment-driven config:** All network ranges via env vars, no hardcoding
- **Routes → Controllers → Services:** No new routes/controllers needed for this story (middleware only)
- **kebab-case files:** `network.middleware.ts`, `network.config.ts`, `access-denied.tsx`

### Library & Framework Requirements

**New dependency — Backend:**
- **`ip-cidr`** — Lightweight CIDR range matching library
  - TypeScript declarations included
  - Uses native BigInt (ES2020+, supported in Node 20+)
  - Key API: `new IPCIDR('10.0.0.0/8').contains('10.1.2.3')` → `true`
  - Install: `npm install ip-cidr` (add to backend workspace)
  - Latest stable: verify at install time

**No new frontend dependencies.** Access Denied page uses existing Chakra UI components.

**Existing dependencies used:**
- Express (`req.ip`, `app.set('trust proxy')`)
- Pino (`logger.warn`, `logger.debug`)
- Chakra UI (frontend Access Denied page)
- TanStack Query (error handling hooks)

### File Structure Requirements

```
backend/
  src/
    config/
      network.config.ts          # NEW — CIDR range parsing
      network.config.test.ts     # NEW — Config tests
    middleware/
      network.middleware.ts      # NEW — Network verification
      network.middleware.test.ts # NEW — Middleware tests
      error.middleware.ts        # EXISTS — No changes
    app.ts                       # MODIFY — Add trust proxy + network middleware

frontend/
  src/
    features/
      auth/
        components/
          access-denied.tsx      # NEW — Access Denied page
          access-denied.test.tsx # NEW — Component tests
        hooks/
          use-network-access.ts      # NEW — Network access hook
          use-network-access.test.ts # NEW — Hook tests
```

### Testing Requirements

**Backend tests — co-located, vitest:**

1. `network.config.test.ts`:
   - Test valid CIDR ranges are parsed correctly
   - Test invalid CIDR entries are skipped with warning
   - Test empty `ALLOWED_NETWORKS` produces empty ranges
   - Test `NETWORK_CHECK_ENABLED=false` returns `enabled: false`
   - Test mixed valid/invalid entries (valid parsed, invalid skipped)

2. `network.middleware.test.ts`:
   - Test allowed IP within CIDR range → `next()` called, no response sent
   - Test denied IP outside all CIDR ranges → 403 with `NETWORK_ACCESS_DENIED` code
   - Test bypass when `NETWORK_CHECK_ENABLED=false` → `next()` called regardless of IP
   - Test IPv4-mapped IPv6 address normalization (`::ffff:10.0.0.1`)
   - Test `X-Forwarded-For` is used when `trust proxy` is enabled (via `req.ip`)
   - Test localhost/loopback (`127.0.0.1`) behavior based on configuration
   - Test multiple CIDR ranges (first match wins)
   - Test warning logged for denied access

**Frontend tests — co-located, vitest + React Testing Library:**

3. `access-denied.test.tsx`:
   - Test renders "Access Denied" heading
   - Test renders Vixxo network/VPN guidance text
   - Test Retry button exists and calls retry handler
   - Test accessibility (heading levels, button labels)

4. `use-network-access.test.ts`:
   - Test initial state is `isChecking: true`
   - Test successful API response → `isNetworkDenied: false`
   - Test 403 NETWORK_ACCESS_DENIED response → `isNetworkDenied: true`
   - Test retry function resets state and re-checks

**Mock pattern:** Use `vi.hoisted()` + `vi.mock()` for module mocking (established pattern from Epic 6).

### Previous Story Intelligence

**From Story 6.6 (Handle Partial Sync Failures) — Most Recent:**
- `vi.hoisted()` required for vitest module mocking — follow this pattern
- Error classification taxonomy with `SYNC_ERROR_CODES` — follow this pattern for `NETWORK_ACCESS_DENIED`
- Frontend error message mapping via `sync-error-messages.ts` — consider if network errors need similar mapping
- Chakra UI v3 compound components: `Alert.Root`, `Alert.Title`, `Alert.Description` — use for access denied styling
- All existing test fixtures need null defaults for new fields — be careful with test fixture updates
- Test counts: ~505 backend, ~264 frontend — all must continue passing

**From Story 6.5 (API Unavailability):**
- Graceful degradation pattern: show cached data when API fails
- Frontend uses `keepPreviousData` / stale-while-revalidate
- "Refresh data" button invalidates TanStack Query cache
- Platform dependency (`@swc/core-darwin-arm64`) was cleaned up — don't re-introduce

**From Story 6.4 (Sync Error Handling):**
- Error code pattern: define codes as constants, map to user messages
- Backend error classification is backend-only; frontend maps codes to user messages
- `errorCode` field in API responses — `NETWORK_ACCESS_DENIED` follows same pattern

**Key Learnings to Apply:**
1. Always add new fields as `null` in existing test fixtures to avoid TypeScript errors
2. Use `vi.hoisted()` for module-level mocking in vitest
3. Follow established error code → user message mapping pattern
4. Chakra UI v3 uses compound components (Box, VStack, etc.)
5. Co-locate tests with source files
6. Keep middleware focused — single responsibility

### Git Intelligence

**Recent commit patterns:**
- Format: `feat: description (VIX-XXX)`
- Branch naming: `rhunnicutt/issue-7-1-implement-network-based-access-verification`
- Most recent work is on Epic 6 (sync features)
- Current branch: `rhunnicutt/issue-6-6-handle-partial-sync-failures`

**Codebase patterns from recent work:**
- Backend services use singleton pattern (e.g., `syncService`)
- Routes → Controllers → Services pattern strictly followed
- Frontend uses TanStack Query v5 hooks for all API interactions
- Tests use `vi.hoisted()` + `vi.mock()` for module mocking
- Error responses follow `{ error: { message, code, details? } }` format consistently

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Epic7-Story7.1] — Original story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security] — Auth architecture: session-based, dual verification
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns] — Middleware order, error format, naming conventions
- [Source: _bmad-output/planning-artifacts/prd.md#Security] — NFR: Network-based access + admin approval dual verification
- [Source: _bmad-output/planning-artifacts/prd.md#FR18] — FR18: System verifies user is on Vixxo network
- [Source: backend/src/app.ts] — Current middleware order: helmet → cors → bodyParsers → routes → error
- [Source: backend/src/middleware/error.middleware.ts] — Existing error format and middleware pattern
- [Source: backend/src/types/express.d.ts] — Express Request type extensions (session already typed)
- [Source: database/migrations/001_create-users-table.sql] — User table schema ready
- [Source: _bmad-output/implementation-artifacts/6-6-handle-partial-sync-failures.md] — Previous story learnings
- [Source: _bmad-output/project-context.md] — Project-wide rules and conventions

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- No HALT conditions triggered during implementation
- All tests passed on first attempt after implementation (no debugging required)
- Sync routes integration test required `NETWORK_CHECK_ENABLED=false` env var to avoid network middleware blocking test requests

### Completion Notes List

- **Task 1:** Created `network.config.ts` with CIDR parsing via `ip-cidr` library. Added `ALLOWED_NETWORKS` and `NETWORK_CHECK_ENABLED` env vars to `.env.example`. 14 unit tests for config parsing, validation, and containment checks.
- **Task 2:** Created `network.middleware.ts` as standalone middleware. Implements IP check against CIDR ranges, IPv4-mapped IPv6 normalization, bypass mode, proper logging (warn for denied, debug for checks). Config is lazily loaded and cached. 13 unit tests.
- **Task 3:** Updated `app.ts` with `trust proxy` setting, mounted health routes BEFORE network middleware (exempt from check), then network middleware, then protected routes. Updated `routes/index.ts` to remove health routes (now mounted separately). Fixed sync routes integration test by adding `NETWORK_CHECK_ENABLED=false` env var.
- **Task 4:** Created `AccessDenied` component with Chakra UI v3, ShieldX icon, Vixxo branding (red palette), VPN guidance text, and Retry button. 7 tests including accessibility (heading level, alert role).
- **Task 5:** Created `useNetworkAccess` hook that checks `/api/sync/status` on mount to detect 403 NETWORK_ACCESS_DENIED. Integrated into `App.tsx` to conditionally render AccessDenied page. Updated `App.test.tsx` to mock the hook. 7 tests for hook including retry behavior.
- **Task 6:** Added integration test (`network-integration.test.ts`) verifying health endpoint is accessible while other routes are blocked. Full regression suite: 536 backend + 279 frontend = 815 tests passing.

### Implementation Plan

- Followed red-green-refactor cycle for each task
- Network middleware is standalone (separate from future auth middleware per architecture)
- Middleware order: `helmet → cors → bodyParsers → health → networkVerification → routes → errorHandler`
- Health endpoint exempt from network check by mounting before middleware
- Frontend uses lightweight global network-access store + `useNetworkAccess` hook so *any* API call can trigger Access Denied
- No new frontend dependencies (uses existing Chakra UI + lucide-react)
- Single new backend dependency: `ip-cidr` for CIDR range matching

### File List

**New files:**
- `_bmad-output/implementation-artifacts/6-5-handle-linear-api-unavailability.md` — (Unrelated) prior story artifact present in working tree
- `_bmad-output/implementation-artifacts/6-6-handle-partial-sync-failures.md` — (Unrelated) prior story artifact present in working tree
- `_bmad-output/implementation-artifacts/7-1-implement-network-based-access-verification.md` — Story file
- `backend/src/config/network.config.ts` — CIDR range parsing and validation
- `backend/src/config/network.config.test.ts` — 14 unit tests for config
- `backend/src/middleware/network.middleware.ts` — Network verification middleware
- `backend/src/middleware/network.middleware.test.ts` — 13 unit tests for middleware
- `backend/src/middleware/network-integration.test.ts` — 3 integration tests (health exclusion, denied routes)
- `frontend/src/features/auth/components/access-denied.tsx` — Access Denied page component
- `frontend/src/features/auth/components/access-denied.test.tsx` — 7 component tests
- `frontend/src/features/auth/hooks/use-network-access.ts` — Network access detection hook
- `frontend/src/features/auth/hooks/use-network-access.test.tsx` — 7 hook tests
- `frontend/src/features/auth/network-access.store.ts` — Global network access state store
- `frontend/src/utils/api-fetch.ts` — Shared API fetch helper (captures NETWORK_ACCESS_DENIED)

**Modified files:**
- `.env.example` — Added ALLOWED_NETWORKS and NETWORK_CHECK_ENABLED documentation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status updates
- `backend/package.json` — Added `ip-cidr` dependency
- `backend/src/app.ts` — Added trust proxy, health route before network middleware, network middleware
- `backend/src/config/env.ts` — Ensure dotenv loaded early (ESM)
- `backend/src/controllers/sync.controller.test.ts` — Updated tests for sync/status behavior
- `backend/src/routes/backlog.routes.test.ts` — Updated tests for backlog routes
- `backend/src/routes/index.ts` — Removed health route (now mounted separately in app.ts)
- `backend/src/routes/sync.routes.test.ts` — Updated env handling for network verification in tests
- `backend/src/services/backlog/backlog.service.ts` — Backlog service updates
- `backend/src/services/backlog/backlog.service.test.ts` — Backlog service tests updates
- `backend/src/services/sync/linear-transformers.ts` — Sync transformers updates
- `backend/src/services/sync/linear-transformers.test.ts` — Sync transformers tests updates
- `backend/src/services/sync/sync-error-classifier.ts` — Sync error classifier updates
- `backend/src/services/sync/sync-error-classifier.test.ts` — Sync error classifier tests updates
- `backend/src/services/sync/sync.service.ts` — Sync service updates
- `backend/src/services/sync/sync.service.test.ts` — Sync service tests updates
- `backend/src/types/api.types.ts` — API types updates
- `backend/src/types/linear-entities.schemas.ts` — Linear schemas updates
- `backend/src/types/linear-entities.types.ts` — Linear types updates
- `frontend/src/App.tsx` — Added useNetworkAccess hook + AccessDenied conditional rendering
- `frontend/src/App.test.tsx` — Mock useNetworkAccess hook for test isolation
- `frontend/src/features/admin/components/sync-control.tsx` — Admin sync control updates
- `frontend/src/features/admin/components/sync-control.test.tsx` — Admin sync control tests updates
- `frontend/src/features/admin/hooks/use-sync-status.ts` — Admin sync status hook updates
- `frontend/src/features/admin/hooks/use-sync-status.test.tsx` — Admin sync status hook tests updates
- `frontend/src/features/admin/hooks/use-sync-trigger.ts` — Admin sync trigger hook updates
- `frontend/src/features/admin/hooks/use-sync-trigger.test.tsx` — Admin sync trigger hook tests updates
- `frontend/src/features/backlog/components/backlog-item-card.test.tsx` — Backlog item card tests updates
- `frontend/src/features/backlog/components/backlog-list.tsx` — Backlog list updates
- `frontend/src/features/backlog/components/backlog-list.test.tsx` — Backlog list tests updates
- `frontend/src/features/backlog/components/business-unit-filter.test.tsx` — Business unit filter tests updates
- `frontend/src/features/backlog/components/item-detail-modal.test.tsx` — Item detail modal tests updates
- `frontend/src/features/backlog/components/sort-control.test.tsx` — Sort control tests updates
- `frontend/src/features/backlog/components/sync-status-indicator.tsx` — Sync status indicator updates
- `frontend/src/features/backlog/components/sync-status-indicator.test.tsx` — Sync status indicator tests updates
- `frontend/src/features/backlog/hooks/use-backlog-item-detail.ts` — Backlog item detail hook updates
- `frontend/src/features/backlog/hooks/use-backlog-item-detail.test.tsx` — Backlog item detail hook tests updates
- `frontend/src/features/backlog/hooks/use-backlog-items.ts` — Backlog items hook updates
- `frontend/src/features/backlog/hooks/use-backlog-items.test.tsx` — Backlog items hook tests updates
- `frontend/src/features/backlog/hooks/use-sync-status.ts` — Backlog sync status hook updates
- `frontend/src/features/backlog/hooks/use-sync-status.test.tsx` — Backlog sync status hook tests updates
- `frontend/src/features/backlog/types/backlog.types.ts` — Backlog types updates
- `frontend/src/utils/sync-error-messages.ts` — Sync error messages updates
- `frontend/src/utils/sync-error-messages.test.ts` — Sync error messages tests updates
- `package-lock.json` — Updated with ip-cidr dependency

**No files deleted.**

## Senior Developer Review (AI)

_Reviewer: Rhunnicutt on 2026-02-10_

### Summary

- Verified network middleware behavior against all Acceptance Criteria.
- Fixed backend behavior to:
  - Use exact required 403 message `"Access denied — Vixxo network required."`
  - Parse/validate CIDR configuration at server startup (not first request)
  - Default `NETWORK_CHECK_ENABLED` to **false** outside production, **true** in production (unless explicitly set)
  - Use a safer `trust proxy` setting (`1` hop) while still enabling X-Forwarded-For IP resolution
- Fixed frontend behavior to:
  - Detect `403 + NETWORK_ACCESS_DENIED` globally from any API call (not just an initial probe)
  - Render Access Denied reliably via a lightweight global store + shared fetch helper
- Cleaned up test isolation to avoid environment leakage.

### Test Results

- Backend: `292` tests passing
- Frontend: `279` tests passing

## Change Log

- 2026-02-10: Implemented network-based access verification (Story 7.1 / VIX-361). Added CIDR-based IP verification middleware, trust proxy support, health endpoint exclusion, frontend Access Denied page with retry, and comprehensive test coverage (30 new tests, 815 total passing).
- 2026-02-10: Code review fixes applied. Adjusted network-check defaults, forced startup config validation, standardized denial message, added global frontend network-denied detection, and improved test isolation.
