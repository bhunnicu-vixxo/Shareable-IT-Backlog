import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseLinearError } from '@linear/sdk'

/* ------------------------------------------------------------------ */
/*  Mocks — must be declared before the module under test is imported  */
/* ------------------------------------------------------------------ */

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@linear/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@linear/sdk')>()
  return {
    ...actual,
    parseLinearError: vi.fn().mockReturnValue({
      status: undefined,
      type: undefined,
      raw: undefined,
    }),
  }
})

vi.mock('./rate-limiter.js', () => ({
  rateLimiter: {
    isRateLimited: vi.fn().mockReturnValue(false),
    executeWithRetry: vi.fn(),
    waitIfNeeded: vi.fn().mockResolvedValue(undefined),
    updateFromHeaders: vi.fn(),
    getState: vi.fn().mockReturnValue(null),
  },
}))

/* ------------------------------------------------------------------ */
/*  Import after mocks                                                 */
/* ------------------------------------------------------------------ */

import { RetryHandler } from './retry-handler.js'
import { rateLimiter } from './rate-limiter.js'
import { logger } from '../../utils/logger.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Testable subclass that captures sleep calls without real delays. */
class TestableRetryHandler extends RetryHandler {
  public sleepCalls: number[] = []

  protected override sleep(ms: number): Promise<void> {
    this.sleepCalls.push(ms)
    return Promise.resolve()
  }
}

/** Create a network error with a code property. */
function createNetworkError(message: string, code?: string): Error {
  const error = new Error(message)
  if (code) {
    ;(error as NodeJS.ErrnoException).code = code
  }
  return error
}

/** Create a rate-limit error that mimics the SDK's RATELIMITED GraphQL error. */
function createRateLimitError(): Error {
  const error = new Error('Rate limited')
  ;(error as unknown as Record<string, unknown>).raw = {
    response: {
      errors: [
        {
          message: 'Rate limited',
          extensions: { code: 'RATELIMITED' },
        },
      ],
    },
  }
  return error
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('RetryHandler', () => {
  let handler: TestableRetryHandler
  const mockIsRateLimited = rateLimiter.isRateLimited as ReturnType<typeof vi.fn>
  const mockParseLinearError = parseLinearError as ReturnType<typeof vi.fn>

  beforeEach(() => {
    handler = new TestableRetryHandler()
    vi.clearAllMocks()
    // Default: nothing is rate-limited, parseLinearError returns undefined status
    mockIsRateLimited.mockReturnValue(false)
    mockParseLinearError.mockReturnValue({
      status: undefined,
      type: undefined,
      raw: undefined,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* ---------------------------------------------------------------- */
  /*  4.2-4.6: isRetryable returns true for transient errors           */
  /* ---------------------------------------------------------------- */
  describe('isRetryable — transient errors (returns true)', () => {
    it('returns true for ECONNREFUSED error', () => {
      const error = createNetworkError('connect ECONNREFUSED 127.0.0.1:443', 'ECONNREFUSED')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for ETIMEDOUT error', () => {
      const error = createNetworkError('Request timed out', 'ETIMEDOUT')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for DNS failure (ENOTFOUND) error', () => {
      const error = createNetworkError('getaddrinfo ENOTFOUND api.linear.app', 'ENOTFOUND')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for "fetch failed" error', () => {
      const error = new Error('fetch failed')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for 5xx server error (from SDK)', () => {
      const error = new Error('Internal Server Error')
      mockParseLinearError.mockReturnValue({ status: 500, type: undefined, raw: undefined })
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for ECONNRESET error', () => {
      const error = createNetworkError('socket hang up', 'ECONNRESET')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for UND_ERR_CONNECT_TIMEOUT error', () => {
      const error = createNetworkError('Connect timeout', 'UND_ERR_CONNECT_TIMEOUT')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for error with "network" in message', () => {
      const error = new Error('network error occurred')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for error with "dns" in message', () => {
      const error = new Error('dns resolution failed')
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for HTTP 502 server error', () => {
      const error = new Error('Bad Gateway')
      mockParseLinearError.mockReturnValue({ status: 502, type: undefined, raw: undefined })
      expect(handler.isRetryable(error)).toBe(true)
    })

    it('returns true for HTTP 503 server error', () => {
      const error = new Error('Service Unavailable')
      mockParseLinearError.mockReturnValue({ status: 503, type: undefined, raw: undefined })
      expect(handler.isRetryable(error)).toBe(true)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  4.7-4.11: isRetryable returns false for non-retryable errors     */
  /* ---------------------------------------------------------------- */
  describe('isRetryable — non-retryable errors (returns false)', () => {
    it('returns false for rate-limited error (RATELIMITED code)', () => {
      const error = createRateLimitError()
      mockIsRateLimited.mockReturnValue(true)
      expect(handler.isRetryable(error)).toBe(false)
    })

    it('returns false for authentication error (401)', () => {
      const error = new Error('Authentication required: Invalid API key')
      mockParseLinearError.mockReturnValue({ status: 401, type: undefined, raw: undefined })
      expect(handler.isRetryable(error)).toBe(false)
    })

    it('returns false for permission error (403)', () => {
      const error = new Error('Forbidden')
      mockParseLinearError.mockReturnValue({ status: 403, type: undefined, raw: undefined })
      expect(handler.isRetryable(error)).toBe(false)
    })

    it('returns false for not-found error (404)', () => {
      const error = new Error('Entity not found')
      mockParseLinearError.mockReturnValue({ status: 404, type: undefined, raw: undefined })
      expect(handler.isRetryable(error)).toBe(false)
    })

    it('returns false for GraphQL schema error', () => {
      const error = new Error('GraphQL validation failed: field does not exist')
      expect(handler.isRetryable(error)).toBe(false)
    })

    it('returns false for non-Error values', () => {
      expect(handler.isRetryable('string error')).toBe(false)
      expect(handler.isRetryable(null)).toBe(false)
      expect(handler.isRetryable(undefined)).toBe(false)
      expect(handler.isRetryable(42)).toBe(false)
    })

    it('returns false when parseLinearError throws', () => {
      const error = new Error('Unknown server issue')
      mockParseLinearError.mockImplementation(() => {
        throw new Error('parse failed')
      })
      expect(handler.isRetryable(error)).toBe(false)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  4.12-4.16: executeWithRetry behaviour                            */
  /* ---------------------------------------------------------------- */
  describe('executeWithRetry', () => {
    it('retries on transient error up to maxRetries', async () => {
      const transientError = createNetworkError('connect ECONNREFUSED', 'ECONNREFUSED')
      const fn = vi.fn().mockRejectedValue(transientError)

      await expect(handler.executeWithRetry('testOp', fn)).rejects.toThrow('connect ECONNREFUSED')

      // 1 initial + 3 retries = 4 total calls
      expect(fn).toHaveBeenCalledTimes(4)
      // 3 retries → 3 sleep calls
      expect(handler.sleepCalls.length).toBe(3)
    })

    it('succeeds on second attempt after transient failure', async () => {
      const transientError = createNetworkError('fetch failed')
      const fn = vi.fn()
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce('success')

      const result = await handler.executeWithRetry('testOp', fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
      expect(handler.sleepCalls.length).toBe(1)
    })

    it('throws after maxRetries exhausted', async () => {
      const transientError = createNetworkError('connect ECONNREFUSED', 'ECONNREFUSED')
      const fn = vi.fn().mockRejectedValue(transientError)

      await expect(handler.executeWithRetry('testOp', fn)).rejects.toThrow('connect ECONNREFUSED')
      expect(fn).toHaveBeenCalledTimes(4) // 1 + 3 retries
    })

    it('does NOT retry on non-retryable errors (passes through immediately)', async () => {
      const authError = new Error('Authentication required')
      mockParseLinearError.mockReturnValue({ status: 401, type: undefined, raw: undefined })
      // authError is not retryable (401 status, no network signals)
      const fn = vi.fn().mockRejectedValue(authError)

      await expect(handler.executeWithRetry('testOp', fn)).rejects.toThrow('Authentication required')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(handler.sleepCalls.length).toBe(0)
    })

    it('does NOT retry on rate-limited errors (passes through for rate-limiter)', async () => {
      const rateLimitError = createRateLimitError()
      mockIsRateLimited.mockReturnValue(true)
      const fn = vi.fn().mockRejectedValue(rateLimitError)

      await expect(handler.executeWithRetry('testOp', fn)).rejects.toThrow('Rate limited')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(handler.sleepCalls.length).toBe(0)
    })

    it('succeeds on first try without retrying', async () => {
      const fn = vi.fn().mockResolvedValue('immediate success')

      const result = await handler.executeWithRetry('testOp', fn)

      expect(result).toBe('immediate success')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(handler.sleepCalls.length).toBe(0)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  4.17-4.18: Retry delay behaviour                                 */
  /* ---------------------------------------------------------------- */
  describe('retry delay', () => {
    it('uses exponential backoff (verify delay progression: ~1s, ~2s, ~4s)', async () => {
      const transientError = createNetworkError('connect ECONNREFUSED', 'ECONNREFUSED')
      const fn = vi.fn().mockRejectedValue(transientError)

      await expect(handler.executeWithRetry('testOp', fn)).rejects.toThrow()

      expect(handler.sleepCalls.length).toBe(3)

      // First delay: ~1000ms (1000 * 2^0 + jitter ≤ 10%)
      expect(handler.sleepCalls[0]).toBeGreaterThanOrEqual(1000)
      expect(handler.sleepCalls[0]).toBeLessThanOrEqual(1100)

      // Second delay: ~2000ms (1000 * 2^1 + jitter ≤ 10%)
      expect(handler.sleepCalls[1]).toBeGreaterThanOrEqual(2000)
      expect(handler.sleepCalls[1]).toBeLessThanOrEqual(2200)

      // Third delay: ~4000ms (1000 * 2^2 + jitter ≤ 10%)
      expect(handler.sleepCalls[2]).toBeGreaterThanOrEqual(4000)
      expect(handler.sleepCalls[2]).toBeLessThanOrEqual(4400)
    })

    it('retry delay is capped at maxRetryDelayMs', async () => {
      // Use a very low max delay to test capping
      const capped = new TestableRetryHandler({
        maxRetries: 5,
        initialRetryDelayMs: 1000,
        retryMultiplier: 4,
        maxRetryDelayMs: 3000,
      })

      const transientError = createNetworkError('fetch failed')
      const fn = vi.fn().mockRejectedValue(transientError)

      await expect(capped.executeWithRetry('testOp', fn)).rejects.toThrow()

      // All delays should be ≤ maxRetryDelayMs
      for (const delay of capped.sleepCalls) {
        expect(delay).toBeLessThanOrEqual(3000)
      }

      // Later delays that would exceed 3000ms should be capped
      // attempt 0: 1000*4^0 = 1000 (ok)
      // attempt 1: 1000*4^1 = 4000 → capped at 3000
      expect(capped.sleepCalls[1]).toBeLessThanOrEqual(3000)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Structured logging                                               */
  /* ---------------------------------------------------------------- */
  describe('structured logging', () => {
    it('logs warn on each retry attempt with full context', async () => {
      const transientError = createNetworkError('fetch failed')
      const fn = vi.fn()
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce('success')

      await handler.executeWithRetry('getIssues', fn)

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'retry-handler',
          operation: 'getIssues',
          attempt: 1,
          maxRetries: 3,
          error: 'fetch failed',
        }),
        'Transient error — retrying with backoff',
      )
    })

    it('logs error when retries exhausted', async () => {
      const transientError = createNetworkError('connect ECONNREFUSED', 'ECONNREFUSED')
      const fn = vi.fn().mockRejectedValue(transientError)

      await expect(handler.executeWithRetry('getIssues', fn)).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'retry-handler',
          operation: 'getIssues',
          attempt: 3,
          maxRetries: 3,
          error: 'connect ECONNREFUSED',
        }),
        'Transient retries exhausted',
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Configuration                                                    */
  /* ---------------------------------------------------------------- */
  describe('configuration', () => {
    it('accepts custom configuration', async () => {
      const custom = new TestableRetryHandler({
        maxRetries: 1,
        initialRetryDelayMs: 500,
      })

      const transientError = createNetworkError('fetch failed')
      const fn = vi.fn().mockRejectedValue(transientError)

      await expect(custom.executeWithRetry('testOp', fn)).rejects.toThrow()

      // 1 initial + 1 retry = 2 calls
      expect(fn).toHaveBeenCalledTimes(2)
      expect(custom.sleepCalls.length).toBe(1)
      expect(custom.sleepCalls[0]).toBeGreaterThanOrEqual(500)
    })
  })
})
