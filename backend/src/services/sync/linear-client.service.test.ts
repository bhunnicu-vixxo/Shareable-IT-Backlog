import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    // SDK docs say this is a unix timestamp; story expects ms.
    // We use ms here to match story contract.
    'X-RateLimit-Requests-Reset': String(Date.now() + 60_000),
  }),
})

vi.mock('@linear/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@linear/sdk')>()

  return {
    ...actual,
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

/* ------------------------------------------------------------------ */
/*  Import module under test AFTER mocks are registered                */
/* ------------------------------------------------------------------ */

import { LinearClientService } from './linear-client.service.js'
import { LinearConfigError, LinearApiError, LinearNetworkError } from '../../utils/linear-errors.js'

describe('LinearClientService', () => {
  let service: LinearClientService

  beforeEach(() => {
    process.env.LINEAR_API_KEY = 'lin_api_test_key'
    delete process.env.LINEAR_API_URL

    service = new LinearClientService()
    // Reset mock implementations to defaults
    mockIssues.mockResolvedValue({ nodes: mockIssueNodes })
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
  /*  Task 6.2 — Config validation                                    */
  /* ---------------------------------------------------------------- */
  describe('configuration validation', () => {
    it('throws LinearConfigError when LINEAR_API_KEY is missing', async () => {
      delete process.env.LINEAR_API_KEY

      // Create a fresh instance so config is re-evaluated.
      const badService = new LinearClientService()

      await expect(badService.verifyAuth()).rejects.toThrow(LinearConfigError)
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Task 6.3 — verifyAuth                                           */
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
  /*  Task 6.4 — getIssuesByProject                                   */
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
  /*  Task 6.5 — getIssueById returns null for non-existent issue     */
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
  /*  Task 6.6 — GraphQL errors → LinearApiError                      */
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
  /*  Task 6.7 — Network errors → LinearNetworkError                  */
  /* ---------------------------------------------------------------- */
  describe('error classification — network errors', () => {
    it('throws LinearNetworkError for connection failures', async () => {
      const connError = new Error('connect ECONNREFUSED 127.0.0.1:443')
      ;(connError as NodeJS.ErrnoException).code = 'ECONNREFUSED'
      mockIssues.mockRejectedValueOnce(connError)

      await expect(
        service.getIssuesByProject('project-uuid'),
      ).rejects.toThrow(LinearNetworkError)
    })

    it('classifies DNS errors as DNS_FAILURE', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND api.linear.app')
      ;(dnsError as NodeJS.ErrnoException).code = 'ENOTFOUND'
      mockIssues.mockRejectedValueOnce(dnsError)

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
      mockIssues.mockRejectedValueOnce(timeoutError)

      try {
        await service.getIssuesByProject('project-uuid')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LinearNetworkError)
        expect((error as LinearNetworkError).code).toBe('TIMEOUT')
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /*  Task 6.8 — getRateLimitInfo                                     */
  /* ---------------------------------------------------------------- */
  describe('getRateLimitInfo', () => {
    it('returns null before any API calls', () => {
      const freshService = new LinearClientService()
      expect(freshService.getRateLimitInfo()).toBeNull()
    })
  })
})
