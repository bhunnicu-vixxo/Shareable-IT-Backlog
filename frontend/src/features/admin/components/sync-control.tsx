import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Box, Button, Heading, HStack, Skeleton, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useSyncStatus } from '../hooks/use-sync-status'
import { useSyncTrigger } from '../hooks/use-sync-trigger'
import { useSyncHistory } from '../hooks/use-sync-history'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'
import type { SyncHistoryEntry, SyncHistoryStatus } from '../types/admin.types'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'

/** Map sync history status to badge color palette */
function getStatusColorPalette(status: SyncHistoryStatus): string {
  switch (status) {
    case 'success': return 'green'
    case 'error': return 'red'
    case 'partial': return 'yellow'
    case 'syncing': return 'blue'
    default: return 'gray'
  }
}

/** Format duration in milliseconds to a human-friendly string */
function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/** Format items column: itemsSynced (+ X failed if applicable) */
function formatItems(entry: SyncHistoryEntry): string {
  if (entry.status === 'syncing') return '—'
  const parts: string[] = [`${entry.itemsSynced}`]
  if (entry.itemsFailed > 0) {
    parts.push(`(${entry.itemsFailed} failed)`)
  }
  return parts.join(' ')
}

/**
 * Skeleton placeholder for the sync history table.
 * Uses the same Table.* layout components as the real history table
 * to ensure column alignment matches the loaded content exactly.
 */
export function SyncHistorySkeleton() {
  return (
    <Box data-testid="sync-history-skeleton">
      <Table.ScrollArea>
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader><Skeleton height="4" width="80px" /></Table.ColumnHeader>
              <Table.ColumnHeader><Skeleton height="4" width="50px" /></Table.ColumnHeader>
              <Table.ColumnHeader><Skeleton height="4" width="60px" /></Table.ColumnHeader>
              <Table.ColumnHeader><Skeleton height="4" width="40px" /></Table.ColumnHeader>
              <Table.ColumnHeader><Skeleton height="4" width="40px" /></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {Array.from({ length: 5 }).map((_, i) => (
              <Table.Row key={i}>
                <Table.Cell><Skeleton height="4" width="120px" /></Table.Cell>
                <Table.Cell><Skeleton height="4" width="70px" borderRadius="full" /></Table.Cell>
                <Table.Cell><Skeleton height="4" width="50px" /></Table.Cell>
                <Table.Cell><Skeleton height="4" width="40px" /></Table.Cell>
                <Table.Cell><Skeleton height="4" width="60%" /></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </Box>
  )
}

/**
 * Admin sync control panel.
 *
 * Displays current sync status and provides a "Sync Now" button
 * to trigger manual synchronization. Shows success/error alerts
 * when sync completes or fails. Includes a sync history table.
 */
export function SyncControl() {
  const { syncStatus, isLoading } = useSyncStatus()
  const { triggerSync, isTriggering, triggerError } = useSyncTrigger()
  const { history, isLoading: isHistoryLoading, error: historyError } = useSyncHistory()

  const isSyncing = syncStatus?.status === 'syncing'
  const isSuccess = syncStatus?.status === 'success'
  const isError = syncStatus?.status === 'error'
  const isPartial = syncStatus?.status === 'partial'

  const previousStatusRef = useRef<SyncStatus['status'] | null>(null)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [showErrorAlert, setShowErrorAlert] = useState(false)
  const [showPartialAlert, setShowPartialAlert] = useState(false)

  useEffect(() => {
    const currentStatus = syncStatus?.status ?? null
    const previousStatus = previousStatusRef.current

    // Note: we intentionally schedule state updates asynchronously to avoid
    // cascading renders flagged by react-hooks/set-state-in-effect.
    queueMicrotask(() => {
      // Reset transient alerts when a new sync starts
      if (currentStatus === 'syncing') {
        setShowSuccessAlert(false)
        setShowErrorAlert(false)
        setShowPartialAlert(false)
      }

      // Show alerts only when status transitions from syncing → success/error/partial
      if (previousStatus === 'syncing' && currentStatus === 'success') {
        setShowSuccessAlert(true)
      }
      if (previousStatus === 'syncing' && currentStatus === 'error') {
        setShowErrorAlert(true)
      }
      if (previousStatus === 'syncing' && currentStatus === 'partial') {
        setShowPartialAlert(true)
      }

      // If we land on the page and the latest status is error/partial, show it (admin visibility).
      if (!previousStatus && currentStatus === 'error') {
        setShowErrorAlert(true)
      }
      if (!previousStatus && currentStatus === 'partial') {
        setShowPartialAlert(true)
      }
    })

    previousStatusRef.current = currentStatus
  }, [syncStatus?.status])

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <VStack gap={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">
            Data Synchronization
          </Text>
          <Button
            onClick={() => triggerSync()}
            disabled={isSyncing || isTriggering}
            colorPalette="blue"
            aria-label={isSyncing ? 'Syncing...' : 'Sync Now'}
          >
            {isSyncing ? (
              <HStack gap="2">
                <Spinner size="sm" />
                <Text>Syncing...</Text>
              </HStack>
            ) : (
              'Sync Now'
            )}
          </Button>
        </HStack>

        {/* Status display */}
        {syncStatus?.lastSyncedAt ? (
          <Text color="fg.muted" fontSize="sm">
            Last synced: {formatRelativeTime(syncStatus.lastSyncedAt)}
            {syncStatus.itemCount !== null && ` — ${syncStatus.itemCount} items`}
          </Text>
        ) : (
          !isLoading && (
            <Text color="fg.muted" fontSize="sm">
              Never synced
            </Text>
          )
        )}

        {/* Success alert */}
        {showSuccessAlert && isSuccess && syncStatus?.lastSyncedAt && (
          <Alert.Root
            status="success"
            variant="subtle"
            borderRadius="md"
            role="alert"
            aria-live="polite"
          >
            <Alert.Indicator />
            <Box>
              <Alert.Title>
                Sync completed — {syncStatus.itemCount} items synced
              </Alert.Title>
              <Alert.Description mt="1" fontSize="sm">
                Completed at {formatDateTime(syncStatus.lastSyncedAt)}
              </Alert.Description>
            </Box>
          </Alert.Root>
        )}

        {/* Partial success alert */}
        {showPartialAlert && isPartial && syncStatus?.lastSyncedAt && (
          <Alert.Root
            status="warning"
            variant="subtle"
            borderRadius="md"
            role="alert"
            aria-live="polite"
          >
            <Alert.Indicator />
            <Box flex="1">
              <Alert.Title>
                Synced with warnings
                {syncStatus.itemsSynced != null && syncStatus.itemsFailed != null && (
                  <> — {syncStatus.itemsSynced} synced, {syncStatus.itemsFailed} failed</>
                )}
              </Alert.Title>
              <Alert.Description mt="1" fontSize="sm">
                {syncStatus.errorCode && <>Error code: {syncStatus.errorCode}. </>}
                Completed at {formatDateTime(syncStatus.lastSyncedAt)}
              </Alert.Description>
            </Box>
          </Alert.Root>
        )}

        {/* Error alert */}
        {showErrorAlert && isError && (
          <Alert.Root
            status="error"
            variant="subtle"
            borderRadius="md"
            role="alert"
            aria-live="assertive"
          >
            <Alert.Indicator />
            <Box flex="1">
              <Alert.Title>
                Sync failed{syncStatus?.errorCode ? ` (${syncStatus.errorCode})` : ''}: {syncStatus?.errorMessage ?? 'Unknown error'}
              </Alert.Title>
              {syncStatus?.lastSyncedAt && (
                <Alert.Description mt="1" fontSize="sm">
                  Last successful sync: {formatDateTime(syncStatus.lastSyncedAt)}
                </Alert.Description>
              )}
            </Box>
            <Button
              size="sm"
              variant="outline"
              colorPalette="red"
              onClick={() => triggerSync()}
              aria-label="Retry"
            >
              Retry
            </Button>
          </Alert.Root>
        )}

        {/* Trigger error (e.g., 409 conflict) */}
        {triggerError && !isError && (
          <Text color="fg.error" fontSize="sm">
            {triggerError.message}
          </Text>
        )}

        {/* Sync History Section */}
        <Box mt={4}>
          <Heading size="sm" mb={3}>
            Sync History
          </Heading>

          {isHistoryLoading && <SyncHistorySkeleton />}

          {historyError && (
            <Text color="fg.error" fontSize="sm">
              Failed to load sync history: {historyError.message}
            </Text>
          )}

          {!isHistoryLoading && !historyError && history.length === 0 && (
            <Text color="fg.muted" fontSize="sm">No sync history yet</Text>
          )}

          {!isHistoryLoading && !historyError && history.length > 0 && (
            <Table.ScrollArea>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Started</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Duration</Table.ColumnHeader>
                    <Table.ColumnHeader>Items</Table.ColumnHeader>
                    <Table.ColumnHeader>Error</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {history.map((entry) => (
                    <Table.Row key={entry.id}>
                      <Table.Cell>
                        <Text fontSize="xs" title={formatDateTime(entry.startedAt)}>
                          {formatRelativeTime(entry.startedAt)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={getStatusColorPalette(entry.status)}>
                          {entry.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="xs">{formatDuration(entry.durationMs)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="xs">{formatItems(entry)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        {(entry.status === 'error' || entry.status === 'partial') && entry.errorMessage ? (
                          <Text fontSize="xs" color="fg.error">
                            {entry.errorDetails && typeof entry.errorDetails === 'object' && 'errorCode' in entry.errorDetails
                              ? `${entry.errorDetails.errorCode}: `
                              : ''}
                            {entry.errorMessage}
                          </Text>
                        ) : (
                          <Text fontSize="xs" color="fg.muted">—</Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          )}
        </Box>
      </VStack>
    </Box>
  )
}
