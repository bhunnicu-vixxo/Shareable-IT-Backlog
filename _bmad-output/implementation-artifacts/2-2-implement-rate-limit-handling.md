# Story 2.2: Implement Rate Limit Handling

Linear Issue ID: VIX-336
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want rate limit handling for Linear API calls,
So that the application respects Linear's rate limits and avoids API throttling.

## Acceptance Criteria

1. **Given** the Linear API returns rate limit headers with every response, **When** any API call is made via `LinearClientService`, **Then** all three rate limit dimensions are parsed and tracked: request limits (`X-RateLimit-Requests-*`), complexity limits (`X-RateLimit-Complexity-*`, `X-Complexity`), and endpoint-specific limits (`X-RateLimit-Endpoint-*`)
2. **And** before each API call, the rate limiter checks remaining request and complexity budgets; if remaining tokens fall below a configurable safety threshold (default: 10% of limit), the request is delayed until sufficient tokens have refilled per Linear's leaky bucket algorithm (refill rate = `limit / 3600` tokens/second)
3. **And** when a rate limit error is received (HTTP 400 with GraphQL error code `RATELIMITED` — NOT HTTP 429), exponential backoff retry is applied with configurable parameters: initial delay 1s, multiplier 2x, max retries 3, max delay 30s, with jitter to prevent thundering herd
4. **And** rate limit status is logged via Pino structured logging at appropriate levels: `debug` for normal tracking, `warn` when approaching limits (< 20% remaining), `error` when rate limited
5. **And** `getRateLimitInfo()` is extended to return the full rate limit state including complexity and endpoint limits, not just request counts

## Tasks / Subtasks

- [x] Task 1: Extend rate limit types (AC: #1, #5)
  - [x] 1.1: Update `backend/src/types/linear.types.ts` to add `ComplexityLimitInfo` interface: `{ complexity: number, limit: number, remaining: number, reset: number }`
  - [x] 1.2: Add `EndpointLimitInfo` interface: `{ name: string, limit: number, remaining: number, reset: number }`
  - [x] 1.3: Create `FullRateLimitInfo` interface combining all three: `{ requests: RateLimitInfo | null, complexity: ComplexityLimitInfo | null, endpoint: EndpointLimitInfo | null }`
  - [x] 1.4: Keep existing `RateLimitInfo` and `LinearQueryResult<T>` unchanged for backward compatibility; update `LinearQueryResult<T>.rateLimit` type to `FullRateLimitInfo | null`

- [x] Task 2: Create rate limiter service (AC: #2, #3, #4)
  - [x] 2.1: Create `backend/src/services/sync/rate-limiter.ts`
  - [x] 2.2: Define `RateLimiterConfig` interface:
    ```typescript
    export interface RateLimiterConfig {
      safetyThresholdPercent: number  // Default: 0.10 (10%)
      warningThresholdPercent: number // Default: 0.20 (20%)
      maxRetries: number              // Default: 3
      initialRetryDelayMs: number     // Default: 1000
      retryMultiplier: number         // Default: 2
      maxRetryDelayMs: number         // Default: 30000
    }
    ```
  - [x] 2.3: Implement `RateLimiter` class with:
    - `private state: FullRateLimitInfo | null` — tracks current rate limit state
    - `updateFromHeaders(headers: Headers): FullRateLimitInfo` — parses all rate limit headers
    - `async waitIfNeeded(): Promise<void>` — pre-flight throttle check: calculates estimated tokens refilled since last reset, delays if below safety threshold
    - `isRateLimited(error: unknown): boolean` — detects `RATELIMITED` GraphQL error code
    - `async executeWithRetry<T>(fn: () => Promise<T>): Promise<T>` — wraps operation with exponential backoff retry on rate limit errors
    - `getState(): FullRateLimitInfo | null` — returns current rate limit state
  - [x] 2.4: Implement delay calculation using leaky bucket model:
    ```typescript
    // Linear refills at constant rate: limit / 3600 tokens per second
    // Calculate how long to wait for enough tokens to become available
    const refillRate = state.requests.limit / 3600
    const tokensNeeded = safetyThreshold - state.requests.remaining
    const waitMs = Math.ceil((tokensNeeded / refillRate) * 1000)
    ```
  - [x] 2.5: Implement exponential backoff with jitter:
    ```typescript
    const baseDelay = initialRetryDelayMs * Math.pow(retryMultiplier, attempt)
    const jitter = Math.random() * baseDelay * 0.1 // 10% jitter
    const delay = Math.min(baseDelay + jitter, maxRetryDelayMs)
    ```
  - [x] 2.6: Export singleton with default config: `export const rateLimiter = new RateLimiter()`

- [x] Task 3: Integrate rate limiter into LinearClientService (AC: #1, #2, #3, #4, #5)
  - [x] 3.1: Modify `backend/src/services/sync/linear-client.service.ts`:
    - Import `rateLimiter` from `./rate-limiter.js`
    - Update `executeWithRateTracking<T>` to call `rateLimiter.waitIfNeeded()` BEFORE executing the operation
    - Update `refreshRateLimitInfo` to parse ALL rate limit headers (not just request limits) via `rateLimiter.updateFromHeaders()`
    - Wrap the operation in `rateLimiter.executeWithRetry()` for automatic backoff on rate limit errors
  - [x] 3.2: Update `classifyError` to detect `RATELIMITED` error code:
    - Add `RATE_LIMITED` to `LinearApiErrorType` union in `linear-errors.ts`
    - Check `error.extensions?.code === 'RATELIMITED'` in GraphQL error responses
    - Return `LinearApiError` with type `'RATE_LIMITED'` and code `'RATE_LIMITED'`
  - [x] 3.3: Update `getRateLimitInfo()` to return `FullRateLimitInfo | null` from `rateLimiter.getState()`
  - [x] 3.4: Add rate limit observability logging:
    ```typescript
    // After each call
    const state = rateLimiter.getState()
    if (state?.requests) {
      const pctRemaining = state.requests.remaining / state.requests.limit
      if (pctRemaining < 0.20) {
        logger.warn({ service: 'linear-client', rateLimit: state.requests }, 
          'Approaching rate limit')
      }
    }
    ```

- [x] Task 4: Update error types (AC: #3)
  - [x] 4.1: Add `'RATE_LIMITED'` to `LinearApiErrorType` union in `backend/src/utils/linear-errors.ts`
  - [x] 4.2: Ensure error middleware in `backend/src/middleware/error.middleware.ts` handles `RATE_LIMITED` errors by returning HTTP 503 with `Retry-After` header

- [x] Task 5: Create unit tests (AC: #1-#5)
  - [x] 5.1: Create `backend/src/services/sync/rate-limiter.test.ts`
  - [x] 5.2: Test: `updateFromHeaders` correctly parses all three header groups (request, complexity, endpoint)
  - [x] 5.3: Test: `waitIfNeeded` delays when remaining tokens below safety threshold
  - [x] 5.4: Test: `waitIfNeeded` does NOT delay when tokens are above threshold
  - [x] 5.5: Test: `isRateLimited` detects `RATELIMITED` GraphQL error code
  - [x] 5.6: Test: `isRateLimited` returns false for non-rate-limit errors
  - [x] 5.7: Test: `executeWithRetry` retries on rate limit error with exponential backoff
  - [x] 5.8: Test: `executeWithRetry` gives up after maxRetries
  - [x] 5.9: Test: `executeWithRetry` does NOT retry on non-rate-limit errors (passes through)
  - [x] 5.10: Test: delay calculation uses leaky bucket refill model
  - [x] 5.11: Update `backend/src/services/sync/linear-client.service.test.ts`:
    - Test: `executeWithRateTracking` calls `waitIfNeeded` before operation
    - Test: rate limit errors trigger retry logic
    - Test: `getRateLimitInfo` returns full state including complexity

- [x] Task 6: Integration verification (AC: #1-#5)
  - [x] 6.1: `npm run build` passes with zero TypeScript errors
  - [x] 6.2: `npm run lint` passes
  - [x] 6.3: `npm run test:run` passes all existing and new tests

## Dev Notes

### What's Already Done (from Story 2.1)

| Capability | Status | File |
|---|---|---|
| `LinearClientService` with lazy init | Done | `backend/src/services/sync/linear-client.service.ts` |
| `RateLimitInfo` type (limit, remaining, reset) | Done | `backend/src/types/linear.types.ts` |
| `LinearQueryResult<T>` wrapper with rateLimit | Done | `backend/src/types/linear.types.ts` |
| `executeWithRateTracking` wrapping all API calls | Done | `linear-client.service.ts` |
| `refreshRateLimitInfo` probe request for headers | Done | `linear-client.service.ts` |
| `getRateLimitInfo()` public method | Done | `linear-client.service.ts` |
| `parseRateLimitHeaders` for `X-RateLimit-Requests-*` | Done | `linear-client.service.ts` |
| `LinearApiError`, `LinearNetworkError`, `LinearConfigError` | Done | `backend/src/utils/linear-errors.ts` |
| Error classification with `classifyError` | Done | `linear-client.service.ts` |
| Pino structured logging | Done | `backend/src/utils/logger.ts` |
| 12 unit tests for client service | Done | `linear-client.service.test.ts` |
| `@linear/sdk@^73.0.0` installed | Done | `backend/package.json` |
| Vitest configured with `--pool=threads` | Done | `backend/package.json` |

### What This Story Adds

1. **Extended rate limit tracking** — Parse complexity limits and endpoint-specific limits (new header groups from Linear)
2. **Pre-flight throttling** — Delay requests when approaching limits using leaky bucket refill model
3. **Exponential backoff retry** — Automatic retry with backoff when rate limited
4. **`RATE_LIMITED` error type** — New error classification for rate limit responses
5. **Full observability** — Structured logging at warn/error levels as limits approach
6. **Rate limiter service** — Reusable `RateLimiter` class encapsulating all throttling logic

### CRITICAL: Linear Rate Limit Error Format is NOT HTTP 429

**This is the most important detail in this story.** Linear does NOT return HTTP 429 (Too Many Requests) when you exceed rate limits. Instead, it returns:

- **HTTP Status: 400** (Bad Request)
- **GraphQL response body:**
  ```json
  {
    "errors": [{
      "message": "...",
      "extensions": {
        "code": "RATELIMITED"
      }
    }]
  }
  ```

The `@linear/sdk` will throw this as a GraphQL error. You must detect the `RATELIMITED` error code in the `extensions.code` field. Do NOT check for HTTP 429.

**Detection in the SDK error:**
```typescript
function isRateLimited(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  // The SDK wraps GraphQL errors — check the parsed error
  const parsed = parseLinearError(error)
  
  // Check for RATELIMITED code in extensions
  const errors = parsed?.raw?.response?.errors
  if (Array.isArray(errors)) {
    return errors.some(
      (e: { extensions?: { code?: string } }) => 
        e.extensions?.code === 'RATELIMITED'
    )
  }
  
  // Fallback: check message
  return error.message.toLowerCase().includes('rate limit')
}
```

### CRITICAL: Three Dimensions of Rate Limiting

Linear enforces THREE separate rate limit dimensions. All three must be tracked:

**1. Request Limits (already partially tracked in Story 2.1):**
| Header | Description |
|---|---|
| `X-RateLimit-Requests-Limit` | Max requests per hour (5,000 for API key auth) |
| `X-RateLimit-Requests-Remaining` | Remaining requests in window |
| `X-RateLimit-Requests-Reset` | UTC epoch ms when window resets |

**2. Complexity Limits (NEW — must add):**
| Header | Description |
|---|---|
| `X-Complexity` | Complexity score of the query just executed |
| `X-RateLimit-Complexity-Limit` | Max complexity points per hour (3,000,000 for API key) |
| `X-RateLimit-Complexity-Remaining` | Remaining complexity points |
| `X-RateLimit-Complexity-Reset` | UTC epoch ms when window resets |

**3. Endpoint-Specific Limits (NEW — must add):**
| Header | Description |
|---|---|
| `X-RateLimit-Endpoint-Requests-Limit` | Max requests for this specific endpoint |
| `X-RateLimit-Endpoint-Requests-Remaining` | Remaining requests for this endpoint |
| `X-RateLimit-Endpoint-Requests-Reset` | UTC epoch ms when endpoint window resets |
| `X-RateLimit-Endpoint-Name` | Name of the rate-limited endpoint |

### CRITICAL: Leaky Bucket Algorithm Understanding

Linear uses a **leaky bucket** algorithm. This means:
- Tokens are refilled at a **constant rate**: `limit / period` tokens per second
- For request limits: 5000 / 3600 = ~1.39 tokens/second
- For complexity: 3,000,000 / 3600 = ~833 points/second
- The bucket can hold at most `limit` tokens at any time

**Client-side throttling should model this refill rate.** When calculating wait time:
```typescript
const elapsed = Date.now() - state.reset  // ms since last known reset
const refillRate = state.limit / 3600      // tokens per second
const refilled = Math.floor((elapsed / 1000) * refillRate)
const estimated = Math.min(state.remaining + refilled, state.limit)
```

**Do NOT use a simple "wait until reset" approach** — that would unnecessarily block for up to an hour. Use the refill calculation instead.

### CRITICAL: ESM Import Pattern

Backend uses Node16 module resolution. All local imports MUST use `.js` extensions:

```typescript
// ✅ Correct
import { rateLimiter } from './rate-limiter.js'
import type { FullRateLimitInfo } from '../../types/linear.types.js'

// ❌ Wrong — will fail at runtime
import { rateLimiter } from './rate-limiter'
```

### CRITICAL: Zod v4 Import Path

If using Zod for config validation:
```typescript
// ✅ Correct for Zod v4
import { z } from 'zod/v4'

// ❌ Wrong
import { z } from 'zod'
```

### CRITICAL: Do NOT Replace the Rate Limit Probe Mechanism

Story 2.1 implemented rate limit header capture via a lightweight probe request (`refreshRateLimitInfo`) using the SDK's `rawRequest`. This probe approach exists because the SDK's high-level methods (`.issues()`, `.issue()`) do NOT expose response headers.

**Do NOT change this approach.** Instead, extend `refreshRateLimitInfo` to parse the additional headers (complexity, endpoint) from the same probe response. The probe already fires after every SDK call — just extract more headers from it.

### CRITICAL: Singleton Pattern and Thread Safety

The `LinearClientService` is a singleton (`export const linearClient = new LinearClientService()`). The `RateLimiter` should also be a singleton, but shared with the client service. Since Node.js is single-threaded, there are no concurrency concerns for rate limit state, but be aware that multiple concurrent async operations may read stale state. This is acceptable — the rate limiter provides best-effort throttling, not exact enforcement.

### Architecture Compliance

**From architecture.md:**
- Rate limiting handled in services layer (not middleware — middleware is for Express API protection) ✅
- Backend → Linear rate limiting via service layer ✅
- Structured logging via Pino ✅
- TypeScript strict mode, no `any` without explicit reason ✅
- ESM imports with `.js` extensions ✅
- Co-located tests alongside source files ✅

**From project-context.md:**
- Error format: `{ error: { message, code, details? } }` ✅
- Never log sensitive data (API keys, tokens) ✅
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_SAFETY_THRESHOLD_PERCENT`) ✅
- Boolean prefix: `isRateLimited`, `isApproachingLimit` ✅

### Cross-Story Context (Epic 2 Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 2.1 GraphQL Client | Depends on | Provides `LinearClientService`, `RateLimitInfo`, `executeWithRateTracking`, error types |
| 2.3 Error Handling & Retry | Related | Story 2.3 adds general retry logic for transient errors (5xx, network). This story handles rate-limit-specific retry ONLY. Story 2.3 should NOT duplicate rate limit retry — it should check if error is `RATE_LIMITED` and skip its own retry if so |
| 2.4 Data Models & Types | Related | Story 2.4 uses `@linear/sdk` types. No conflict — this story only extends rate limit types |

**IMPORTANT:** This story implements retry ONLY for rate limit errors (`RATELIMITED`). Story 2.3 will implement retry for transient errors (network failures, 5xx). Keep the two retry mechanisms separate — rate limit retry uses longer delays (seconds) based on rate limit reset time, while transient retry uses shorter delays.

### Project Structure After This Story

```
backend/src/
├── services/
│   └── sync/
│       ├── linear-client.service.ts       ← MODIFIED (integrate rate limiter)
│       ├── linear-client.service.test.ts  ← MODIFIED (add rate limit tests)
│       ├── rate-limiter.ts                ← NEW
│       └── rate-limiter.test.ts           ← NEW
├── types/
│   └── linear.types.ts                    ← MODIFIED (add complexity/endpoint types)
├── utils/
│   └── linear-errors.ts                   ← MODIFIED (add RATE_LIMITED type)
└── ...
```

### What NOT To Do

- **Do NOT check for HTTP 429** — Linear returns 400 with `RATELIMITED` GraphQL error code
- **Do NOT use a "wait until reset" approach** — would block for up to an hour; use leaky bucket refill calculation
- **Do NOT install additional rate limiting libraries** (e.g., `bottleneck`, `p-limit`) — implement the logic directly; it's simple and tightly coupled to Linear's specific behavior
- **Do NOT modify the probe request mechanism** — extend it, don't replace it
- **Do NOT add retry logic for non-rate-limit errors** — Story 2.3 handles transient retries
- **Do NOT create Express middleware for this** — `rate-limit.middleware.ts` is for protecting the backend API from user abuse, not for Linear API throttling
- **Do NOT use `setTimeout` with hardcoded values** — calculate delays from rate limit state
- **Do NOT log full response bodies or headers** — log only rate limit metrics (remaining, limit, reset)
- **Do NOT use CommonJS** (`require`/`module.exports`) — backend is ESM
- **Do NOT import from `'zod'`** — must use `'zod/v4'`

### Previous Story Intelligence (Story 2.1)

**Learnings from Story 2.1 implementation:**

1. **SDK Header Access:** The `@linear/sdk` does NOT expose response headers from high-level methods. A probe request via `client.client.rawRequest()` is used. This works but adds an extra API call per operation. For rate limiting, this is acceptable since the probe itself is lightweight (viewer query).

2. **Error Classification:** The `parseLinearError()` function from `@linear/sdk` was used to extract status codes and error types. The same approach can be extended to check for `RATELIMITED` in `extensions.code`.

3. **Vitest on Windows:** Tests must use `--pool=threads` flag and be scoped to `src/` directory. Mock pattern for SDK uses `vi.mock('@linear/sdk', ...)` with constructor-compatible functions (use `function` keyword, not arrow functions).

4. **Lazy Config:** `linearConfig` uses a Proxy for lazy evaluation. Rate limiter config should follow the same pattern if it needs env vars, or use simple constants if hardcoded defaults suffice.

5. **Mock pattern for time-sensitive tests:** Use `vi.useFakeTimers()` for testing delay/backoff behavior. Mock `performance.now()` for duration tracking.

### Git Intelligence

**Latest commit:** `55ad1a9 feat(backend): implement Linear GraphQL client (VIX-335)` — This is the Story 2.1 implementation. Files added:
- `backend/src/config/linear.config.ts`
- `backend/src/services/sync/linear-client.service.ts`
- `backend/src/services/sync/linear-client.service.test.ts`
- `backend/src/types/linear.types.ts`
- `backend/src/utils/linear-errors.ts`

All of these files will be modified or extended in this story.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Rate Limiting Strategy] — Backend API protection + Linear API respect
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points] — Backend → Linear via `services/sync/linear-client.service.ts`
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Naming, error handling, logging patterns
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 2.2] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Critical Implementation Rules] — TypeScript, error handling, async patterns
- [Source: _bmad-output/implementation-artifacts/2-1-implement-linear-graphql-client.md] — Previous story with full implementation context
- [Source: Linear API docs — Rate Limiting (https://linear.app/developers/rate-limiting)] — Leaky bucket, 5000 req/hr, 3M complexity/hr, RATELIMITED error code, three header groups
- [Source: @linear/sdk npm v73.0.0] — Official TypeScript SDK, `parseLinearError`, `rawRequest`

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- TypeScript build initially failed with 3 strict-mode cast errors in test files (`Error as Record<string, unknown>`) — fixed by using `Error as unknown as Record<string, unknown>`.
- One test failed (`getRateLimitInfo returns null before any API calls`) because `getRateLimitInfo` now delegates to the shared `rateLimiter` singleton, which accumulates state across tests. Fixed by changing the test to verify singleton delegation instead of per-instance null state.

### Completion Notes List

- **Task 1:** Extended `linear.types.ts` with `ComplexityLimitInfo`, `EndpointLimitInfo`, and `FullRateLimitInfo` interfaces. Existing `RateLimitInfo` preserved for backward compatibility. `LinearQueryResult<T>.rateLimit` updated to `FullRateLimitInfo | null`.
- **Task 2:** Created `rate-limiter.ts` with `RateLimiter` class implementing: all three rate limit header groups parsing, pre-flight throttle using leaky bucket refill model (limit/3600 tokens/sec), exponential backoff with 10% jitter, `RATELIMITED` GraphQL error code detection, and structured Pino logging at debug/warn/error levels.
- **Task 3:** Integrated rate limiter into `LinearClientService`: `executeWithRateTracking` now calls `waitIfNeeded()` before operations, wraps operations in `executeWithRetry()`, delegates header parsing to `rateLimiter.updateFromHeaders()`, added `hasRateLimitedCode()` to `classifyError()`, and `getRateLimitInfo()` returns full state from singleton.
- **Task 4:** Added `RATE_LIMITED` to `LinearApiErrorType` union. Updated error middleware to return HTTP 503 with `Retry-After` header for rate limit errors.
- **Task 5:** Created 21 unit tests in `rate-limiter.test.ts` covering all subtasks. Updated `linear-client.service.test.ts` with 4 new rate limit integration tests (16 total). All 37 tests pass.
- **Task 6:** All verification gates pass: `npm run build` (zero TS errors), `npm run lint` (clean), `npm run test:run` (37/37 pass).
- **Review Fixes:** Corrected leaky-bucket refill calculation to use last header update time, included endpoint limits in throttling, derived Retry-After from rate limiter state, and updated rate limiter tests for timing changes.

### Change Log

- 2026-02-06: Implemented rate limit handling for Linear API calls (VIX-336). Added three-dimension rate limit tracking, pre-flight throttling, exponential backoff retry, RATE_LIMITED error type, and comprehensive unit tests.
- 2026-02-06: Addressed review findings: fixed refill math, added endpoint throttling, and improved Retry-After computation with updated tests.

### File List

- `backend/src/types/linear.types.ts` — MODIFIED: Added `ComplexityLimitInfo`, `EndpointLimitInfo`, `FullRateLimitInfo` interfaces; updated `LinearQueryResult<T>.rateLimit` type
- `backend/src/services/sync/rate-limiter.ts` — NEW: `RateLimiter` class with header parsing, leaky bucket throttling, exponential backoff retry, endpoint-aware throttling, observability logging, and Retry-After helper
- `backend/src/services/sync/rate-limiter.test.ts` — NEW: 21 unit tests for rate limiter plus timing/retry-after coverage
- `backend/src/services/sync/linear-client.service.ts` — MODIFIED: Integrated `rateLimiter` for pre-flight throttle, retry, header delegation, RATELIMITED error detection
- `backend/src/services/sync/linear-client.service.test.ts` — MODIFIED: Added 4 rate limit integration tests, updated mocks for full header set
- `backend/src/utils/linear-errors.ts` — MODIFIED: Added `RATE_LIMITED` to `LinearApiErrorType` union
- `backend/src/middleware/error.middleware.ts` — MODIFIED: Added `RATE_LIMITED` handler returning HTTP 503 with dynamic `Retry-After` header
- `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml` — MODIFIED: Workflow instructions updated (non-source)
- `_bmad-output/implementation-artifacts/2-2-implement-rate-limit-handling.md` — MODIFIED: Story updated with review fixes and status change
