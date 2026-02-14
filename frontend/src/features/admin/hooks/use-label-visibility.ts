import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import type { LabelVisibilityEntry } from '../types/admin.types'

const ADMIN_LABELS_KEY = ['admin', 'labels'] as const
const VISIBLE_LABELS_KEY = ['visible-labels'] as const

/**
 * TanStack Query hook for fetching all labels with visibility settings (admin only).
 *
 * Fetches GET /api/admin/settings/labels with session credentials.
 * Returns labels, unreviewed count, loading state, error, and refetch.
 */
export function useLabelVisibility() {
  const query = useQuery<LabelVisibilityEntry[]>({
    queryKey: ADMIN_LABELS_KEY,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/admin/settings/labels`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Failed to fetch labels'
        throw new Error(message)
      }
      return response.json() as Promise<LabelVisibilityEntry[]>
    },
    staleTime: 30_000,
  })

  const labels = query.data ?? []
  const unreviewedCount = labels.filter((l) => l.reviewedAt === null).length

  return {
    labels,
    unreviewedCount,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

interface UpdateLabelParams {
  labelName: string
  isVisible: boolean
}

/**
 * TanStack Query mutation hook for updating label visibility (single or bulk).
 *
 * Uses optimistic updates so the UI toggles instantly without waiting for the
 * network round-trip. On error, the cache is rolled back to the previous state.
 */
export function useLabelVisibilityMutation() {
  const queryClient = useQueryClient()

  const singleMutation = useMutation<LabelVisibilityEntry, Error, UpdateLabelParams, { previous: LabelVisibilityEntry[] | undefined }>({
    mutationFn: async ({ labelName, isVisible }: UpdateLabelParams) => {
      const response = await fetch(
        `${API_URL}/admin/settings/labels/${encodeURIComponent(labelName)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isVisible }),
        },
      )
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to update label visibility')
      }
      return response.json() as Promise<LabelVisibilityEntry>
    },
    onMutate: async ({ labelName, isVisible }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ADMIN_LABELS_KEY })

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData<LabelVisibilityEntry[]>(ADMIN_LABELS_KEY)

      // Optimistically update the cache
      queryClient.setQueryData<LabelVisibilityEntry[]>(ADMIN_LABELS_KEY, (old) =>
        old?.map((entry) =>
          entry.labelName === labelName
            ? { ...entry, isVisible, reviewedAt: entry.reviewedAt ?? new Date().toISOString() }
            : entry,
        ),
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on error
      if (context?.previous) {
        queryClient.setQueryData(ADMIN_LABELS_KEY, context.previous)
      }
    },
    onSettled: () => {
      // Always refetch to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey: ADMIN_LABELS_KEY })
      queryClient.invalidateQueries({ queryKey: VISIBLE_LABELS_KEY })
    },
  })

  const bulkMutation = useMutation<LabelVisibilityEntry[], Error, UpdateLabelParams[], { previous: LabelVisibilityEntry[] | undefined }>({
    mutationFn: async (updates: UpdateLabelParams[]) => {
      const response = await fetch(`${API_URL}/admin/settings/labels/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ labels: updates }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Failed to bulk update label visibility')
      }
      return response.json() as Promise<LabelVisibilityEntry[]>
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_LABELS_KEY })

      const previous = queryClient.getQueryData<LabelVisibilityEntry[]>(ADMIN_LABELS_KEY)

      // Build a map for O(1) lookup
      const updateMap = new Map(updates.map((u) => [u.labelName, u.isVisible]))

      queryClient.setQueryData<LabelVisibilityEntry[]>(ADMIN_LABELS_KEY, (old) =>
        old?.map((entry) => {
          const newVisible = updateMap.get(entry.labelName)
          if (newVisible !== undefined) {
            return { ...entry, isVisible: newVisible, reviewedAt: entry.reviewedAt ?? new Date().toISOString() }
          }
          return entry
        }),
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ADMIN_LABELS_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_LABELS_KEY })
      queryClient.invalidateQueries({ queryKey: VISIBLE_LABELS_KEY })
    },
  })

  return {
    updateLabel: singleMutation.mutateAsync,
    bulkUpdateLabels: bulkMutation.mutateAsync,
    isPending: singleMutation.isPending || bulkMutation.isPending,
    error: singleMutation.error?.message ?? bulkMutation.error?.message ?? null,
  }
}
