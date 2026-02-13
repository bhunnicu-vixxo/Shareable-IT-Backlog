/**
 * Audit logging middleware.
 *
 * Automatically records user access events AFTER the response is sent
 * using the `res.on('finish')` hook. This ensures audit logging is
 * completely non-blocking — it never delays or interferes with the
 * user's request.
 *
 * Skips: health checks, OPTIONS preflight, unauthenticated requests.
 * Sets `is_admin_action = false` for all entries (admin actions are
 * handled by story 10.3).
 */

import type { Request, Response, NextFunction } from 'express'
import { auditService } from '../services/audit/audit.service.js'
import { logger } from '../utils/logger.js'
import type { AuditAction, AuditResource } from '../types/audit.types.js'

/** Route pattern → audit action + resource mapping. Order matters: more specific patterns first. */
const ACTION_MAP: ReadonlyArray<{
  pattern: RegExp
  method: string
  action: AuditAction
  resource: AuditResource
}> = [
  {
    pattern: /^\/api\/backlog-items\/[^/]+\/comments/,
    method: 'GET',
    action: 'VIEW_ITEM_COMMENTS',
    resource: 'backlog_item',
  },
  {
    pattern: /^\/api\/backlog-items\/[^/]+\/updates/,
    method: 'GET',
    action: 'VIEW_ITEM_UPDATES',
    resource: 'backlog_item',
  },
  {
    pattern: /^\/api\/backlog-items\/[^/]+$/,
    method: 'GET',
    action: 'VIEW_ITEM',
    resource: 'backlog_item',
  },
  {
    pattern: /^\/api\/backlog-items\/?$/,
    method: 'GET',
    action: 'VIEW_BACKLOG',
    resource: 'backlog',
  },
  { pattern: /^\/api\/sync\/status/, method: 'GET', action: 'VIEW_SYNC_STATUS', resource: 'sync' },
  { pattern: /^\/api\/sync\/trigger/, method: 'POST', action: 'TRIGGER_SYNC', resource: 'sync' },
  { pattern: /^\/api\/admin\//, method: 'GET', action: 'VIEW_ADMIN_DASHBOARD', resource: 'admin' },
  { pattern: /^\/api\/users/, method: 'GET', action: 'VIEW_USERS', resource: 'user' },
]

/**
 * Resolve the audit action and resource for the given request.
 * Falls back to API_ACCESS / api for unmatched routes.
 *
 * @param method HTTP method
 * @param path Request path (should be the original path before Express strips mount prefixes)
 */
function resolveAction(
  method: string,
  path: string,
): { action: AuditAction; resource: AuditResource } {
  for (const mapping of ACTION_MAP) {
    if (method === mapping.method && mapping.pattern.test(path)) {
      return { action: mapping.action, resource: mapping.resource }
    }
  }
  return { action: 'API_ACCESS', resource: 'api' }
}

/**
 * Express middleware that logs user access events to the audit_logs table.
 *
 * Must be placed AFTER session middleware and network verification,
 * and BEFORE main API routes in the middleware chain.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only audit API requests. This excludes static assets and non-API routes.
  if (!req.path.startsWith('/api')) {
    next()
    return
  }

  // Skip health checks and OPTIONS preflight requests
  if (req.path.startsWith('/api/health') || req.method === 'OPTIONS') {
    next()
    return
  }

  // Capture originalUrl before calling next() — req.path is modified by Express
  // when routes are mounted with a prefix (e.g., app.use('/api', routes)).
  // By the time res.on('finish') fires, req.path no longer includes the mount prefix.
  const originalPath = req.originalUrl.split('?')[0]

  res.on('finish', () => {
    // Only log authenticated requests
    const userId = req.session?.userId
    if (!userId) return

    const { action, resource } = resolveAction(req.method, originalPath)
    const resourceId = req.params?.id ?? null

    // Fire-and-forget: non-blocking audit log write
    auditService
      .logUserAccess({
        userId: Number(userId),
        action,
        resource,
        resourceId,
        ipAddress: req.ip ?? '',
        isAdminAction: false,
        details: {
          method: req.method,
          path: originalPath,
          query: req.query,
          statusCode: res.statusCode,
          responseTime: res.getHeader('x-response-time') ?? null,
        },
      })
      .catch((err: unknown) => {
        // Belt-and-suspenders: auditService.logUserAccess already catches,
        // but guard against unexpected failures.
        logger.error({ err, userId, action }, 'Audit log write failed')
      })
  })

  next()
}
