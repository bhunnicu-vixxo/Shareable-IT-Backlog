/**
 * Application-wide constants.
 */

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

/** Show "Open in Linear" button for IT users with Linear access. Set to true for IT deployments. */
export const SHOW_OPEN_IN_LINEAR =
  import.meta.env.VITE_SHOW_OPEN_IN_LINEAR === 'true'
