import IPCIDR from 'ip-cidr'
import { logger } from '../utils/logger.js'

export interface NetworkConfig {
  enabled: boolean
  allowedRanges: IPCIDR[]
  rawRanges: string[]
}

/**
 * Parse and validate network configuration from environment variables.
 *
 * - `NETWORK_CHECK_ENABLED`: Set to `"false"` to disable network verification (dev mode).
 *   When not set, defaults to:
 *   - enabled in production (`NODE_ENV=production`)
 *   - disabled in non-production (development/test)
 * - `ALLOWED_NETWORKS`: Comma-separated CIDR ranges (e.g., `10.0.0.0/8,172.16.0.0/12`).
 *   Invalid CIDR entries are logged as warnings and skipped.
 */
export function loadNetworkConfig(): NetworkConfig {
  const envEnabled = process.env.NETWORK_CHECK_ENABLED
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const enabled =
    envEnabled !== undefined ? envEnabled !== 'false' : nodeEnv === 'production'
  const rawRanges = (process.env.ALLOWED_NETWORKS ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)

  const allowedRanges: IPCIDR[] = []
  for (const range of rawRanges) {
    if (IPCIDR.isValidCIDR(range)) {
      allowedRanges.push(new IPCIDR(range))
    } else {
      logger.warn({ range }, 'Invalid CIDR range in ALLOWED_NETWORKS — skipping')
    }
  }

  if (enabled && allowedRanges.length === 0) {
    logger.warn(
      'NETWORK_CHECK_ENABLED is true but no valid ALLOWED_NETWORKS configured — all requests will be denied',
    )
  }

  return { enabled, allowedRanges, rawRanges }
}
