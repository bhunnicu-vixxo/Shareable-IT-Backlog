/**
 * User-friendly error message mapping for sync error codes.
 *
 * The backend classifies errors into standardised codes; this module
 * maps those codes to user-friendly titles, descriptions, and
 * guidance text suitable for non-technical users.
 */

export interface SyncErrorDisplay {
  title: string
  description: string
  guidance: string
}

const ERROR_MESSAGES: Record<string, SyncErrorDisplay> = {
  SYNC_API_UNAVAILABLE: {
    title: 'Linear is unreachable',
    description: 'Unable to connect to Linear to refresh data.',
    guidance: 'The system will retry automatically. Data shown may be outdated.',
  },
  SYNC_AUTH_FAILED: {
    title: 'Authentication issue',
    description: 'Unable to authenticate with Linear.',
    guidance: 'Please contact your administrator to check the API credentials.',
  },
  SYNC_RATE_LIMITED: {
    title: 'Sync paused',
    description: 'Linear temporarily limited data requests.',
    guidance: 'The system will retry shortly. This is normal during heavy usage.',
  },
  SYNC_CONFIG_ERROR: {
    title: 'Sync not configured',
    description: 'The sync system is not properly configured.',
    guidance: 'Please contact your administrator.',
  },
  SYNC_TIMEOUT: {
    title: 'Sync timed out',
    description: 'The data refresh took too long to complete.',
    guidance: 'The system will retry automatically.',
  },
  SYNC_UNKNOWN_ERROR: {
    title: 'Sync issue',
    description: 'An unexpected issue occurred while refreshing data.',
    guidance: 'Data shown may be outdated. The system will retry automatically.',
  },
  SYNC_PARTIAL_SUCCESS: {
    title: 'Synced with warnings',
    description: 'Most items were synced, but some could not be updated.',
    guidance: 'The system will retry on the next sync. Displayed data may be incomplete.',
  },
  SYNC_TRANSFORM_FAILED: {
    title: 'Sync issue',
    description: 'Unable to process the latest Linear data.',
    guidance: 'Data shown may be outdated. Please contact your administrator.',
  },
}

const DEFAULT_ERROR: SyncErrorDisplay = {
  title: 'Sync issue',
  description: 'An unexpected issue occurred while refreshing data.',
  guidance: 'Data shown may be outdated. The system will retry automatically.',
}

/**
 * Map a backend error code to user-friendly display strings.
 *
 * Returns a title, description, and guidance message suitable for
 * display to non-technical business users.
 */
export function getUserFriendlyErrorMessage(errorCode: string | null): SyncErrorDisplay {
  if (!errorCode) return DEFAULT_ERROR
  return ERROR_MESSAGES[errorCode] ?? DEFAULT_ERROR
}
