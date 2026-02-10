/**
 * Application-wide constants.
 */

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

/** Show "Open in Linear" button for IT users with Linear access. Set to true for IT deployments. */
export const SHOW_OPEN_IN_LINEAR =
  import.meta.env.VITE_SHOW_OPEN_IN_LINEAR === 'true'

/**
 * Optional admin token for privileged sync operations and details.
 *
 * When set (and backend `SYNC_TRIGGER_TOKEN` matches), admin requests can:
 * - Trigger manual sync (`POST /api/sync/trigger`)
 * - Receive technical sync error details from `GET /api/sync/status`
 */
export const SYNC_TRIGGER_TOKEN: string | undefined =
  import.meta.env.VITE_SYNC_TRIGGER_TOKEN
