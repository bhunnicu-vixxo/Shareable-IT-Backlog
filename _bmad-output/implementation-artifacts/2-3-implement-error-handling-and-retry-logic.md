# Story 2.3: Implement Error Handling and Retry Logic

Linear Issue ID: VIX-337
Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want robust error handling with retry logic for Linear API calls,
So that transient failures don't break the sync process.

## Acceptance Criteria

1. **Given** a Linear API call fails with a transient error (network failure, timeout, DNS error, HTTP 5xx), **When** the retry handler detects the error is retryable, **Then** the operation is automatically retried with exponential backoff (1s, 2s, 4s delays) up to a configurable maximum of 3 retries
2. **And** non-retryable errors (HTTP 4xx: authentication, permission, not-found, GraphQL schema errors) are thrown immediately without retry
3. **And** rate-limit errors (`RATELIMITED` GraphQL code) are NOT retried by this handler — they are handled exclusively by the existing `RateLimiter` from Story 2.2
4. **And** every retry attempt is logged via Pino structured logging with: `{ service: 'retry-handler', operation, attempt, maxRetries, error, delayMs }`
5. **And** after all retries are exhausted for transient errors, the final error is thrown as a typed `LinearNetworkError` with full context
6. **And** the retry handler is integrated into `LinearClientService.executeWithRateTracking()` wrapping the rate-limit retry, so the execution order is: `waitIfNeeded()` → `retryHandler.executeWithRetry(rateLimiter.executeWithRetry(fn))`
7. **And** a circuit breaker pattern is NOT implemented in this story (deferred — keep it simple for MVP)

## Tasks / Subtasks

- [x] Task 1: Create retry handler service (AC: #1, #2, #3, #4, #5)
  - [x] 1.1: Create `backend/src/services/sync/retry-handler.ts`
  - [x] 1.2: Define `RetryHandlerConfig` interface:
    ```typescript
    export interface RetryHandlerConfig {
      maxRetries: number              // Default: 3
      initialRetryDelayMs: number     // Default: 1000
      retryMultiplier: number         // Default: 2
      maxRetryDelayMs: number         // Default: 8000
    }
    ```
  - [x] 1.3: Implement `RetryHandler` class with:
    - `isRetryable(error: unknown): boolean` — detects transient errors, excludes rate-limited
    - `executeWithRetry<T>(operation: string, fn: () => Promise<T>): Promise<T>` — wraps operation with exponential backoff retry on transient errors only
    - `protected sleep(ms: number): Promise<void>` — testable sleep wrapper (same pattern as `RateLimiter`)
  - [x] 1.4: Implement `isRetryable()` detection logic:
    ```typescript
    isRetryable(error: unknown): boolean {
      // Never retry rate-limited errors — handled by rate-limiter
      if (rateLimiter.isRateLimited(error)) return false

      if (!(error instanceof Error)) return false

      // Check for network/transient error signals
      const msg = error.message.toLowerCase()
      const code = 'code' in error ? String((error as Record<string, unknown>).code) : ''

      // Network connectivity errors
      if (this.isNetworkError(msg, code)) return true

      // 5xx server errors from SDK
      if (this.isServerError(error)) return true

      return false
    }
    ```
  - [x] 1.5: Implement `isNetworkError()` private helper detecting: `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `UND_ERR_CONNECT_TIMEOUT`, `fetch failed`, `network`, `dns`, `getaddrinfo`, `timeout`
  - [x] 1.6: Implement `isServerError()` private helper detecting HTTP 5xx status from SDK's `parseLinearError`:
    ```typescript
    private isServerError(error: unknown): boolean {
      try {
        const parsed = parseLinearError(error as never)
        return parsed.status !== undefined && parsed.status >= 500
      } catch {
        return false
      }
    }
    ```
  - [x] 1.7: Implement exponential backoff with jitter (same formula as rate-limiter for consistency):
    ```typescript
    private calculateRetryDelay(attempt: number): number {
      const baseDelay = this.config.initialRetryDelayMs *
        Math.pow(this.config.retryMultiplier, attempt)
      const jitter = Math.random() * baseDelay * 0.1  // 10% jitter
      return Math.min(baseDelay + jitter, this.config.maxRetryDelayMs)
    }
    ```
  - [x] 1.8: Add structured logging for each retry attempt:
    - `logger.warn` on each retry attempt: `{ service: 'retry-handler', operation, attempt, maxRetries, delayMs, error: message }`
    - `logger.error` when retries exhausted: `{ service: 'retry-handler', operation, attempt, maxRetries, error: message }`
  - [x] 1.9: Export singleton with default config: `export const retryHandler = new RetryHandler()`

- [x] Task 2: Integrate retry handler into LinearClientService (AC: #6)
  - [x] 2.1: Import `retryHandler` in `backend/src/services/sync/linear-client.service.ts`:
    ```typescript
    import { retryHandler } from './retry-handler.js'
    ```
  - [x] 2.2: Update `executeWithRateTracking<T>` to wrap the rate-limit retry inside transient retry:
    ```typescript
    private async executeWithRateTracking<T>(
      operation: string,
      fn: () => Promise<T>,
    ): Promise<LinearQueryResult<T>> {
      const start = performance.now()
      await rateLimiter.waitIfNeeded()

      try {
        const data = await retryHandler.executeWithRetry(operation, async () => {
          return await rateLimiter.executeWithRetry(async () => {
            const result = await fn()
            await this.refreshRateLimitInfo()
            return result
          })
        })
        // ... existing logging and return ...
      } catch (error: unknown) {
        // ... existing classifyError ...
      }
    }
    ```
  - [x] 2.3: Verify the execution flow is: `waitIfNeeded()` → `retryHandler.executeWithRetry()` → `rateLimiter.executeWithRetry()` → `fn()` + `refreshRateLimitInfo()`
  - [x] 2.4: Ensure `classifyError` still runs on the final error after all retries are exhausted

- [x] Task 3: Add `isRetryable` utility to error types for downstream consumers (AC: #2)
  - [x] 3.1: Add `isRetryableError(error: unknown): boolean` exported function to `backend/src/utils/linear-errors.ts`:
    ```typescript
    /** Check if a classified Linear error is retryable (transient). */
    export function isRetryableError(error: unknown): boolean {
      if (error instanceof LinearNetworkError) return true
      if (error instanceof LinearApiError && error.type === 'RATE_LIMITED') return true
      return false
    }
    ```
  - [x] 3.2: Add `isNonRetryableError(error: unknown): boolean` exported function:
    ```typescript
    /** Check if a classified Linear error should NOT be retried. */
    export function isNonRetryableError(error: unknown): boolean {
      if (!(error instanceof LinearApiError)) return false
      return ['AUTHENTICATION_ERROR', 'PERMISSION_ERROR', 'NOT_FOUND', 'GRAPHQL_ERROR'].includes(error.type)
    }
    ```

- [x] Task 4: Create unit tests for retry handler (AC: #1-#5)
  - [x] 4.1: Create `backend/src/services/sync/retry-handler.test.ts`
  - [x] 4.2: Test: `isRetryable` returns `true` for ECONNREFUSED error
  - [x] 4.3: Test: `isRetryable` returns `true` for ETIMEDOUT error
  - [x] 4.4: Test: `isRetryable` returns `true` for DNS failure (ENOTFOUND) error
  - [x] 4.5: Test: `isRetryable` returns `true` for "fetch failed" error
  - [x] 4.6: Test: `isRetryable` returns `true` for 5xx server error (from SDK)
  - [x] 4.7: Test: `isRetryable` returns `false` for rate-limited error (RATELIMITED code)
  - [x] 4.8: Test: `isRetryable` returns `false` for authentication error (401)
  - [x] 4.9: Test: `isRetryable` returns `false` for permission error (403)
  - [x] 4.10: Test: `isRetryable` returns `false` for not-found error (404)
  - [x] 4.11: Test: `isRetryable` returns `false` for GraphQL schema error
  - [x] 4.12: Test: `executeWithRetry` retries on transient error up to maxRetries
  - [x] 4.13: Test: `executeWithRetry` succeeds on second attempt after transient failure
  - [x] 4.14: Test: `executeWithRetry` throws after maxRetries exhausted
  - [x] 4.15: Test: `executeWithRetry` does NOT retry on non-retryable errors (passes through immediately)
  - [x] 4.16: Test: `executeWithRetry` does NOT retry on rate-limited errors (passes through for rate-limiter)
  - [x] 4.17: Test: retry delay uses exponential backoff (verify delay progression: ~1s, ~2s, ~4s)
  - [x] 4.18: Test: retry delay is capped at maxRetryDelayMs

- [x] Task 5: Update LinearClientService tests (AC: #6)
  - [x] 5.1: Update `backend/src/services/sync/linear-client.service.test.ts`:
    - Test: `executeWithRateTracking` wraps operations with transient retry handler
    - Test: transient errors (network) are retried before being classified
    - Test: non-retryable errors (auth) pass through without transient retry

- [x] Task 6: Integration verification (AC: #1-#6)
  - [x] 6.1: `npm run build` passes with zero TypeScript errors (re-verified after review fixes)
  - [x] 6.2: `npm run lint` passes (re-verified after review fixes)
  - [x] 6.3: `npm run test:run` passes all existing and new tests (re-verified after review fixes)

## Dev Notes

### What's Already Done (from Stories 2.1 + 2.2)

| Capability | Story | Status | File |
|---|---|---|---|
| `LinearClientService` with lazy init | 2.1 | Done | `backend/src/services/sync/linear-client.service.ts` |
| `executeWithRateTracking` wrapping all API calls | 2.1 | Done | `linear-client.service.ts` |
| Error classification (`classifyError`) | 2.1 | Done | `linear-client.service.ts` |
| `isNetworkError` detection in client service | 2.1 | Done | `linear-client.service.ts` (private method) |
| `LinearApiError`, `LinearNetworkError`, `LinearConfigError` | 2.1 | Done | `backend/src/utils/linear-errors.ts` |
| `LinearApiErrorType` with `RATE_LIMITED` | 2.2 | Done | `backend/src/utils/linear-errors.ts` |
| `RateLimiter` with rate-limit-specific retry | 2.2 | Done | `backend/src/services/sync/rate-limiter.ts` |
| `rateLimiter.executeWithRetry()` — retries ONLY `RATELIMITED` | 2.2 | Done | `rate-limiter.ts` |
| `rateLimiter.isRateLimited()` — detects `RATELIMITED` code | 2.2 | Done | `rate-limiter.ts` |
| Pre-flight throttle (`waitIfNeeded`) | 2.2 | Done | `rate-limiter.ts` |
| `FullRateLimitInfo` types | 2.2 | Done | `backend/src/types/linear.types.ts` |
| Pino structured logging | 1.2 | Done | `backend/src/utils/logger.ts` |
| Error middleware with `RATE_LIMITED` handling | 2.2 | Done | `backend/src/middleware/error.middleware.ts` |
| `@linear/sdk@^73.0.0` with `parseLinearError` | 2.1 | Done | `backend/package.json` |
| Vitest configured with `--pool=threads` | 2.1 | Done | `backend/package.json` |
| 37 existing passing tests (12 client + 4 rate-limit client + 21 rate-limiter) | 2.1+2.2 | Done | test files |

### What This Story Adds

1. **`RetryHandler` service** — Reusable transient error retry with exponential backoff + jitter
2. **Transient error detection** — `isRetryable()` distinguishes transient (network, 5xx) from non-retryable (4xx, GraphQL)
3. **Integration into client** — `executeWithRateTracking` now has two retry layers: outer transient, inner rate-limit
4. **Utility functions** — `isRetryableError()` and `isNonRetryableError()` for downstream consumers
5. **Unit tests** — Full coverage of retry handler + updated integration tests

### CRITICAL: Two-Layer Retry Architecture — Do NOT Duplicate

The retry system after this story has **two distinct, non-overlapping layers**:

| Layer | Service | Retries On | Does NOT Retry On |
|---|---|---|---|
| **Outer** | `RetryHandler` (this story) | Network errors, timeouts, DNS, 5xx | Rate-limited errors, 4xx (auth, permission, not-found, GraphQL) |
| **Inner** | `RateLimiter` (Story 2.2) | `RATELIMITED` GraphQL error code only | Everything else (passes through) |

**Execution flow:**
```
waitIfNeeded() 
  → retryHandler.executeWithRetry(operation, 
      () => rateLimiter.executeWithRetry(
        () => fn() + refreshRateLimitInfo()
      )
    )
```

**Why two layers:** Rate-limit retry uses longer delays based on rate-limit state and leaky-bucket refill math. Transient retry uses shorter delays (1s, 2s, 4s) since transient errors resolve faster. Keeping them separate prevents incorrect delay calculations.

**CRITICAL: `isRetryable()` MUST check `rateLimiter.isRateLimited(error)` first and return `false` if the error is rate-limited.** This prevents the transient handler from stealing rate-limit errors that the rate-limiter should handle.

### CRITICAL: Error Classification Flow After This Story

```
SDK operation throws raw error
  ├── rateLimiter.executeWithRetry catches it
  │     ├── isRateLimited? → retry (inner loop)
  │     └── not rate limited → re-throw
  ├── retryHandler.executeWithRetry catches it
  │     ├── isRetryable? (network/5xx) → retry (outer loop)
  │     └── not retryable → re-throw
  └── classifyError() converts to typed error
        ├── LinearNetworkError (network/timeout/DNS)
        ├── LinearApiError (auth/permission/not-found/GraphQL/rate-limited)
        └── thrown to caller
```

### CRITICAL: Transient Error Detection — What Counts as Retryable

| Error Signal | Retryable? | Why |
|---|---|---|
| `ECONNREFUSED` | Yes | Server temporarily down |
| `ECONNRESET` | Yes | Connection dropped |
| `ETIMEDOUT` | Yes | Request timed out, may succeed on retry |
| `ENOTFOUND` | Yes | DNS resolution failed temporarily |
| `UND_ERR_CONNECT_TIMEOUT` | Yes | Node undici connection timeout |
| `fetch failed` | Yes | Generic fetch failure, transient |
| HTTP 500+ status | Yes | Server error, may recover |
| `RATELIMITED` GraphQL code | **No** | Handled by `RateLimiter` |
| HTTP 401 (auth error) | **No** | Invalid credentials won't self-fix |
| HTTP 403 (permission) | **No** | Permission won't change on retry |
| HTTP 404 (not found) | **No** | Resource doesn't exist |
| GraphQL schema error | **No** | Query is malformed, won't self-fix |

### CRITICAL: Using `parseLinearError` from `@linear/sdk`

The `@linear/sdk` exports `parseLinearError(error)` which extracts structured info from SDK errors:

```typescript
import { parseLinearError } from '@linear/sdk'

const parsed = parseLinearError(error as never)
// parsed.status — HTTP status code (number | undefined)
// parsed.type — LinearErrorType enum
// parsed.raw — raw error data with response info
```

Use this in `isServerError()` to detect 5xx status codes. The SDK wraps errors so `error.status` is not directly available — you MUST use `parseLinearError`.

### CRITICAL: ESM Import Pattern

All local imports MUST use `.js` extensions:
```typescript
// ✅ Correct
import { retryHandler } from './retry-handler.js'
import { rateLimiter } from './rate-limiter.js'
import { logger } from '../../utils/logger.js'

// ❌ Wrong — will fail at runtime
import { retryHandler } from './retry-handler'
```

### CRITICAL: Do NOT Install Additional Libraries

Do NOT install `p-retry`, `async-retry`, `retry`, or similar libraries. The retry logic is simple enough to implement directly and must be tightly integrated with the Linear-specific error detection (rate-limit exclusion, SDK error parsing).

### CRITICAL: Test Patterns from Previous Stories

**Mock pattern for `@linear/sdk`:**
```typescript
vi.mock('@linear/sdk', () => ({
  LinearClient: vi.fn().mockImplementation(function () {
    return { /* mock methods */ }
  }),
  parseLinearError: vi.fn(),
  LinearErrorType: { NetworkError: 'NetworkError', /* ... */ },
}))
```

**Time-sensitive tests (retry delays):**
```typescript
vi.useFakeTimers()
// ... trigger retry ...
await vi.advanceTimersByTimeAsync(1000)  // advance past first retry delay
vi.useRealTimers()
```

**Mock `rateLimiter.isRateLimited`** in retry-handler tests to control which errors are treated as rate-limited vs transient:
```typescript
vi.mock('./rate-limiter.js', () => ({
  rateLimiter: {
    isRateLimited: vi.fn().mockReturnValue(false),
    // ... other methods if needed
  },
}))
```

**Windows Vitest:** Tests must use `--pool=threads` and be scoped to `src/` directory (already configured in `package.json`).

### CRITICAL: Singleton Pattern

Follow the same singleton export pattern as `RateLimiter`:
```typescript
export const retryHandler = new RetryHandler()
```

The `RetryHandler` is stateless (no mutable state between calls), so singleton is safe and straightforward. No thread-safety concerns in Node.js single-threaded runtime.

### CRITICAL: `retryHandler.executeWithRetry` Accepts `operation` Parameter

Unlike `rateLimiter.executeWithRetry(fn)` which is operation-agnostic, the `retryHandler.executeWithRetry(operation, fn)` should accept an `operation` string parameter for structured logging. This is because the retry handler needs to log which operation is being retried.

### Architecture Compliance

**From architecture.md:**
- All business logic in services layer (not middleware, not controllers) ✅
- Retry logic for Linear API in `services/sync/` directory ✅
- Structured logging via Pino ✅
- TypeScript strict mode, no `any` without explicit reason ✅
- ESM imports with `.js` extensions ✅
- Co-located tests alongside source files ✅
- Constants: `UPPER_SNAKE_CASE` ✅

**From project-context.md:**
- Error format: `{ error: { message, code, details? } }` ✅
- Never log sensitive data (API keys, tokens) ✅
- Use Pino structured logging with context ✅
- Async/await with proper error handling ✅
- Handle Promise rejections ✅

### Cross-Story Context (Epic 2 Dependencies)

| Story | Relationship | Details |
|---|---|---|
| 2.1 GraphQL Client | Depends on | Provides `LinearClientService`, `executeWithRateTracking`, `classifyError`, error types, `parseLinearError` |
| 2.2 Rate Limit Handling | Depends on | Provides `RateLimiter`, `rateLimiter.executeWithRetry()`, `rateLimiter.isRateLimited()`. **This story wraps the rate-limit retry, does NOT replace it** |
| 2.4 Data Models & Types | Related | Story 2.4 uses `@linear/sdk` types. No conflict — this story only adds retry logic |

### Previous Story Intelligence (Stories 2.1 + 2.2)

**Learnings from Story 2.1:**
1. **SDK error parsing:** `parseLinearError()` from `@linear/sdk` is the correct way to extract status codes and error types. Use `as never` cast for TypeScript compatibility.
2. **Lazy initialization:** `linearClient` singleton uses lazy init. The retry handler doesn't need lazy init since it has no external dependencies.
3. **Vitest on Windows:** Must use `--pool=threads` flag and scope to `src/`. Mock SDK with `function` keyword (not arrow) for constructor compatibility.

**Learnings from Story 2.2:**
1. **Rate limit errors are HTTP 400, NOT HTTP 429.** Linear returns `extensions.code === 'RATELIMITED'` in GraphQL errors. The `rateLimiter.isRateLimited()` handles detection — reuse it, don't re-implement.
2. **Exponential backoff formula:** `baseDelay * 2^attempt + jitter(10%)`. Same formula should be used for consistency.
3. **`sleep()` as protected method:** Makes testing easier — subclass can override in tests.
4. **Test timing:** One test in 2.2 failed because the shared `rateLimiter` singleton accumulates state across tests. Use `vi.mock` to isolate singletons in tests.

### Git Intelligence

**Latest commit:** `55ad1a9 feat(backend): implement Linear GraphQL client (VIX-335)`
**Current branch:** `rhunnicutt/issue-2-2-implement-rate-limit-handling` (has uncommitted Story 2.2 changes)

Files modified/created in Stories 2.1+2.2:
- `backend/src/services/sync/linear-client.service.ts` — MODIFIED (will modify again)
- `backend/src/services/sync/linear-client.service.test.ts` — MODIFIED (will modify again)
- `backend/src/services/sync/rate-limiter.ts` — NEW (will import from)
- `backend/src/services/sync/rate-limiter.test.ts` — NEW (reference only)
- `backend/src/types/linear.types.ts` — MODIFIED (no changes needed)
- `backend/src/utils/linear-errors.ts` — MODIFIED (will add utility functions)
- `backend/src/middleware/error.middleware.ts` — MODIFIED (no changes needed)

### Project Structure After This Story

```
backend/src/
├── services/
│   └── sync/
│       ├── linear-client.service.ts       ← MODIFIED (integrate retry handler)
│       ├── linear-client.service.test.ts  ← MODIFIED (add transient retry tests)
│       ├── rate-limiter.ts                (unchanged)
│       ├── rate-limiter.test.ts           (unchanged)
│       ├── retry-handler.ts              ← NEW
│       └── retry-handler.test.ts         ← NEW
├── utils/
│   └── linear-errors.ts                   ← MODIFIED (add isRetryableError, isNonRetryableError)
└── ...
```

### What NOT To Do

- **Do NOT retry rate-limited errors** — handled by `RateLimiter` from Story 2.2. Check `rateLimiter.isRateLimited()` FIRST in `isRetryable()`.
- **Do NOT install `p-retry`, `async-retry`, or other retry libraries** — implement directly for tight integration with Linear-specific error detection
- **Do NOT replace or modify `RateLimiter.executeWithRetry`** — wrap it, don't change it
- **Do NOT retry authentication errors (401)** — invalid credentials won't self-fix on retry
- **Do NOT retry permission errors (403)** — permissions don't change on retry
- **Do NOT retry not-found errors (404)** — resource doesn't exist
- **Do NOT retry GraphQL schema errors** — query is malformed, won't self-fix
- **Do NOT implement circuit breaker** — deferred for simplicity in MVP
- **Do NOT check for HTTP 429** — Linear returns 400 with `RATELIMITED` GraphQL code (already handled by rate-limiter)
- **Do NOT modify `refreshRateLimitInfo`** — probe mechanism is correct as-is
- **Do NOT add `any` types** — use `unknown` and narrow with type guards
- **Do NOT use CommonJS** (`require`/`module.exports`) — backend is ESM
- **Do NOT import from `'zod'`** — must use `'zod/v4'` if needed (unlikely for this story)
- **Do NOT log full error stack traces in structured fields** — log `error.message` only; Pino serializes Error objects passed as `err` field

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Rate Limiting Strategy] — Backend API protection + Linear API respect
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns#Error Handling Standards] — Consistent error format, retry patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules#Process Patterns] — Error handling patterns, retry patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points] — Backend → Linear via `services/sync/linear-client.service.ts`
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#Story 2.3] — Story requirements and acceptance criteria
- [Source: _bmad-output/project-context.md#Critical Implementation Rules] — TypeScript, error handling, async patterns
- [Source: _bmad-output/implementation-artifacts/2-1-implement-linear-graphql-client.md] — Previous story: client service, error types, SDK patterns
- [Source: _bmad-output/implementation-artifacts/2-2-implement-rate-limit-handling.md] — Previous story: rate limiter, retry for rate-limit only, two-layer design note
- [Source: Linear API docs — SDK Errors (https://linear.app/developers/sdk-errors)] — parseLinearError, error.status, error.type
- [Source: @linear/sdk npm v73.0.0] — Official TypeScript SDK, parseLinearError utility

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- No debug issues encountered during implementation.

### Completion Notes List

- Created `RetryHandler` class with `isRetryable()`, `executeWithRetry()`, `isNetworkError()`, `isServerError()`, and `calculateRetryDelay()` methods.
- Integrated two-layer retry into `LinearClientService.executeWithRateTracking()`: outer transient retry wraps inner rate-limit retry.
- Added `isRetryableError()` and `isNonRetryableError()` utility functions to `linear-errors.ts` for downstream consumers.
- 29 unit tests for retry handler covering all transient/non-retryable error detection, retry behaviour, backoff progression, delay capping, and structured logging.
- 3 new integration tests for `LinearClientService` verifying transient retry wrapping, network error retry, and auth error pass-through.
- Updated 3 existing network error tests in `LinearClientService` from `mockRejectedValueOnce` to `mockRejectedValue` to account for retry behaviour.
- Verification re-verified after review fixes: build + lint pass; 72 tests passing.
- Code review fixes: map SDK 5xx errors to `LinearNetworkError`, adjust retry exhaustion logging, add 5xx classification test, and reconcile the story file list.

### Change Log

- **2026-02-06:** Implemented error handling and retry logic (Story 2.3 / VIX-337). Added `RetryHandler` service with exponential backoff for transient errors, integrated into `LinearClientService`, added utility error classification functions, and comprehensive test coverage.
- **2026-02-06:** Code review fixes: treat 5xx SDK errors as transient network failures, adjust retry logging attempt count, add server error classification test, and update story documentation.

### File List

- `backend/src/services/sync/retry-handler.ts` — NEW: RetryHandler class with transient error retry logic
- `backend/src/services/sync/retry-handler.test.ts` — NEW: 29 unit tests for RetryHandler
- `backend/src/services/sync/linear-client.service.ts` — MODIFIED: Integrated retryHandler into executeWithRateTracking
- `backend/src/services/sync/linear-client.service.test.ts` — MODIFIED: Added 3 transient retry integration tests, updated 3 network error tests
- `backend/src/utils/linear-errors.ts` — MODIFIED: Added isRetryableError() and isNonRetryableError() utility functions
- `backend/src/services/sync/rate-limiter.ts` — NEW: RateLimiter with rate-limit-specific retry logic
- `backend/src/services/sync/rate-limiter.test.ts` — NEW: Unit tests for RateLimiter
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: Updated story 2-3 status
- `_bmad-output/implementation-artifacts/2-3-implement-error-handling-and-retry-logic.md` — MODIFIED: Story file updated with completion status
- `_bmad-output/implementation-artifacts/2-2-implement-rate-limit-handling.md` — NEW: Story 2.2 implementation record
- `backend/src/middleware/error.middleware.ts` — MODIFIED: Added Linear rate-limit error response handling
- `backend/src/types/linear.types.ts` — MODIFIED: Added `FullRateLimitInfo` types
- `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml` — MODIFIED: Updated workflow guidance
