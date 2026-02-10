import { Alert, Box, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useSyncStatus } from '../hooks/use-sync-status'
import { formatRelativeTime } from '@/utils/formatters'
import { getUserFriendlyErrorMessage } from '@/utils/sync-error-messages'
import type { SyncStatus } from '../types/backlog.types'

/**
 * Determine the color of the status dot based on sync status and staleness.
 *
 * - Green: success and synced < 4 hours ago
 * - Yellow: success and synced 4–24 hours ago
 * - Red: error OR synced > 24 hours ago
 * - Gray: never synced (lastSyncedAt is null)
 */
function getStatusDotColor(syncStatus: SyncStatus | null): string {
  if (!syncStatus || syncStatus.lastSyncedAt === null) return 'gray.400'
  if (syncStatus.status === 'error') return 'red.500'

  const lastSynced = new Date(syncStatus.lastSyncedAt)
  const hoursAgo = (Date.now() - lastSynced.getTime()) / 3_600_000

  if (hoursAgo < 4) return 'green.500'
  if (hoursAgo < 24) return 'yellow.500'
  return 'red.500'
}

/**
 * Subtle sync status indicator for the backlog page.
 *
 * Displays a color-coded dot alongside "Last synced: [relative time]",
 * a spinner while syncing, or "Not yet synced" when no sync has occurred.
 * Error state shows a compact alert banner with user-friendly guidance.
 */
export function SyncStatusIndicator() {
  const { syncStatus, isLoading } = useSyncStatus()

  // Don't show anything during initial load
  if (isLoading) return null

  // Syncing state — animated spinner
  if (syncStatus?.status === 'syncing') {
    return (
      <HStack gap={1.5}>
        <Spinner size="xs" />
        <Text fontSize="xs" color="fg.muted">
          Syncing...
        </Text>
      </HStack>
    )
  }

  // Error state — visible alert banner with user-friendly message
  if (syncStatus?.status === 'error') {
    const errorDisplay = getUserFriendlyErrorMessage(syncStatus.errorCode ?? null)

    return (
      <VStack gap={2} align="stretch" w="full">
        <Alert.Root status="warning" variant="subtle" borderRadius="md" size="sm">
          <Alert.Indicator />
          <Box flex="1">
            <Alert.Title fontSize="sm" data-testid="sync-error-title">
              {errorDisplay.title}
            </Alert.Title>
            <Alert.Description fontSize="xs" color="fg.muted">
              {errorDisplay.description}{' '}
              {errorDisplay.guidance}
              {syncStatus.lastSyncedAt && (
                <> Last successful sync: {formatRelativeTime(syncStatus.lastSyncedAt)}.</>
              )}
            </Alert.Description>
          </Box>
        </Alert.Root>
      </VStack>
    )
  }

  // Never synced
  if (!syncStatus?.lastSyncedAt) {
    return (
      <Text fontSize="xs" color="fg.muted">
        Not yet synced
      </Text>
    )
  }

  // Success state with staleness-based color
  const dotColor = getStatusDotColor(syncStatus)

  return (
    <HStack gap={1.5}>
      <Box
        w={2}
        h={2}
        borderRadius="full"
        bg={dotColor}
        flexShrink={0}
        data-testid="sync-status-dot"
        data-color={dotColor}
      />
      <Text fontSize="xs" color="fg.muted">
        Last synced: {formatRelativeTime(syncStatus.lastSyncedAt)}
      </Text>
    </HStack>
  )
}
