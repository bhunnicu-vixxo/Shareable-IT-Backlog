import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/utils/api-error'

/**
 * Number of consecutive 503/network errors before considering the service unavailable.
 * Chosen to avoid false positives from single transient failures.
 */
const FAILURE_THRESHOLD = 3

/**
 * Hook that monitors TanStack Query's global error/success events to detect
 * whether the backend API is completely unreachable.
 *
 * Tracks consecutive 503 or network errors across all queries.
 * After FAILURE_THRESHOLD consecutive failures, `isServiceUnavailable` becomes true.
 * A single successful query resets the counter and clears the unavailable state.
 *
 * This drives the global ServiceUnavailable overlay without requiring
 * Redux/Zustand — just React state + TanStack Query events (per architecture rules).
 */
export function useServiceHealth() {
  const queryClient = useQueryClient()
  const [isServiceUnavailable, setIsServiceUnavailable] = useState(false)
  const consecutiveFailuresRef = useRef(0)

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const unsubscribe = cache.subscribe((event) => {
      if (!event?.query) return

      const state = event.query.state

      // On successful fetch, reset failure counter
      if (state.status === 'success') {
        if (consecutiveFailuresRef.current > 0) {
          consecutiveFailuresRef.current = 0
          setIsServiceUnavailable(false)
        }
        return
      }

      // On error, check if it's a 503 or network error
      if (state.status === 'error' && state.error) {
        const error = state.error
        const is503 = error instanceof ApiError && error.status === 503
        // Network errors manifest as TypeError across browsers, but with different
        // messages: "Failed to fetch" (Chrome), "Load failed" (Safari),
        // "NetworkError when attempting to fetch resource" (Firefox).
        // Check for TypeError generically rather than matching a specific message.
        const isNetworkError =
          error instanceof TypeError && error.name === 'TypeError'

        if (is503 || isNetworkError) {
          consecutiveFailuresRef.current += 1
          if (consecutiveFailuresRef.current >= FAILURE_THRESHOLD) {
            setIsServiceUnavailable(true)
          }
        }
      }
    })

    return () => unsubscribe()
  }, [queryClient])

  const retry = () => {
    consecutiveFailuresRef.current = 0
    setIsServiceUnavailable(false)
    // Invalidate all queries to trigger fresh fetches
    queryClient.invalidateQueries()
  }

  return { isServiceUnavailable, retry }
}
