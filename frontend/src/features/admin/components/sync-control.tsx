import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useSyncStatus } from '../hooks/use-sync-status'
import { useSyncTrigger } from '../hooks/use-sync-trigger'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'
import { formatDateTime, formatRelativeTime } from '@/utils/formatters'

/**
 * Admin sync control panel.
 *
 * Displays current sync status and provides a "Sync Now" button
 * to trigger manual synchronization. Shows success/error alerts
 * when sync completes or fails.
 */
export function SyncControl() {
  const { syncStatus, isLoading } = useSyncStatus()
  const { triggerSync, isTriggering, triggerError } = useSyncTrigger()

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
      </VStack>
    </Box>
  )
}
