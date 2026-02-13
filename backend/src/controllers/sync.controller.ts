import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'node:crypto'

import { syncService } from '../services/sync/sync.service.js'
import { decryptCredential } from '../utils/credentials.js'
import { logger } from '../utils/logger.js'

/**
 * Resolve the configured SYNC_TRIGGER_TOKEN, supporting `enc:` prefix.
 * Returns trimmed token or undefined if not configured.
 */
function getResolvedSyncTriggerToken(): string | undefined {
  const raw = process.env.SYNC_TRIGGER_TOKEN?.trim()
  if (!raw) return undefined
  return decryptCredential(raw).trim()
}

function extractSyncTriggerToken(req: Request): string | null {
  const authHeader = req.header('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice('bearer '.length).trim() || null
  }

  const headerToken = req.header('x-sync-trigger-token')
  return headerToken?.trim() || null
}

function safeTokenEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * GET /api/sync/status
 *
 * Returns the current sync status (last sync time, status, item count, errors).
 */
export const getSyncStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = syncService.getStatus()
    let responseStatus = status

    // Optional hardening: when a sync trigger token is configured, suppress
    // technical error details unless the caller provides the same token.
    const requiredToken = getResolvedSyncTriggerToken()
    if (requiredToken) {
      const providedToken = extractSyncTriggerToken(req)
      const isAuthorized =
        !!providedToken && safeTokenEquals(providedToken, requiredToken)
      if (!isAuthorized) {
        responseStatus = { ...status, errorMessage: null }
      }
    }

    res.json(responseStatus)
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/sync/trigger
 *
 * Manually triggers a sync operation. Returns 202 Accepted with current
 * status if sync starts successfully, or 409 Conflict if a sync is already
 * in progress.
 *
 * The sync runs in the background (fire-and-forget) — the response is
 * returned immediately without waiting for sync to complete.
 */
export const triggerSync = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Optional protection: if configured, require a token to trigger sync.
    // (Auth/RBAC is planned for Epic 7.x; this provides a non-breaking hardening option.)
    const requiredToken = getResolvedSyncTriggerToken()
    if (requiredToken) {
      const providedToken = extractSyncTriggerToken(req)
      if (!providedToken || !safeTokenEquals(providedToken, requiredToken)) {
        res.status(403).json({
          error: {
            message: 'Forbidden',
            code: 'FORBIDDEN',
          },
        })
        return
      }
    }

    const currentStatus = syncService.getStatus()

    // Guard: reject if sync already in progress
    if (currentStatus.status === 'syncing') {
      res.status(409).json(currentStatus)
      return
    }

    // Fire-and-forget: start sync, don't await
    syncService.runSync({ triggerType: 'manual', triggeredBy: null }).catch((error) => {
      logger.error({ service: 'sync', error }, 'Manual sync trigger failed')
    })

    // Return 202 with status (runSync sets status synchronously at start)
    res.status(202).json(syncService.getStatus())
  } catch (error) {
    next(error)
  }
}
