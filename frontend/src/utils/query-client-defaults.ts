import type { QueryObserverOptions } from '@tanstack/react-query'
import { ApiError } from '@/utils/api-error'

/**
 * Default TanStack Query options for the application.
 *
 * Exported so tests can validate the production config directly
 * rather than duplicating it.
 *
 * @see main.tsx — used when creating the global QueryClient
 */
export const queryDefaults: QueryObserverOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes — survive navigation/tab switches
  retry: (failureCount, error) => {
    // Never retry 4xx errors (client errors are not transient)
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return false
    }
    // Retry up to 2 times for server/network errors
    return failureCount < 2
  },
  refetchOnWindowFocus: false, // Data syncs on schedule, not tab focus
}
