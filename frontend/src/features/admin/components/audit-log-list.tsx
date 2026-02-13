import { Fragment, useMemo, useState } from 'react'
import { Badge, Box, Button, HStack, Input, Skeleton, Table, Text, VStack } from '@chakra-ui/react'
import { useAdminAuditLogs } from '../hooks/use-audit-logs'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'

const DEFAULT_LIMIT = 50

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function AuditLogList() {
  // Draft filters (editable without re-query)
  const [draftAction, setDraftAction] = useState('')
  const [draftUserId, setDraftUserId] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')

  // Applied filters (drive the query)
  const [appliedAction, setAppliedAction] = useState<string | undefined>(undefined)
  const [appliedUserId, setAppliedUserId] = useState<number | undefined>(undefined)
  const [appliedStartDate, setAppliedStartDate] = useState<string | undefined>(undefined)
  const [appliedEndDate, setAppliedEndDate] = useState<string | undefined>(undefined)

  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useAdminAuditLogs({
    userId: appliedUserId,
    action: appliedAction,
    startDate: appliedStartDate,
    endDate: appliedEndDate,
    page,
    limit: DEFAULT_LIMIT,
  })

  const maxPage = useMemo(() => {
    const total = data.total ?? 0
    return Math.max(1, Math.ceil(total / DEFAULT_LIMIT))
  }, [data.total])

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const applyFilters = () => {
    const trimmedAction = draftAction.trim()
    const parsedUserId = draftUserId.trim() ? Number(draftUserId.trim()) : undefined

    setAppliedAction(trimmedAction ? trimmedAction : undefined)
    setAppliedUserId(parsedUserId && Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : undefined)
    setAppliedStartDate(draftStartDate.trim() ? draftStartDate.trim() : undefined)
    setAppliedEndDate(draftEndDate.trim() ? draftEndDate.trim() : undefined)
    setPage(1)
  }

  const resetFilters = () => {
    setDraftAction('')
    setDraftUserId('')
    setDraftStartDate('')
    setDraftEndDate('')
    setAppliedAction(undefined)
    setAppliedUserId(undefined)
    setAppliedStartDate(undefined)
    setAppliedEndDate(undefined)
    setPage(1)
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <VStack gap={4} align="stretch">
        <HStack justify="space-between" align="baseline">
          <Text fontWeight="bold" fontSize="lg">
            Audit Logs
          </Text>
          <Badge colorPalette="purple">Admin actions</Badge>
        </HStack>

        {/* Filters */}
        <VStack align="stretch" gap={2}>
          <HStack gap={2} flexWrap="wrap">
            <Input
              placeholder="Action (e.g., USER_APPROVED)"
              value={draftAction}
              onChange={(e) => setDraftAction(e.target.value)}
              size="sm"
              width={{ base: '100%', md: '260px' }}
              aria-label="Filter by action"
            />
            <Input
              placeholder="Admin userId"
              value={draftUserId}
              onChange={(e) => setDraftUserId(e.target.value)}
              size="sm"
              width={{ base: '100%', md: '180px' }}
              aria-label="Filter by admin userId"
            />
            <Input
              placeholder="Start date (ISO)"
              value={draftStartDate}
              onChange={(e) => setDraftStartDate(e.target.value)}
              size="sm"
              width={{ base: '100%', md: '220px' }}
              aria-label="Filter by start date"
            />
            <Input
              placeholder="End date (ISO)"
              value={draftEndDate}
              onChange={(e) => setDraftEndDate(e.target.value)}
              size="sm"
              width={{ base: '100%', md: '220px' }}
              aria-label="Filter by end date"
            />
          </HStack>

          <HStack gap={2}>
            <Button size="sm" colorPalette="blue" onClick={applyFilters} aria-label="Apply filters">
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={resetFilters} aria-label="Reset filters">
              Reset
            </Button>
          </HStack>
        </VStack>

        {isLoading && (
          <Box data-testid="audit-logs-loading">
            <Skeleton height="6" mb={2} />
            <Skeleton height="6" mb={2} />
            <Skeleton height="6" />
          </Box>
        )}

        {error && (
          <Text color="fg.error" fontSize="sm">
            Failed to load audit logs: {error.message}
          </Text>
        )}

        {!isLoading && !error && data.logs.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            No admin action audit logs found
          </Text>
        )}

        {!isLoading && !error && data.logs.length > 0 && (
          <Table.ScrollArea>
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>When</Table.ColumnHeader>
                  <Table.ColumnHeader>Admin</Table.ColumnHeader>
                  <Table.ColumnHeader>Action</Table.ColumnHeader>
                  <Table.ColumnHeader>Resource</Table.ColumnHeader>
                  <Table.ColumnHeader>Details</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.logs.map((log) => {
                  const isExpanded = expandedId === log.id
                  return (
                    <Fragment key={log.id}>
                      <Table.Row>
                        <Table.Cell>
                          <Text fontSize="xs" title={formatDateTime(log.createdAt)}>
                            {formatRelativeTime(log.createdAt)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs">{log.userId ?? '—'}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" fontWeight="medium">
                            {log.action}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs">
                            {log.resource ?? '—'}
                            {log.resourceId ? `/${log.resourceId}` : ''}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            aria-label={isExpanded ? 'Hide details' : 'Show details'}
                          >
                            {isExpanded ? 'Hide' : 'Show'}
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                      {isExpanded && (
                        <Table.Row key={`${log.id}-details`}>
                          <Table.Cell colSpan={5}>
                            <Box
                              borderWidth="1px"
                              borderRadius="md"
                              p={3}
                              bg="bg.subtle"
                              maxH="240px"
                              overflow="auto"
                            >
                              <Text fontSize="xs" color="fg.muted" mb={2}>
                                isAdminAction: {String(log.isAdminAction)} · ip: {log.ipAddress ?? '—'}
                              </Text>
                              <pre style={{ margin: 0, fontSize: 12 }}>
                                {safeStringify(log.details)}
                              </pre>
                            </Box>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Fragment>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}

        {/* Pagination */}
        <HStack justify="space-between">
          <Text color="fg.muted" fontSize="xs">
            Page {data.page} of {maxPage} · {data.total} total
          </Text>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
              aria-label="Next page"
            >
              Next
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  )
}

