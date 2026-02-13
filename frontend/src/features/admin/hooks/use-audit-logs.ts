import { useQuery } from '@tanstack/react-query'
import { API_URL } from '@/utils/constants'
import { apiFetchJson } from '@/utils/api-fetch'

export interface AuditLogEntry {
  id: number
  userId: number | null
  action: string
  resource: string | null
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  isAdminAction: boolean
  createdAt: string
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
}

export interface AuditLogQuery {
  /** Filter by admin user id */
  userId?: number
  /** Filter by action (exact match on backend today) */
  action?: string
  startDate?: string
  endDate?: string
  page: number
  limit: number
}

function toSearchParams(query: AuditLogQuery): string {
  const params = new URLSearchParams()

  // This view is specifically for admin actions
  params.set('isAdminAction', 'true')

  if (query.userId !== undefined) params.set('userId', String(query.userId))
  if (query.action) params.set('action', query.action)
  if (query.startDate) params.set('startDate', query.startDate)
  if (query.endDate) params.set('endDate', query.endDate)

  params.set('page', String(query.page))
  params.set('limit', String(query.limit))

  return params.toString()
}

/**
 * TanStack Query hook for fetching **admin action** audit logs.
 *
 * Always filters with `isAdminAction=true`. For a general-purpose audit log
 * hook (all log types), create a separate hook without the hardcoded filter.
 */
export function useAdminAuditLogs(query: AuditLogQuery) {
  const search = toSearchParams(query)

  const q = useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', search],
    queryFn: async () => {
      return await apiFetchJson<AuditLogsResponse>(
        `${API_URL}/admin/audit-logs?${search}`,
        { credentials: 'include' },
        { fallbackMessage: 'Failed to fetch audit logs' },
      )
    },
    staleTime: 10_000,
  })

  return {
    data: q.data ?? { logs: [], total: 0, page: query.page, limit: query.limit },
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  }
}

