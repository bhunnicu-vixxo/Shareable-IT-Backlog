import type { Request, Response, NextFunction } from 'express'
import { loadNetworkConfig, type NetworkConfig } from '../config/network.config.js'
import { logger } from '../utils/logger.js'

let networkConfig: NetworkConfig | null = null

function getConfig(): NetworkConfig {
  if (!networkConfig) {
    networkConfig = loadNetworkConfig()
  }
  return networkConfig
}

/**
 * Initialize and cache the network config on startup.
 *
 * Calling this during app bootstrap ensures CIDR parsing/validation warnings
 * are emitted when the server starts (not only on first request).
 */
export function initializeNetworkConfig(): NetworkConfig {
  return getConfig()
}

/**
 * Express middleware that verifies client IP is within allowed CIDR ranges.
 *
 * - When `NETWORK_CHECK_ENABLED=false`, all requests pass through (dev mode).
 * - When enabled, the client IP is checked against `ALLOWED_NETWORKS` CIDR ranges.
 * - Returns HTTP 403 with `NETWORK_ACCESS_DENIED` code for denied IPs.
 * - Normalizes IPv4-mapped IPv6 addresses (e.g., `::ffff:10.0.0.1` → `10.0.0.1`).
 */
export function networkVerificationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const config = getConfig()

  if (!config.enabled) {
    logger.debug('Network verification bypassed (NETWORK_CHECK_ENABLED=false)')
    next()
    return
  }

  const clientIp = req.ip ?? req.socket.remoteAddress ?? ''
  logger.debug({ clientIp }, 'Network verification check')

  // Handle IPv4-mapped IPv6 (e.g., ::ffff:10.0.0.1 → 10.0.0.1)
  const normalizedIp = clientIp.startsWith('::ffff:') ? clientIp.slice(7) : clientIp

  const isAllowed = config.allowedRanges.some((cidr) => cidr.contains(normalizedIp))

  if (!isAllowed) {
    logger.warn({ clientIp: normalizedIp }, 'Network access denied — IP not in allowed ranges')
    res.status(403).json({
      error: {
        message: 'Access denied — Vixxo network required.',
        code: 'NETWORK_ACCESS_DENIED',
      },
    })
    return
  }

  next()
}

/** Reset cached config — for testing only */
export function resetNetworkConfig(): void {
  networkConfig = null
}
