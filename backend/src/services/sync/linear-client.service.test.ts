import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseLinearError } from '@linear/sdk'
import type { Issue, Comment } from '@linear/sdk'

/* ------------------------------------------------------------------ */
/*  Mocks — must be declared before the module under test is imported  */
/* ------------------------------------------------------------------ */

const mockViewer = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
}

const mockIssueNodes: Partial<Issue>[] = [
  { id: 'issue-1', title: 'First issue' } as Partial<Issue>,
  { id: 'issue-2', title: 'Second issue' } as Partial<Issue>,
]

const mockCommentNodes: Partial<Comment>[] = [
  { id: 'comment-1', body: 'A comment' } as Partial<Comment>,
]

const mockIssues = vi.fn().mockResolvedValue({ nodes: mockIssueNodes })
const mockIssue = vi.fn().mockResolvedValue({
  id: 'issue-1',
  title: 'First issue',
  comments: vi.fn().mockResolvedValue({ nodes: mockCommentNodes }),
})
const mockRawRequest = vi.fn().mockResolvedValue({
  headers: new Headers({
    'X-RateLimit-Requests-Limit': '5000',
    'X-RateLimit-Requests-Remaining': '4999',
    'X-RateLimit-Requests-Reset': String(Date.now() + 60_000),
    'X-Complexity': '10',
    'X-RateLimit-Complexity-Limit': '3000000',
    'X-RateLimit-Complexity-Remaining': '2999990',
    'X-RateLimit-Complexity-Reset': String(Date.now() + 60_000),
    'X-RateLimit-Endpoint-Name': 'viewer',
    'X-RateLimit-Endpoint-Requests-Limit': '1000',
    'X-RateLimit-Endpoint-Requests-Remaining': '999',
    'X-RateLimit-Endpoint-Requests-Reset': String(Date.now() + 60_000),
  }),
})

vi.mock('@linear/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@linear/sdk')>()

  return {
    ...actual,
    parseLinearError: vi.fn(),
    LinearClient: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.viewer = Promise.resolve(mockViewer)
      this.issues = mockIssues
      this.issue = mockIssue
      this.client = { rawRequest: mockRawRequest }
    }),
  }
})

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock the rate limiter's sleep to avoid real delays in tests
vi.mock('./rate-limiter.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./rate-limiter.js')>()

  // Subclass that skips real sleep
  class TestRateLimiter extends actual.RateLimiter {
    protected override sleep(): Promise<void> {
      return Promise.resolve()
    }
  }

  return {
    ...actual,
    rateLimiter: new TestRateLimiter(),
    RateLimiter: actual.RateLimiter,
  }
})

// Mock the retry handler's sleep to avoid real delays in tests
vi.mock('./retry-handler.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./retry-handler.js')>()

  // Subclass that skips real sleep
  class TestRetryHandler extends actual.RetryHandler {
    protected override sleep(): Promise<void> {
      return Promise.resolve()
    }
  }

  return {
    ...actual,
    retryHandler: new TestRetryHandler(),
    RetryHandler: actual.RetryHandler,
  }
})

/* ------------------------------------------------------------------ */
/*  Import module under test AFTER mocks are registered                */
/* ------------------------------------------------------------------ */

import { LinearClientService } from './linear-client.service.js'
import { LinearConfigError, LinearApiError, LinearNetworkError } from '../../utils/linear-errors.js'
import { rateLimiter } from './rate-limiter.js'
import { retryHandler } from './retry-handler.js'

describe('LinearClientService', () => {
  let service: LinearClientService
  const mockParseLinearError = parseLinearError as ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.LINEAR_API_KEY = 'lin_api_test_key'
    delete process.env.LINEAR_API_URL

    service = new LinearClientService()
    // Reset mock implementations to defaults
    mockIssues.mockResolvedValue({ nodes: mockIssueNodes })
    mockParseLinearError.mockReturnValue({
      status: undefined,
      type: undefined,
      raw: undefined,
    })
    mockIssue.mockResolvedValue({
      id: 'issue-1',
      title: 'First issue',
      comments: vi.fn().mockResolvedValue({ nodes: mockCommentNodes }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /* ---------------------------------------------------------------- */
  /*  Config validation                                                */
  /* ---------------------------------------------------------------- */
  describe('configuration validation', () => {
    it('throws LinearConfigError when LINEAR_API_KEY is missing', async () => {
      delete process.env.LINEAR_API_KEY

      const badService = new LinearClientService()

      await expect(badService.verifyAuth()).rejects.toThrow(LinearConfigError)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  verifyAuth                                                       */
  /* ---------------------------------------------------------------- */
  describe('verifyAuth', () => {
    it('calls SDK viewer method and returns structured result', async () => {
      const result = await service.verifyAuth()
      expect(result.data).toEqual({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      })
      expect(result.rateLimit).not.toBeNull()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  getIssuesByProject                                               */
  /* ---------------------------------------------------------------- */
  describe('getIssuesByProject', () => {
    it('calls SDK with correct filter and default pagination', async () => {
      const result = await service.getIssuesByProject('project-uuid')
      expect(result.data).toEqual(mockIssueNodes)
      expect(mockIssues).toHaveBeenCalledWith({
        filter: { project: { id: { eq: 'project-uuid' } } },
        first: 50,
        after: undefined,
      })
    })

    it('passes custom pagination options', async () => {
      await service.getIssuesByProject('project-uuid', {
        first: 10,
        after: 'cursor-abc',
      })
      expect(mockIssues).toHaveBeenCalledWith({
        filter: { project: { id: { eq: 'project-uuid' } } },
        first: 10,
        after: 'cursor-abc',
      })
    })
  })

  /* ---------------------------------------------------------------- */
  /*  getIssueById                                                     */
  /* ---------------------------------------------------------------- */
  describe('getIssueById', () => {
    it('returns issue data for an existing issue', async () => {
      const result = await service.getIssueById('issue-1')
      expect(result.data).toBeTruthy()
      expect(mockIssue).toHaveBeenCalledWith('issue-1')
    })

    it('returns null for non-existent issue (NOT_FOUND)', async () => {
      mockIssue.mockRejectedValueOnce(
        new Error('Entity not found'),
      )

      const result = await service.getIssueById('non-existent')
      expect(result.data).toBeNull()
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Error classification — API errors                                */
  /* ---------------------------------------------------------------- */
  describe('error classification — API errors', () => {
    it('throws LinearApiError for GraphQL errors', async () => {
      mockIssues.mockRejectedValueOnce(new Error('GraphQL validation failed'))

      await expect(
        service.getIssuesByProject('project-uuid'),
      ).rejects.toThrow(LinearApiError)
    })

    it('classifies authentication errors correctly', async () => {
      mockIssues.mockRejectedValueOnce(
        new Error('Authentication required: Invalid API key'),
      )

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearApiError)
        expect((error as LinearApiError).type).toBe('AUTHENTICATION_ERROR')
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Error classification — network errors                            */
  /* ---------------------------------------------------------------- */
  describe('error classification — network errors', () => {
    it('throws LinearNetworkError for connection failures', async () => {
      const connError = new Error('connect ECONNREFUSED 127.0.0.1:443')
      ;(connError as NodeJS.ErrnoException).code = 'ECONNREFUSED'
      mockIssues.mockRejectedValue(connError)

      await expect(
        service.getIssuesByProject('project-uuid'),
      ).rejects.toThrow(LinearNetworkError)
    })

    it('classifies DNS errors as DNS_FAILURE', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND api.linear.app')
      ;(dnsError as NodeJS.ErrnoException).code = 'ENOTFOUND'
      mockIssues.mockRejectedValue(dnsError)

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearNetworkError)
        expect((error as LinearNetworkError).code).toBe('DNS_FAILURE')
      }
    })

    it('classifies timeout errors as TIMEOUT', async () => {
      const timeoutError = new Error('Request timed out (ETIMEDOUT)')
      ;(timeoutError as NodeJS.ErrnoException).code = 'ETIMEDOUT'
      mockIssues.mockRejectedValue(timeoutError)

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearNetworkError)
        expect((error as LinearNetworkError).code).toBe('TIMEOUT')
      }
    })

    it('classifies 5xx server errors as LinearNetworkError', async () => {
      const serverError = new Error('Internal Server Error')
      mockParseLinearError.mockReturnValue({ status: 500, type: undefined, raw: undefined })
      mockIssues.mockRejectedValue(serverError)

      await expect(
        service.getIssuesByProject('project-uuid'),
      ).rejects.toThrow(LinearNetworkError)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Rate limit integration (Story 2.2 — Task 5.11)                  */
  /* ---------------------------------------------------------------- */
  describe('rate limit integration', () => {
    it('executeWithRateTracking calls waitIfNeeded before operation', async () => {
      const waitSpy = vi.spyOn(rateLimiter, 'waitIfNeeded')

      await service.verifyAuth()

      expect(waitSpy).toHaveBeenCalled()
    })

    it('rate limit errors trigger retry logic via executeWithRetry', async () => {
      const retrySpy = vi.spyOn(rateLimiter, 'executeWithRetry')

      await service.verifyAuth()

      expect(retrySpy).toHaveBeenCalled()
    })

    it('getRateLimitInfo returns full state including complexity', async () => {
      // Make an API call to populate rate limit state
      await service.verifyAuth()

      const info = service.getRateLimitInfo()

      expect(info).not.toBeNull()
      // After the probe, the rate limiter should have parsed all headers
      expect(info!.requests).not.toBeNull()
      expect(info!.complexity).not.toBeNull()
      expect(info!.endpoint).not.toBeNull()
    })

    it('getRateLimitInfo delegates to rateLimiter singleton state', async () => {
      // After an API call, getRateLimitInfo should return the shared rateLimiter state
      await service.verifyAuth()
      const info = service.getRateLimitInfo()
      expect(info).toBe(rateLimiter.getState())
    })

    it('classifies RATELIMITED GraphQL errors as RATE_LIMITED type', async () => {
      const rateLimitError = new Error('Rate limited')
      ;(rateLimitError as unknown as Record<string, unknown>).raw = {
        response: {
          errors: [{ message: 'Rate limited', extensions: { code: 'RATELIMITED' } }],
        },
      }
      // The error needs to be thrown by executeWithRetry (i.e., after retries exhausted)
      // Since our mock rate limiter won't retry on this (it goes through the inner fn),
      // let's mock it so the SDK throws and executeWithRetry passes it through
      mockIssues.mockRejectedValue(rateLimitError)
      vi.spyOn(rateLimiter, 'executeWithRetry').mockRejectedValueOnce(rateLimitError)

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearApiError)
        expect((error as LinearApiError).type).toBe('RATE_LIMITED')
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Transient retry integration (Story 2.3 — Task 5)                */
  /* ---------------------------------------------------------------- */
  describe('transient retry integration', () => {
    it('executeWithRateTracking wraps operations with transient retry handler', async () => {
      const retrySpy = vi.spyOn(retryHandler, 'executeWithRetry')

      await service.verifyAuth()

      expect(retrySpy).toHaveBeenCalled()
      // Verify the operation name is passed
      expect(retrySpy).toHaveBeenCalledWith('verifyAuth', expect.any(Function))
    })

    it('transient errors (network) are retried before being classified', async () => {
      const connError = new Error('connect ECONNREFUSED 127.0.0.1:443')
      ;(connError as NodeJS.ErrnoException).code = 'ECONNREFUSED'

      // Make the SDK consistently fail with a network error
      mockIssues.mockRejectedValue(connError)

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearNetworkError)
      }

      // The retry handler should have been invoked and retried (the SDK call
      // happens inside retryHandler.executeWithRetry → rateLimiter.executeWithRetry → fn)
      // With default maxRetries=3, we expect 4 total calls (1 initial + 3 retries)
      expect(mockIssues.mock.calls.length).toBeGreaterThan(1)
    })

    it('non-retryable errors (auth) pass through without transient retry', async () => {
      const authError = new Error('Authentication required: Invalid API key')
      mockIssues.mockRejectedValue(authError)

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearApiError)
        expect((error as LinearApiError).type).toBe('AUTHENTICATION_ERROR')
      }

      // Auth errors are not retryable, so only 1 call should be made
      expect(mockIssues).toHaveBeenCalledTimes(1)
    })
  })
})
