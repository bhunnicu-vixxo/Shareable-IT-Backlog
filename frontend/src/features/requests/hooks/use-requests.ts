import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'
import type {
  ITRequest,
  CreateRequestInput,
  SimilarItem,
} from '../types/request.types'

/* ------------------------------------------------------------------ */
/*  User hooks                                                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch the current user's submitted requests.
 */
export function useMyRequests() {
  return useQuery<ITRequest[]>({
    queryKey: ['requests', 'mine'],
    queryFn: () =>
      apiFetchJson<ITRequest[]>(`${API_URL}/requests/mine`, undefined, {
        fallbackMessage: 'Failed to load your requests',
      }),
  })
}

/**
 * Submit a new IT request.
 */
export function useSubmitRequest() {
  const queryClient = useQueryClient()

  const mutation = useMutation<ITRequest, Error, CreateRequestInput>({
    mutationFn: async (input) =>
      apiFetchJson<ITRequest>(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }, {
        fallbackMessage: 'Failed to submit request',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] })
    },
  })

  return {
    submitRequest: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}

/**
 * Search for similar existing backlog items (debounced on the component side).
 */
export function useSimilarItems(searchText: string) {
  return useQuery<SimilarItem[]>({
    queryKey: ['requests', 'similar', searchText],
    queryFn: () =>
      apiFetchJson<SimilarItem[]>(
        `${API_URL}/requests/similar?title=${encodeURIComponent(searchText)}`,
        undefined,
        { fallbackMessage: 'Failed to search for similar items' },
      ),
    enabled: searchText.trim().length >= 3,
    staleTime: 30_000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin hooks                                                        */
/* ------------------------------------------------------------------ */

/**
 * Fetch the admin triage queue.
 */
export function useTriageQueue() {
  return useQuery<ITRequest[]>({
    queryKey: ['admin', 'triage-queue'],
    queryFn: () =>
      apiFetchJson<ITRequest[]>(`${API_URL}/admin/requests`, undefined, {
        fallbackMessage: 'Failed to load triage queue',
      }),
  })
}

/**
 * Approve a request (creates Linear issue).
 */
export function useApproveRequest() {
  const queryClient = useQueryClient()

  const mutation = useMutation<ITRequest, Error, { id: string; adminNotes?: string }>({
    mutationFn: async ({ id, adminNotes }) =>
      apiFetchJson<ITRequest>(`${API_URL}/admin/requests/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      }, {
        fallbackMessage: 'Failed to approve request',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'triage-queue'] })
    },
  })

  return {
    approveRequest: mutation.mutateAsync,
    isApproving: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}

/**
 * Reject a request with a reason.
 */
export function useRejectRequest() {
  const queryClient = useQueryClient()

  const mutation = useMutation<ITRequest, Error, { id: string; rejectionReason: string }>({
    mutationFn: async ({ id, rejectionReason }) =>
      apiFetchJson<ITRequest>(`${API_URL}/admin/requests/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      }, {
        fallbackMessage: 'Failed to reject request',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'triage-queue'] })
    },
  })

  return {
    rejectRequest: mutation.mutateAsync,
    isRejecting: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
