import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { API_URL } from '@/utils/constants'
import { ApiError } from '@/utils/api-error'
import { apiFetchJson } from '@/utils/api-fetch'
import {
  getNetworkAccessState,
  resetNetworkAccess,
  subscribeNetworkAccess,
} from '@/features/auth/network-access.store'

interface NetworkAccessState {
  /** True while the network access check is in progress. */
  isChecking: boolean
  /** True when API returned 403 with NETWORK_ACCESS_DENIED code. */
  isNetworkDenied: boolean
  /** Re-check network access (e.g., after connecting to VPN). */
  retry: () => void
}

/**
 * Lightweight hook that checks whether the user's network is allowed to access the API.
 *
 * Makes a request to the health endpoint on mount. If any API call returns
 * HTTP 403 with error code `NETWORK_ACCESS_DENIED`, the hook sets
 * `isNetworkDenied = true` so the app can render the Access Denied page.
 *
 * Uses the `/health` endpoint because it's lightweight and always available.
 * However, the health endpoint is excluded from network verification, so we
 * use a non-health endpoint (sync/status) to actually test network access.
 */
export function useNetworkAccess(): NetworkAccessState {
  const [isChecking, setIsChecking] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const isNetworkDenied = useSyncExternalStore(
    subscribeNetworkAccess,
    () => getNetworkAccessState().isNetworkDenied,
  )

  const checkAccess = useCallback(async () => {
    setIsChecking(true)
    try {
      // Use sync/status as a lightweight GET endpoint that IS network-protected
      await apiFetchJson<unknown>(`${API_URL}/sync/status`)
      // If the request succeeds, network access is OK.
      resetNetworkAccess()
    } catch (err) {
      // A 403 NETWORK_ACCESS_DENIED will be handled by apiFetchJson() (global flag).
      // Other failures (API unreachable, server errors, etc.) are NOT the same as access denied.
      if (!(err instanceof ApiError && err.status === 403 && err.code === 'NETWORK_ACCESS_DENIED')) {
        resetNetworkAccess()
      }
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    void checkAccess()
  }, [checkAccess, retryCount])

  const retry = useCallback(() => {
    resetNetworkAccess()
    setRetryCount((c) => c + 1)
  }, [])

  return { isChecking, isNetworkDenied, retry }
}
