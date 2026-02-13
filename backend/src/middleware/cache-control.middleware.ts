import { createHash } from 'node:crypto'
import type { Request, Response } from 'express'

/**
 * Options for setting HTTP cache control headers.
 */
export interface CacheHeaderOptions {
  /** Cache-Control header value (e.g. 'public, max-age=60, stale-while-revalidate=300') */
  cacheControl: string
  /** Whether to compute and set an ETag header from the response body */
  etag?: boolean
}

/**
 * Generate an ETag from a string body using MD5 hash.
 *
 * Returns a strong ETag in the format `"<hex-hash>"`.
 * Strong ETags are appropriate here because our JSON responses are
 * byte-identical for the same underlying data.
 */
export function generateETag(body: string): string {
  return `"${createHash('md5').update(body).digest('hex')}"`
}

/**
 * Check if the request's `If-None-Match` header matches the given ETag.
 *
 * Returns true if the client's cached version matches, meaning we can
 * respond with 304 Not Modified.
 */
export function isETagMatch(req: Request, etag: string): boolean {
  const ifNoneMatch = req.headers['if-none-match']
  if (!ifNoneMatch) return false

  const normalize = (tag: string): string => {
    const trimmed = tag.trim()
    return trimmed.startsWith('W/') ? trimmed.slice(2).trim() : trimmed
  }

  const candidateTags = Array.isArray(ifNoneMatch)
    ? ifNoneMatch
    : ifNoneMatch.split(',')

  // Handle wildcard or comma-separated list of ETags (and weak ETags).
  return candidateTags.some((tag) => {
    const trimmed = tag.trim()
    if (trimmed === '*') return true
    return normalize(trimmed) === normalize(etag)
  })
}

/**
 * Set cache control headers on a response.
 *
 * If `etag` option is true, computes an ETag from the serialized body
 * and checks `If-None-Match` for conditional response.
 *
 * @returns `true` if a 304 response was sent (caller should NOT send body),
 *          `false` if caller should proceed to send the full response.
 */
export function setCacheHeaders(
  req: Request,
  res: Response,
  body: string,
  options: CacheHeaderOptions,
): boolean {
  res.setHeader('Cache-Control', options.cacheControl)

  if (options.etag) {
    const etag = generateETag(body)
    res.setHeader('ETag', etag)

    if (isETagMatch(req, etag)) {
      res.status(304).end()
      return true
    }
  }

  return false
}
