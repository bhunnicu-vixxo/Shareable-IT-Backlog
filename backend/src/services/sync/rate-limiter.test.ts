import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

/* ------------------------------------------------------------------ */
/*  Import after mocks                                                 */
/* ------------------------------------------------------------------ */

import { RateLimiter } from './rate-limiter.js'
import { logger } from '../../utils/logger.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build a Headers object with all three rate-limit dimension headers. */
function buildFullHeaders(overrides: Partial<{
  reqLimit: string
  reqRemaining: string
  reqReset: string
  complexity: string
  compLimit: string
  compRemaining: string
  compReset: string
  endpointName: string
  endpointLimit: string
  endpointRemaining: string
  endpointReset: string
}> = {}): Headers {
  return new Headers({
    'X-RateLimit-Requests-Limit': overrides.reqLimit ?? '5000',
    'X-RateLimit-Requests-Remaining': overrides.reqRemaining ?? '4500',
    'X-RateLimit-Requests-Reset': overrides.reqReset ?? String(Date.now() - 10_000),
    'X-Complexity': overrides.complexity ?? '25',
    'X-RateLimit-Complexity-Limit': overrides.compLimit ?? '3000000',
    'X-RateLimit-Complexity-Remaining': overrides.compRemaining ?? '2999000',
    'X-RateLimit-Complexity-Reset': overrides.compReset ?? String(Date.now() - 10_000),
    'X-RateLimit-Endpoint-Name': overrides.endpointName ?? 'issues',
    'X-RateLimit-Endpoint-Requests-Limit': overrides.endpointLimit ?? '1000',
    'X-RateLimit-Endpoint-Requests-Remaining': overrides.endpointRemaining ?? '950',
    'X-RateLimit-Endpoint-Requests-Reset': overrides.endpointReset ?? String(Date.now() - 10_000),
  })
}

/** Build a Headers object with only request limit headers. */
function buildRequestOnlyHeaders(overrides: Partial<{
  limit: string
  remaining: string
  reset: string
}> = {}): Headers {
  return new Headers({
    'X-RateLimit-Requests-Limit': overrides.limit ?? '5000',
    'X-RateLimit-Requests-Remaining': overrides.remaining ?? '4500',
    'X-RateLimit-Requests-Reset': overrides.reset ?? String(Date.now() - 10_000),
  })
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

/** Testable subclass that exposes sleep for mocking. */
class TestableRateLimiter extends RateLimiter {
  public sleepCalls: number[] = []

  protected override sleep(ms: number): Promise<void> {
    this.sleepCalls.push(ms)
    return Promise.resolve()
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('RateLimiter', () => {
  let limiter: TestableRateLimiter

  beforeEach(() => {
    limiter = new TestableRateLimiter()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* ---------------------------------------------------------------- */
  /*  5.2: updateFromHeaders parses all three header groups            */
  /* ---------------------------------------------------------------- */
  describe('updateFromHeaders', () => {
    it('correctly parses all three header groups (request, complexity, endpoint)', () => {
      const headers = buildFullHeaders({
        reqLimit: '5000',
        reqRemaining: '4500',
        reqReset: '1700000000000',
        complexity: '25',
        compLimit: '3000000',
        compRemaining: '2999000',
        compReset: '1700000000000',
        endpointName: 'issues',
        endpointLimit: '1000',
        endpointRemaining: '950',
        endpointReset: '1700000000000',
      })

      const state = limiter.updateFromHeaders(headers)

      expect(state.requests).toEqual({
        limit: 5000,
        remaining: 4500,
        reset: 1700000000000,
      })

      expect(state.complexity).toEqual({
        complexity: 25,
        limit: 3000000,
        remaining: 2999000,
        reset: 1700000000000,
      })

      expect(state.endpoint).toEqual({
        name: 'issues',
        limit: 1000,
        remaining: 950,
        reset: 1700000000000,
      })
    })

    it('returns null for dimensions with missing headers', () => {
      // Only request headers — no complexity or endpoint
      const headers = buildRequestOnlyHeaders()

      const state = limiter.updateFromHeaders(headers)

      expect(state.requests).not.toBeNull()
      expect(state.complexity).toBeNull()
      expect(state.endpoint).toBeNull()
    })

    it('stores state accessible via getState()', () => {
      expect(limiter.getState()).toBeNull()

      limiter.updateFromHeaders(buildFullHeaders())

      expect(limiter.getState()).not.toBeNull()
      expect(limiter.getState()!.requests).not.toBeNull()
      expect(limiter.getState()!.complexity).not.toBeNull()
      expect(limiter.getState()!.endpoint).not.toBeNull()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  5.3/5.4: waitIfNeeded throttle logic                             */
  /* ---------------------------------------------------------------- */
  describe('waitIfNeeded', () => {
    it('delays when remaining tokens are below safety threshold', async () => {
      // Remaining = 100 out of 5000 = 2%, threshold is 10% = 500
      // Reset was recent so not many tokens refilled
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '100',
        reset: String(Date.now()),
      }))

      await limiter.waitIfNeeded()

      expect(limiter.sleepCalls.length).toBe(1)
      expect(limiter.sleepCalls[0]).toBeGreaterThan(0)
    })

    it('does NOT delay when tokens are above threshold', async () => {
      // Remaining = 4500 out of 5000 = 90%, well above 10% threshold
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '4500',
        reset: String(Date.now() - 10_000),
      }))

      await limiter.waitIfNeeded()

      expect(limiter.sleepCalls.length).toBe(0)
    })

    it('does not delay when no state exists', async () => {
      await limiter.waitIfNeeded()

      expect(limiter.sleepCalls.length).toBe(0)
    })

    it('considers refilled tokens when calculating wait', async () => {
      vi.useFakeTimers()
      try {
        const now = Date.now()
        // Remaining = 0, reset is in the future, and we advance time to simulate refill
        // Refill rate = 5000/3600 ≈ 1.389/s, after 1800s ≈ 2500 refilled
        // Safety threshold = 500 (10% of 5000)
        // Estimated = min(0 + 2500, 5000) = 2500 > 500 → no wait needed
        limiter.updateFromHeaders(buildRequestOnlyHeaders({
          limit: '5000',
          remaining: '0',
          reset: String(now + 3_600_000),
        }))

        vi.setSystemTime(now + 1_800_000)

        await limiter.waitIfNeeded()

        expect(limiter.sleepCalls.length).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /*  5.5/5.6: isRateLimited detection                                 */
  /* ---------------------------------------------------------------- */
  describe('isRateLimited', () => {
    it('detects RATELIMITED GraphQL error code', () => {
      const error = createRateLimitError()

      expect(limiter.isRateLimited(error)).toBe(true)
    })

    it('returns false for non-rate-limit errors', () => {
      const error = new Error('Some other GraphQL error')
      ;(error as unknown as Record<string, unknown>).raw = {
        response: {
          errors: [
            {
              message: 'Validation error',
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            },
          ],
        },
      }

      expect(limiter.isRateLimited(error)).toBe(false)
    })

    it('returns false for non-Error values', () => {
      expect(limiter.isRateLimited('string error')).toBe(false)
      expect(limiter.isRateLimited(null)).toBe(false)
      expect(limiter.isRateLimited(undefined)).toBe(false)
      expect(limiter.isRateLimited(42)).toBe(false)
    })

    it('detects rate limit from error message as fallback', () => {
      const error = new Error('You have been rate limited')

      expect(limiter.isRateLimited(error)).toBe(true)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  5.7/5.8/5.9: executeWithRetry                                    */
  /* ---------------------------------------------------------------- */
  describe('executeWithRetry', () => {
    it('retries on rate limit error with exponential backoff', async () => {
      const rateLimitError = createRateLimitError()
      const fn = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success')

      const result = await limiter.executeWithRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
      // Two retries should have two sleep calls with increasing delays
      expect(limiter.sleepCalls.length).toBe(2)
      expect(limiter.sleepCalls[1]).toBeGreaterThan(limiter.sleepCalls[0])
    })

    it('gives up after maxRetries', async () => {
      const rateLimitError = createRateLimitError()
      const fn = vi.fn().mockRejectedValue(rateLimitError)

      await expect(limiter.executeWithRetry(fn)).rejects.toThrow('Rate limited')

      // 1 initial + 3 retries = 4 total calls
      expect(fn).toHaveBeenCalledTimes(4)
      // 3 retries → 3 sleep calls
      expect(limiter.sleepCalls.length).toBe(3)
    })

    it('does NOT retry on non-rate-limit errors (passes through)', async () => {
      const genericError = new Error('Generic GraphQL error')
      const fn = vi.fn().mockRejectedValue(genericError)

      await expect(limiter.executeWithRetry(fn)).rejects.toThrow('Generic GraphQL error')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(limiter.sleepCalls.length).toBe(0)
    })

    it('succeeds on first try without retrying', async () => {
      const fn = vi.fn().mockResolvedValue('immediate success')

      const result = await limiter.executeWithRetry(fn)

      expect(result).toBe('immediate success')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(limiter.sleepCalls.length).toBe(0)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  5.10: Delay calculation uses leaky bucket refill model            */
  /* ---------------------------------------------------------------- */
  describe('delay calculation - leaky bucket model', () => {
    it('calculates delay based on refill rate when tokens are critically low', async () => {
      // Set up: 0 remaining, reset just happened (no refill yet)
      // Threshold = 10% of 5000 = 500 tokens needed
      // Refill rate = 5000/3600 ≈ 1.389 tokens/sec
      // Wait = (500 / 1.389) * 1000 ≈ 360,000ms = ~6 minutes
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '0',
        reset: String(Date.now()),
      }))

      await limiter.waitIfNeeded()

      expect(limiter.sleepCalls.length).toBe(1)
      // Should be roughly 360 seconds (360,000ms)
      const waitMs = limiter.sleepCalls[0]
      expect(waitMs).toBeGreaterThan(300_000)
      expect(waitMs).toBeLessThan(400_000)
    })

    it('uses the larger wait time when both request and complexity limits are low', async () => {
      // Both dimensions critically low
      const headers = new Headers({
        'X-RateLimit-Requests-Limit': '5000',
        'X-RateLimit-Requests-Remaining': '50',
        'X-RateLimit-Requests-Reset': String(Date.now()),
        'X-Complexity': '25',
        'X-RateLimit-Complexity-Limit': '3000000',
        'X-RateLimit-Complexity-Remaining': '100000',
        'X-RateLimit-Complexity-Reset': String(Date.now()),
      })

      limiter.updateFromHeaders(headers)
      await limiter.waitIfNeeded()

      expect(limiter.sleepCalls.length).toBe(1)
      // The wait should be the longer of the two dimension waits
      expect(limiter.sleepCalls[0]).toBeGreaterThan(0)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Observability logging                                            */
  /* ---------------------------------------------------------------- */
  describe('observability logging', () => {
    it('logs at warn level when approaching limits (< 20% remaining)', () => {
      // 15% remaining
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '750',
        reset: String(Date.now()),
      }))

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'rate-limiter',
          dimension: 'requests',
        }),
        'Approaching rate limit',
      )
    })

    it('logs at error level when critically low (< 10% remaining)', () => {
      // 5% remaining
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '250',
        reset: String(Date.now()),
      }))

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'rate-limiter',
          dimension: 'requests',
        }),
        'Rate limit critically low',
      )
    })

    it('logs at debug level for normal rate limit status', () => {
      // 90% remaining
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '4500',
        reset: String(Date.now()),
      }))

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'rate-limiter',
          dimension: 'requests',
        }),
        'Rate limit status',
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Configuration                                                    */
  /* ---------------------------------------------------------------- */
  describe('configuration', () => {
    it('accepts custom configuration', async () => {
      const customLimiter = new TestableRateLimiter({
        safetyThresholdPercent: 0.50, // 50% — much higher threshold
        maxRetries: 1,
      })

      // 40% remaining — below 50% custom threshold
      customLimiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '2000',
        reset: String(Date.now()),
      }))

      await customLimiter.waitIfNeeded()
      expect(customLimiter.sleepCalls.length).toBe(1)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Retry-After suggestion                                           */
  /* ---------------------------------------------------------------- */
  describe('getSuggestedRetryAfterMs', () => {
    it('returns null when no state exists', () => {
      expect(limiter.getSuggestedRetryAfterMs()).toBeNull()
    })

    it('returns a positive delay when below threshold', () => {
      limiter.updateFromHeaders(buildRequestOnlyHeaders({
        limit: '5000',
        remaining: '0',
        reset: String(Date.now() + 3_600_000),
      }))

      const retryAfterMs = limiter.getSuggestedRetryAfterMs()

      expect(retryAfterMs).not.toBeNull()
      expect(retryAfterMs!).toBeGreaterThan(0)
    })
  })
})
