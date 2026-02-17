import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'

interface MarkSeenResponse {
  lastSeenAt: string
}

async function postMarkSeen(): Promise<MarkSeenResponse> {
  return apiFetchJson<MarkSeenResponse>(
    `${API_URL}/users/mark-seen`,
    { method: 'POST' },
    { fallbackMessage: 'Failed to mark items as seen.' },
  )
}

/**
 * Marks all backlog items as "seen" after a brief delay.
 *
 * This hook does NOT fire on mount. Instead, call `trigger()` after meaningful user interaction
 * (e.g., first scroll, opening an item detail view). After `delayMs`, it posts to
 * `POST /api/users/mark-seen` and invalidates the `unseen-count` query so the header badge updates.
 *
 * Only schedules once per mount (guards against re-triggers on re-renders).
 */
export interface UseMarkSeenOptions {
  /** When false, trigger() becomes a no-op and any pending timer is cancelled. */
  enabled?: boolean
  /** Delay before posting mark-seen (default: 2000ms). */
  delayMs?: number
}

export function useMarkSeen(options: UseMarkSeenOptions = {}) {
  const queryClient = useQueryClient()
  const enabled = options.enabled ?? true
  const delayMs = options.delayMs ?? 2000

  const hasScheduled = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mutation = useMutation({
    mutationFn: postMarkSeen,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['unseen-count'] })
    },
  })

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    hasScheduled.current = false
  }, [])

  const trigger = useCallback(() => {
    if (!enabled) return
    if (hasScheduled.current) return

    hasScheduled.current = true
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      mutation.mutate()
    }, delayMs)
  }, [delayMs, enabled, mutation])

  // If disabled, cancel any pending timer and allow re-triggering when re-enabled.
  useEffect(() => {
    if (!enabled) cancel()
  }, [enabled, cancel])

  // Cleanup pending timer on unmount.
  useEffect(() => cancel, [cancel])

  return { ...mutation, trigger, cancel }
}
