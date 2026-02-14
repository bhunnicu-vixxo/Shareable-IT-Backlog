import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

/**
 * Middleware that measures and logs API response times.
 *
 * - Records `process.hrtime.bigint()` at request start.
 * - Sets `X-Response-Time` header (e.g. `12.34ms`) BEFORE the response is flushed
 *   by monkey-patching `res.json` and `res.send`.
 * - Logs structured timing data on `res.on('finish')`:
 *   - `info` level for responses > 500ms (slow)
 *   - `debug` level for normal responses
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()

  const computeDurationMs = (): string => {
    const durationNs = Number(process.hrtime.bigint() - start)
    return (durationNs / 1_000_000).toFixed(2)
  }

  // Monkey-patch res.json to set X-Response-Time header before response is flushed
  const originalJson = res.json.bind(res)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = function patchedJson(body?: any): Response {
    if (!res.headersSent) {
      const durationMs = computeDurationMs()
      res.setHeader('X-Response-Time', `${durationMs}ms`)
    }
    return originalJson(body)
  }

  // Also patch res.send for non-JSON responses (health checks, 304s, etc.)
  const originalSend = res.send.bind(res)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.send = function patchedSend(body?: any): Response {
    // Only set if not already set (json calls send internally after our patch)
    if (!res.headersSent && !res.getHeader('X-Response-Time')) {
      const durationMs = computeDurationMs()
      res.setHeader('X-Response-Time', `${durationMs}ms`)
    }
    return originalSend(body)
  }

  // Also patch res.end() for responses that do not call json/send (e.g. 304).
  // Guard against headers already sent — express-session's connect-pg-simple store
  // can invoke res.end() asynchronously after the response has been flushed, which
  // causes ERR_HTTP_HEADERS_SENT if we try to setHeader at that point.
  const originalEnd = res.end.bind(res)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function patchedEnd(...args: any[]): Response {
    if (!res.headersSent && !res.getHeader('X-Response-Time')) {
      const durationMs = computeDurationMs()
      res.setHeader('X-Response-Time', `${durationMs}ms`)
    }
    return originalEnd(...args) as unknown as Response
  } as unknown as Response['end']

  // Log timing on finish event (always fires, even for errors)
  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start)
    const durationMs = +(durationNs / 1_000_000).toFixed(2)

    const logData = {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      // Best-effort: Express sets req.route only after a route matches.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      route: (req as any).route?.path as string | undefined,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader('content-length'),
    }

    if (durationMs > 500) {
      logger.info(logData, 'Slow API response')
    } else {
      logger.debug(logData, 'API response')
    }
  })

  next()
}
