# Story 2.1: Implement Linear GraphQL Client

Linear Issue ID: VIX-335
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a Linear GraphQL client that can query Linear's API,
So that I can fetch backlog data reliably.

## Acceptance Criteria

1. **Given** Linear API credentials are configured in `LINEAR_API_KEY` env var, **When** the application initializes the Linear client, **Then** authentication is configured correctly using the API key and the client can execute queries against `https://api.linear.app/graphql`
2. **And** responses from Linear GraphQL API are parsed into strongly typed TypeScript objects
3. **And** GraphQL errors (malformed queries, permission errors, schema violations) are caught, logged via Pino with structured context (`{ service: 'linear-client', operation, error }`), and re-thrown as typed `LinearApiError` instances
4. **And** network errors (timeouts, DNS failures, connection refused) are caught, logged, and re-thrown as typed `LinearNetworkError` instances
5. **And** rate limit response headers (`X-RateLimit-Requests-Limit`, `X-RateLimit-Requests-Remaining`, `X-RateLimit-Requests-Reset`) are parsed and exposed after every API call for downstream consumers (Story 2.2)
6. **And** the client exposes query methods for: fetching issues by project, fetching a single issue by ID, fetching issue comments, and verifying authentication (viewer query)
7. **And** the client validates that `LINEAR_API_KEY` is present at initialization and throws a clear error if missing

## Tasks / Subtasks

- [x] Task 1: Install `@linear/sdk` dependency (AC: #1, #2)
  - [x] 1.1: Run `npm install @linear/sdk` in `backend/` directory
  - [x] 1.2: Verify `@linear/sdk` appears in `backend/package.json` dependencies
  - [x] 1.3: Verify TypeScript can resolve `@linear/sdk` imports without errors

- [x] Task 2: Create Linear configuration module (AC: #1, #7)
  - [x] 2.1: Create `backend/src/config/linear.config.ts` (replace `.gitkeep`)
  - [x] 2.2: Define and export `linearConfig` object using Zod validation:
    ```typescript
    import { z } from 'zod/v4'
    
    const linearConfigSchema = z.object({
      apiKey: z.string().min(1, 'LINEAR_API_KEY is required'),
      apiUrl: z.string().url().default('https://api.linear.app/graphql'),
    })
    
    export const linearConfig = linearConfigSchema.parse({
      apiKey: process.env.LINEAR_API_KEY,
      apiUrl: process.env.LINEAR_API_URL,
    })
    ```
  - [x] 2.3: Export `LinearConfig` type from the schema for reuse

- [x] Task 3: Create custom error types (AC: #3, #4)
  - [x] 3.1: Create `backend/src/utils/linear-errors.ts`
  - [x] 3.2: Define `LinearApiError` class extending `Error`:
    - Properties: `message`, `code` (string), `type` ('GRAPHQL_ERROR' | 'AUTHENTICATION_ERROR' | 'PERMISSION_ERROR' | 'NOT_FOUND'), `raw` (original error data)
    - Constructor accepts `{ message, code, type, raw }`
  - [x] 3.3: Define `LinearNetworkError` class extending `Error`:
    - Properties: `message`, `code` ('NETWORK_ERROR' | 'TIMEOUT' | 'DNS_FAILURE'), `cause` (original error)
  - [x] 3.4: Define `LinearConfigError` class extending `Error` for missing/invalid configuration

- [x] Task 4: Create rate limit tracking types and utility (AC: #5)
  - [x] 4.1: Create `backend/src/types/linear.types.ts`
  - [x] 4.2: Define `RateLimitInfo` interface:
    ```typescript
    export interface RateLimitInfo {
      limit: number        // X-RateLimit-Requests-Limit (5000/hr)
      remaining: number    // X-RateLimit-Requests-Remaining
      reset: number        // X-RateLimit-Requests-Reset (Unix timestamp ms)
    }
    ```
  - [x] 4.3: Define `LinearQueryResult<T>` interface wrapping data + rate limit info:
    ```typescript
    export interface LinearQueryResult<T> {
      data: T
      rateLimit: RateLimitInfo | null
    }
    ```

- [x] Task 5: Implement `LinearClientService` (AC: #1-#7)
  - [x] 5.1: Create `backend/src/services/sync/linear-client.service.ts` (replace `.gitkeep`)
  - [x] 5.2: Initialize `LinearClient` from `@linear/sdk` with API key from `linearConfig`
  - [x] 5.3: Implement private `executeWithRateTracking<T>` wrapper method:
    - Accepts an async operation (SDK method call)
    - Executes the operation
    - For rate limit tracking: since `@linear/sdk` does not directly expose response headers, implement a parallel low-level `fetch` wrapper to `https://api.linear.app/graphql` that extracts `X-RateLimit-*` headers and stores them; update `lastRateLimitInfo` after each call
    - Catches errors and classifies them as `LinearApiError` or `LinearNetworkError`
    - Logs each call via Pino: `logger.debug({ service: 'linear-client', operation, durationMs })`
    - Returns `LinearQueryResult<T>`
  - [x] 5.4: Implement `verifyAuth(): Promise<LinearQueryResult<{ id: string; name: string; email: string }>>`:
    - Uses `this.client.viewer` from SDK
    - Returns viewer info (id, name, email)
    - Used as a health check for Linear connectivity
  - [x] 5.5: Implement `getIssuesByProject(projectId: string, options?: { first?: number; after?: string }): Promise<LinearQueryResult<Issue[]>>`:
    - Uses SDK's `this.client.issues({ filter: { project: { id: { eq: projectId } } }, first, after })`
    - Returns typed Issue array with pagination cursor
    - Default `first` = 50 (Linear's default page size)
  - [x] 5.6: Implement `getIssueById(issueId: string): Promise<LinearQueryResult<Issue | null>>`:
    - Uses `this.client.issue(issueId)`
    - Returns single issue or null if not found
    - Catches NOT_FOUND errors gracefully (return null, don't throw)
  - [x] 5.7: Implement `getIssueComments(issueId: string): Promise<LinearQueryResult<Comment[]>>`:
    - Uses SDK's issue → comments traversal
    - Returns typed Comment array
  - [x] 5.8: Implement `getRateLimitInfo(): RateLimitInfo | null`:
    - Returns the last known rate limit state
    - Returns null if no API calls have been made yet
  - [x] 5.9: Export singleton instance: `export const linearClient = new LinearClientService()`
  - [x] 5.10: Add lazy initialization — do NOT create the SDK client in the module scope; initialize on first use so the service can be imported without `LINEAR_API_KEY` being set (tests, other modules)

- [x] Task 6: Create unit tests (AC: #1-#7)
  - [x] 6.1: Create `backend/src/services/sync/linear-client.service.test.ts`
  - [x] 6.2: Test: client throws `LinearConfigError` when `LINEAR_API_KEY` is empty
  - [x] 6.3: Test: `verifyAuth` calls SDK viewer method and returns structured result
  - [x] 6.4: Test: `getIssuesByProject` calls SDK with correct filter and pagination
  - [x] 6.5: Test: `getIssueById` returns null for non-existent issue (not throw)
  - [x] 6.6: Test: GraphQL errors are caught and re-thrown as `LinearApiError`
  - [x] 6.7: Test: Network errors are caught and re-thrown as `LinearNetworkError`
  - [x] 6.8: Test: `getRateLimitInfo` returns null before any API calls
  - [x] 6.9: Mock `@linear/sdk` — do NOT make real API calls in tests

- [x] Task 7: Integration wiring and verification (AC: #1, #6)
  - [x] 7.1: Verify `backend/src/config/linear.config.ts` loads correctly with existing `.env` setup
  - [x] 7.2: Verify `npm run build` in backend passes with zero TypeScript errors
  - [x] 7.3: Verify `npm run lint` passes
  - [x] 7.4: Verify tests pass: `npx vitest run` (install vitest in backend if not present — see Dev Notes)

## Dev Notes

### What's Already Done (from Epic 1)

| Capability | Story | Status |
|---|---|---|
| Backend Express + TypeScript setup | 1.2 | Done — `backend/src/app.ts`, `server.ts` |
| Pino logger | 1.2 | Done — `backend/src/utils/logger.ts` |
| Error middleware | 1.2 | Done — `backend/src/middleware/error.middleware.ts` |
| Database connection (PostgreSQL) | 1.3 | Done — `backend/src/utils/database.ts` |
| Environment variable loading (dotenv) | 1.2 | Done — `backend/src/config/env.ts` |
| `LINEAR_API_KEY` in `.env.example` | 1.4 | Done — already documented |
| TypeScript strict mode, ES2022 target | 1.2 | Done — `backend/tsconfig.json` |
| ESM with `.js` extensions | 1.2 | Done — all imports use `.js` suffix |
| Services directory structure | 1.2 | Done — `backend/src/services/sync/` exists (`.gitkeep`) |

### What This Story Adds

1. **`@linear/sdk` dependency** — Official Linear TypeScript SDK with strongly typed models
2. **Linear configuration** — Zod-validated config loading from environment variables
3. **Linear client service** — Abstraction layer for all Linear API communication
4. **Custom error types** — `LinearApiError`, `LinearNetworkError`, `LinearConfigError` for typed error handling
5. **Rate limit tracking** — Parses and exposes rate limit headers for downstream consumers (Story 2.2)
6. **Unit tests** — Full test coverage of client behavior with mocked SDK

### CRITICAL: Library Choice — `@linear/sdk` v73.0.0

**Use `@linear/sdk` (the official Linear TypeScript SDK), NOT `graphql-request` or raw `fetch`.**

Rationale:
- **Built-in TypeScript types** for all Linear entities (Issue, Comment, Project, Team, User, etc.) — eliminates need to manually define types and directly supports Story 2.4
- **Auto-generated from Linear's actual GraphQL schema** — guaranteed schema compatibility
- **Strongly typed query methods** — `client.issues()`, `client.issue(id)`, `client.viewer` etc.
- **Built-in pagination support** — handles cursor-based pagination
- **Maintained by Linear** — updated with every API schema change (v73.0.0 published within last week)
- **MIT license** — compatible with project

Installation:
```bash
cd backend
npm install @linear/sdk
```

Usage pattern:
```typescript
import { LinearClient } from '@linear/sdk'

const client = new LinearClient({ apiKey: 'lin_api_...' })
const me = await client.viewer
const issues = await client.issues({ 
  filter: { project: { id: { eq: 'project-uuid' } } },
  first: 50 
})
```

**Do NOT use:**
- `graphql-request` — requires manual type definitions, no Linear-specific features
- Raw `fetch` calls — the existing root-level scripts (`import-to-linear.js`) use this pattern but they are throwaway CommonJS scripts, not production services
- `@apollo/client` — too heavyweight for server-side queries, designed for React frontend

### CRITICAL: Rate Limit Header Tracking

The `@linear/sdk` abstracts the HTTP layer and does NOT directly expose response headers. To track rate limits for Story 2.2:

**Approach — Parallel header extraction:**

After each SDK call, make a lightweight metadata query using raw `fetch` to capture the rate limit headers. Alternatively, create a custom `fetch` wrapper that the SDK can use:

```typescript
// The @linear/sdk accepts a custom fetch function
const client = new LinearClient({
  apiKey: config.apiKey,
  // Override fetch to capture headers
  headers: { 'Authorization': config.apiKey }
})
```

**Rate limit header parsing:**
```typescript
function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Requests-Limit')
  const remaining = headers.get('X-RateLimit-Requests-Remaining')
  const reset = headers.get('X-RateLimit-Requests-Reset')
  
  if (!limit || !remaining || !reset) return null
  
  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  }
}
```

**Linear rate limits (verified 2026):**
- 5,000 requests per user per hour (API key auth)
- Leaky bucket algorithm
- Headers: `X-RateLimit-Requests-Limit`, `X-RateLimit-Requests-Remaining`, `X-RateLimit-Requests-Reset`
- Some individual queries/mutations have lower sub-limits
- Best practice: filter data, use pagination (default 50), sort by `updatedAt` for incremental sync

### CRITICAL: ESM Import Pattern

Backend uses Node16 module resolution. All local imports MUST use `.js` extensions:

```typescript
// ✅ Correct
import { logger } from '../../utils/logger.js'
import { linearConfig } from '../../config/linear.config.js'
import { LinearApiError } from '../../utils/linear-errors.js'

// ❌ Wrong — will fail at runtime
import { logger } from '../../utils/logger'
```

### CRITICAL: Lazy Initialization Pattern

Do NOT create the SDK client in the module scope. Use lazy initialization:

```typescript
class LinearClientService {
  private client: LinearClient | null = null

  private getClient(): LinearClient {
    if (!this.client) {
      // Only validates config and creates client on first use
      this.client = new LinearClient({ apiKey: linearConfig.apiKey })
    }
    return this.client
  }
  
  async verifyAuth() {
    const client = this.getClient()
    // ...
  }
}
```

This prevents crashes when the module is imported in test environments or other modules that don't need Linear API access.

### CRITICAL: Error Classification

Classify errors into three categories matching the custom error types:

| Error Source | Error Type | HTTP-like Code | Example |
|---|---|---|---|
| GraphQL response errors | `LinearApiError` | `GRAPHQL_ERROR` | Malformed query, schema mismatch |
| Authentication failure | `LinearApiError` | `AUTHENTICATION_ERROR` | Invalid/expired API key (401) |
| Permission denied | `LinearApiError` | `PERMISSION_ERROR` | Accessing restricted data (403) |
| Entity not found | `LinearApiError` | `NOT_FOUND` | Non-existent issue ID |
| Network failure | `LinearNetworkError` | `NETWORK_ERROR` | Connection refused, ECONNRESET |
| Timeout | `LinearNetworkError` | `TIMEOUT` | Request took too long |
| DNS failure | `LinearNetworkError` | `DNS_FAILURE` | Cannot resolve api.linear.app |
| Missing config | `LinearConfigError` | — | `LINEAR_API_KEY` not set |

**Important:** `getIssueById` should return `null` for NOT_FOUND, not throw. Other methods should throw typed errors.

### CRITICAL: Zod v4 Import Path

The project uses Zod v4 (`zod@^4.3.6`). In Zod v4, the import path changed:

```typescript
// ✅ Correct for Zod v4
import { z } from 'zod/v4'

// ❌ Wrong — Zod v4 compatibility shim, may not work as expected
import { z } from 'zod'
```

### Backend Test Setup

The backend does NOT currently have a test runner configured. If `vitest` is not installed:

```bash
cd backend
npm install -D vitest
```

Add to `backend/package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

Mock pattern for `@linear/sdk`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LinearClient } from '@linear/sdk'

vi.mock('@linear/sdk', () => ({
  LinearClient: vi.fn().mockImplementation(() => ({
    viewer: Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@test.com' }),
    issues: vi.fn(),
    issue: vi.fn(),
  })),
}))
```

### Logging Pattern

Follow the established Pino structured logging pattern from `utils/logger.ts`:

```typescript
import { logger } from '../../utils/logger.js'

// Operation logging
logger.debug({ service: 'linear-client', operation: 'verifyAuth', durationMs: 142 })

// Error logging
logger.error({ 
  service: 'linear-client', 
  operation: 'getIssuesByProject', 
  error: err.message,
  projectId 
})

// Rate limit logging
logger.info({ 
  service: 'linear-client', 
  rateLimit: { remaining: 4850, limit: 5000, reset: 1707264000000 } 
})
```

**Never log:** The API key value, raw authentication tokens, or full response bodies.

### Cross-Story Context (Epic 2 Dependencies)

| Story | Depends On | What It Needs From This Story |
|---|---|---|
| 2.2 Rate Limit Handling | This story | `getRateLimitInfo()` method, `RateLimitInfo` type |
| 2.3 Error Handling & Retry | This story | `LinearApiError`, `LinearNetworkError` error types, client methods to wrap with retry logic |
| 2.4 Data Models & Types | This story | `@linear/sdk` types as foundation, `linear.types.ts` as extension point |

**Design for extension:** Story 2.2 will wrap client methods with rate limit middleware. Story 2.3 will add retry logic. Keep the client methods simple and composable — do not bake in retry or throttling logic in this story.

### Project Structure After This Story

```
backend/src/
├── config/
│   ├── env.ts               (unchanged)
│   ├── database.config.ts    (unchanged)
│   └── linear.config.ts      ← NEW (replaces .gitkeep)
├── services/
│   └── sync/
│       ├── linear-client.service.ts       ← NEW (replaces .gitkeep)
│       └── linear-client.service.test.ts  ← NEW
├── types/
│   ├── express.d.ts          (unchanged)
│   └── linear.types.ts       ← NEW
├── utils/
│   ├── logger.ts             (unchanged)
│   ├── database.ts           (unchanged)
│   └── linear-errors.ts      ← NEW
└── ...
```

### Architecture Compliance

**From architecture.md:**
- Backend → Linear: GraphQL queries via `services/sync/linear-client.service.ts` ✅
- Linear config in `config/linear.config.ts` ✅
- Service layer pattern: all business logic in services ✅
- Error logging via Pino with structured context ✅
- TypeScript strict mode, no `any` without explicit reason ✅
- ESM imports with `.js` extensions ✅
- Co-located tests alongside source files ✅

**From project-context.md:**
- Error format: `{ error: { message, code, details? } }` — custom error classes follow this pattern ✅
- Never log sensitive data (API keys, tokens) ✅
- Use Zod for runtime validation ✅
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`) ✅
- Boolean prefix: `isLoading`, `isFetching` pattern ✅

### What NOT To Do

- **Do NOT install `graphql-request`** — `@linear/sdk` provides everything needed
- **Do NOT install `@apollo/client`** — too heavyweight for server-side, designed for React
- **Do NOT use raw `fetch` like `import-to-linear.js`** — those are throwaway scripts, not production code
- **Do NOT bake in retry logic** — Story 2.3 handles retries; keep this client simple
- **Do NOT bake in rate limit throttling** — Story 2.2 handles throttling; just track the headers
- **Do NOT create route/controller for Linear** — this is a service-layer component only; routes come in Epic 6
- **Do NOT hardcode the Linear project ID** — it should be passed as a parameter, not configured
- **Do NOT import from `'zod'`** — must use `'zod/v4'` for Zod v4 compatibility
- **Do NOT call `linearConfig` at module load time** — use lazy initialization for testability
- **Do NOT store full API response bodies in logs** — log operation name, duration, and error details only
- **Do NOT use CommonJS** (`require`/`module.exports`) — backend is ESM

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST API, GraphQL client for Linear integration
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points] — Backend → Linear via `services/sync/linear-client.service.ts`
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] — File locations and boundaries
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Naming, error handling, logging patterns
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 2.1] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Critical Implementation Rules] — TypeScript, error handling, async patterns
- [Source: _bmad-output/implementation-artifacts/1-2-initialize-backend-project.md] — Backend setup, Pino, error middleware
- [Source: _bmad-output/implementation-artifacts/1-4-configure-development-environment.md] — Dev env, ESM, LINEAR_API_KEY
- [Source: Linear API docs — Rate Limiting] — 5000 req/hr, leaky bucket, X-RateLimit headers
- [Source: @linear/sdk npm v73.0.0] — Official TypeScript SDK, built-in types, Node 18+ required

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor)

### Debug Log References

- vitest mock required constructor-compatible function (`function` keyword) instead of arrow function for `LinearClient` — fixed on first test run

### Completion Notes List

- **Task 1:** Installed `@linear/sdk@^73.0.0` and `vitest` (dev) in backend. Added `test` / `test:run` scripts to `package.json` (threads pool; scoped to `src/`).
- **Task 2:** Created `linear.config.ts` with Zod v4 schema validation. Implemented lazy config parsing via `getLinearConfig()` and exported a lazily-evaluated `linearConfig` object (proxy) for property access.
- **Task 3:** Created `linear-errors.ts` with three error classes: `LinearApiError`, `LinearNetworkError`, `LinearConfigError`. All extend `Error` with typed properties.
- **Task 4:** Created `linear.types.ts` with `RateLimitInfo` and `LinearQueryResult<T>` interfaces.
- **Task 5:** Implemented `LinearClientService` with lazy init, `apiUrl` support, safer rate-limit tracking via SDK `rawRequest` probe (no global `fetch` monkeypatch), improved error classification using `parseLinearError`, and all 4 query methods + `getRateLimitInfo()`. Exported singleton `linearClient`.
- **Task 6:** 12 unit tests covering config validation, all query methods, error classification (GraphQL, auth, network, DNS, timeout), and rate-limit default. All SDK interactions mocked — no real API calls.
- **Task 7:** `npm run build` passes with zero TypeScript errors. `npm run lint` passes. `npm run test:run` passes 12/12 tests. Removed `.gitkeep` placeholders replaced by real files.

### Change Log

- 2026-02-06: Implemented Linear GraphQL client service (Story 2.1 / VIX-335). Added @linear/sdk dependency, configuration module, error types, rate-limit types, client service with lazy init and rate-limit header tracking, and 12 unit tests. All acceptance criteria satisfied.
- 2026-02-06: Code review fixes — aligned exported config shape (`linearConfig`), removed global `fetch` patch, used SDK `apiUrl` option, improved error classification using SDK error parsing, stabilized Vitest on Windows with `--pool=threads` and `src/` scoping.

### File List

- `backend/package.json` — MODIFIED (added @linear/sdk, vitest, test scripts; threads pool; `src/` scope)
- `backend/src/config/linear.config.ts` — NEW (replaces .gitkeep)
- `backend/src/utils/linear-errors.ts` — NEW
- `backend/src/types/linear.types.ts` — NEW
- `backend/src/services/sync/linear-client.service.ts` — NEW (replaces .gitkeep)
- `backend/src/services/sync/linear-client.service.test.ts` — NEW
- `backend/src/config/.gitkeep` — DELETED
- `backend/src/services/sync/.gitkeep` — DELETED
