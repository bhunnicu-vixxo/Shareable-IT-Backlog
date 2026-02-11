import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { identify, me, logout } from '../controllers/auth.controller.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * Simple in-memory rate limiter for the identify endpoint.
 * Limits each IP to a max of 10 identify requests per minute.
 * Prevents user-record spam and email enumeration.
 */
const IDENTIFY_WINDOW_MS = 60_000
const IDENTIFY_MAX_REQUESTS = 10
const identifyHits = new Map<string, { count: number; resetAt: number }>()

function identifyRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const entry = identifyHits.get(key)

  if (!entry || now >= entry.resetAt) {
    identifyHits.set(key, { count: 1, resetAt: now + IDENTIFY_WINDOW_MS })
    next()
    return
  }

  entry.count++
  if (entry.count > IDENTIFY_MAX_REQUESTS) {
    logger.warn({ ip: key, count: entry.count }, 'Rate limit exceeded for /auth/identify')
    res.status(429).json({
      error: {
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
      },
    })
    return
  }

  next()
}

// Periodically clean up stale rate-limit entries (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of identifyHits) {
    if (now >= entry.resetAt) identifyHits.delete(key)
  }
}, 5 * 60_000).unref()

// Auth routes — no auth middleware required (they handle auth internally)
router.post('/auth/identify', identifyRateLimit, identify)
router.get('/auth/me', me)
router.post('/auth/logout', logout)

export default router
