import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import {
  generateETag,
  isETagMatch,
  setCacheHeaders,
} from './cache-control.middleware.js'

function createMockReq(headers: Record<string, string> = {}): Request {
  return {
    headers: { ...headers },
  } as unknown as Request
}

function createMockRes(): Response & { _headers: Map<string, string>; _ended: boolean } {
  const headersMap = new Map<string, string>()
  const res = {
    _headers: headersMap,
    _ended: false,
    setHeader: vi.fn((name: string, value: string) => {
      headersMap.set(name, value)
    }),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(function (this: { _ended: boolean }) {
      this._ended = true
    }),
  } as unknown as Response & { _headers: Map<string, string>; _ended: boolean }
  return res
}

describe('cache-control.middleware', () => {
  describe('generateETag', () => {
    it('should return a quoted MD5 hash string', () => {
      const etag = generateETag('hello world')
      // MD5 of "hello world" = 5eb63bbbe01eeed093cb22bb8f5acdc3
      expect(etag).toBe('"5eb63bbbe01eeed093cb22bb8f5acdc3"')
    })

    it('should return consistent ETags for the same input', () => {
      const body = JSON.stringify({ items: [1, 2, 3] })
      expect(generateETag(body)).toBe(generateETag(body))
    })

    it('should return different ETags for different inputs', () => {
      expect(generateETag('body-a')).not.toBe(generateETag('body-b'))
    })
  })

  describe('isETagMatch', () => {
    it('should return true when If-None-Match matches exactly', () => {
      const req = createMockReq({ 'if-none-match': '"abc123"' })
      expect(isETagMatch(req, '"abc123"')).toBe(true)
    })

    it('should return false when If-None-Match does not match', () => {
      const req = createMockReq({ 'if-none-match': '"abc123"' })
      expect(isETagMatch(req, '"def456"')).toBe(false)
    })

    it('should return false when If-None-Match header is absent', () => {
      const req = createMockReq()
      expect(isETagMatch(req, '"abc123"')).toBe(false)
    })

    it('should handle comma-separated ETag list', () => {
      const req = createMockReq({ 'if-none-match': '"aaa", "bbb", "ccc"' })
      expect(isETagMatch(req, '"bbb"')).toBe(true)
      expect(isETagMatch(req, '"ddd"')).toBe(false)
    })

    it('should treat weak ETags as a match for strong ETags', () => {
      const req = createMockReq({ 'if-none-match': 'W/"abc123"' })
      expect(isETagMatch(req, '"abc123"')).toBe(true)
    })

    it('should treat wildcard If-None-Match as a match', () => {
      const req = createMockReq({ 'if-none-match': '*' })
      expect(isETagMatch(req, '"anything"')).toBe(true)
    })
  })

  describe('setCacheHeaders', () => {
    it('should set Cache-Control header', () => {
      const req = createMockReq()
      const res = createMockRes()

      const sent304 = setCacheHeaders(req, res, '{"data": true}', {
        cacheControl: 'public, max-age=60',
      })

      expect(sent304).toBe(false)
      expect(res._headers.get('Cache-Control')).toBe('public, max-age=60')
    })

    it('should set ETag header when etag option is true', () => {
      const req = createMockReq()
      const res = createMockRes()

      setCacheHeaders(req, res, '{"data": true}', {
        cacheControl: 'public, max-age=60',
        etag: true,
      })

      expect(res._headers.has('ETag')).toBe(true)
      expect(res._headers.get('ETag')).toMatch(/^"[a-f0-9]{32}"$/)
    })

    it('should return 304 when ETag matches If-None-Match', () => {
      const body = '{"items": [1, 2, 3]}'
      const etag = generateETag(body)
      const req = createMockReq({ 'if-none-match': etag })
      const res = createMockRes()

      const sent304 = setCacheHeaders(req, res, body, {
        cacheControl: 'public, max-age=60',
        etag: true,
      })

      expect(sent304).toBe(true)
      expect(res.status).toHaveBeenCalledWith(304)
      expect(res.end).toHaveBeenCalled()
    })

    it('should not return 304 when ETag does not match', () => {
      const req = createMockReq({ 'if-none-match': '"old-etag"' })
      const res = createMockRes()

      const sent304 = setCacheHeaders(req, res, '{"data": true}', {
        cacheControl: 'public, max-age=60',
        etag: true,
      })

      expect(sent304).toBe(false)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should not compute ETag when etag option is false/absent', () => {
      const req = createMockReq()
      const res = createMockRes()

      setCacheHeaders(req, res, '{"data": true}', {
        cacheControl: 'no-cache',
      })

      expect(res._headers.has('ETag')).toBe(false)
    })
  })
})
