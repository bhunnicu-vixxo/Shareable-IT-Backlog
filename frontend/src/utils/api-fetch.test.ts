import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { ApiError } from './api-error'
import { apiFetchJson } from './api-fetch'

describe('apiFetchJson', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns parsed JSON on successful response', async () => {
    const mockData = { items: [{ id: '1' }] }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await apiFetchJson('/backlog-items')
    expect(result).toEqual(mockData)
  })

  it('includes credentials: include in requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await apiFetchJson('/test')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('throws ApiError with status code on non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () =>
        Promise.resolve({
          error: { message: 'Item not found', code: 'NOT_FOUND' },
        }),
    })

    try {
      await apiFetchJson('/items/missing')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.status).toBe(404)
      expect(apiError.message).toBe('Item not found')
      expect(apiError.code).toBe('NOT_FOUND')
    }
  })

  it('does not retry 4xx errors via ApiError classification', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () =>
        Promise.resolve({
          error: { message: 'Invalid input', code: 'VALIDATION_ERROR' },
        }),
    })

    try {
      await apiFetchJson('/test')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      // 4xx errors have status < 500 — retry function should skip these
      expect(apiError.status).toBeGreaterThanOrEqual(400)
      expect(apiError.status).toBeLessThan(500)
    }
  })

  it('uses statusText fallback when error body is not JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })

    try {
      await apiFetchJson('/test')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.message).toBe('Request failed: Bad Gateway')
      expect(apiError.status).toBe(502)
    }
  })

  it('merges additional fetch options', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await apiFetchJson('/test', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      }),
    )
  })
})
