import { memo, useEffect, useState } from 'react'
import { Alert, Box, Button, HStack, Skeleton, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncStatus } from '../hooks/use-sync-status'
import { formatRelativeTime } from '@/utils/formatters'
import { getUserFriendlyErrorMessage } from '@/utils/sync-error-messages'
import type { SyncStatus } from '../types/backlog.types'

/**
 * Determine the color of the status dot based on sync status and staleness.
 *
 * Uses brand tokens from theme.ts:
 * - brand.teal: success and synced < 4 hours ago (info indicator) — 4.8:1 on white ✓
 * - brand.copper: success and synced 4–24 hours ago (warning) — 5.0:1 on white ✓
 *   (brand.yellow #EDA200 has only 1.8:1 on white, fails WCAG SC 1.4.11 non-text contrast)
 * - error.red: error OR synced > 24 hours ago — 4.13:1 on white ✓ (meets 3:1 non-text)
 * - brand.grayLight: never synced (lastSyncedAt is null) — 4.62:1 on white ✓
 */
function getStatusDotColor(syncStatus: SyncStatus | null): string {
  if (!syncStatus) return 'brand.grayLight'
  if (syncStatus.status === 'error') return 'error.red'
  if (syncStatus.lastSyncedAt === null) return 'brand.grayLight'
  // WCAG SC 1.4.11: Non-text UI elements need ≥3:1 contrast.
  // brand.copper (#956125, 5.0:1) replaces brand.yellow (#EDA200, 1.8:1) for the warning dot.
  if (syncStatus.status === 'partial') return 'brand.copper'

  const lastSynced = new Date(syncStatus.lastSyncedAt)
  // Defensive: malformed timestamps should not show an "error/stale" dot.
  if (Number.isNaN(lastSynced.getTime())) return 'brand.grayLight'
  const hoursAgo = (Date.now() - lastSynced.getTime()) / 3_600_000

  if (hoursAgo < 4) return 'brand.teal'
  if (hoursAgo < 24) return 'brand.copper'
  return 'error.red'
}

interface SyncStatusIndicatorProps {
  /**
   * When true, renders in compact mode: dot + single-line text only,
   * without the error alert banner. Suitable for tight layouts like
   * BacklogItemCard or header bars.
   * @default false
   */
  compact?: boolean
}

/**
 * Subtle sync status indicator for the backlog page.
 *
 * Displays a color-coded dot alongside "Last synced: [relative time]",
 * a spinner while syncing, or "Not yet synced" when no sync has occurred.
 * Error state shows a compact alert banner with user-friendly guidance
 * (or inline text when compact mode is enabled).
 *
 * Features:
 * - Brand token compliance (brand.teal, brand.yellow, error.red, brand.grayLight)
 * - ARIA live region (role="status" + aria-live="polite") for screen reader announcements
 * - Auto-refreshing relative timestamps every 60 seconds
 * - Optional compact variant for tight layouts
 */
export const SyncStatusIndicator = memo(function SyncStatusIndicator({ compact = false }: SyncStatusIndicatorProps) {
  const { syncStatus, isLoading } = useSyncStatus()
  const queryClient = useQueryClient()

  // Auto-refresh: re-render every 60s to update relative time display
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Show inline skeleton placeholder during initial load
  if (isLoading) return (
    <Box role="status" aria-live="polite" aria-atomic="true">
      <Skeleton height="4" width="120px" data-testid="sync-status-skeleton" />
    </Box>
  )

  // Syncing state — animated spinner
  if (syncStatus?.status === 'syncing') {
    return (
      <Box role="status" aria-live="polite" aria-atomic="true" data-compact={compact || undefined}>
        <HStack gap={1.5}>
          <Spinner size="xs" />
          <Text fontSize="xs" color="fg.muted">
            Syncing...
          </Text>
        </HStack>
      </Box>
    )
  }

  // Partial sync — copper dot with warning text
  // WCAG: brand.copper (#956125, 5.0:1) replaces brand.yellow (#EDA200, 1.8:1) for non-text contrast
  if (syncStatus?.status === 'partial') {
    return (
      <Box role="status" aria-live="polite" aria-atomic="true" data-compact={compact || undefined}>
        <HStack gap={1.5}>
          <Box
            w={2}
            h={2}
            borderRadius="full"
            bg="brand.copper"
            flexShrink={0}
            data-testid="sync-status-dot"
            data-color="brand.copper"
            aria-hidden="true"
          />
          <Text fontSize="xs" color="fg.muted">
            Synced with warnings
            {syncStatus.itemsFailed != null && syncStatus.itemsFailed > 0 && (
              <> — {syncStatus.itemsFailed} item{syncStatus.itemsFailed !== 1 ? 's' : ''} failed</>
            )}
          </Text>
        </HStack>
      </Box>
    )
  }

  // Error state — alert banner (default) or inline text (compact)
  if (syncStatus?.status === 'error') {
    const errorDisplay = getUserFriendlyErrorMessage(syncStatus.errorCode ?? null)

    if (compact) {
      const dotColor = getStatusDotColor(syncStatus)
      return (
        <Box role="status" aria-live="polite" aria-atomic="true" data-compact={true}>
          <HStack gap={1.5}>
            <Box
              w={2}
              h={2}
              borderRadius="full"
              bg={dotColor}
              flexShrink={0}
              data-testid="sync-status-dot"
              data-color={dotColor}
              aria-hidden="true"
            />
            <Text fontSize="xs" color="fg.muted">
              Sync error — {errorDisplay.title}
            </Text>
          </HStack>
        </Box>
      )
    }

    return (
      <Box role="status" aria-live="polite" aria-atomic="true">
        <VStack gap={2} align="stretch" w="full">
          <Alert.Root status="error" variant="subtle" borderRadius="md" size="sm">
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
            <Button
              size="xs"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['backlog-items'] })}
              aria-label="Refresh backlog data"
              data-testid="sync-error-refresh-btn"
              flexShrink={0}
            >
              Refresh data
            </Button>
          </Alert.Root>
        </VStack>
      </Box>
    )
  }

  // Never synced
  if (!syncStatus?.lastSyncedAt) {
    const dotColor = getStatusDotColor(syncStatus)
    return (
      <Box role="status" aria-live="polite" aria-atomic="true" data-compact={compact || undefined}>
        <HStack gap={1.5}>
          <Box
            w={2}
            h={2}
            borderRadius="full"
            bg={dotColor}
            flexShrink={0}
            data-testid="sync-status-dot"
            data-color={dotColor}
            aria-hidden="true"
          />
          <Text fontSize="xs" color="fg.muted">
            Not yet synced
          </Text>
        </HStack>
      </Box>
    )
  }

  // Success state with staleness-based color
  const dotColor = getStatusDotColor(syncStatus)

  return (
    <Box role="status" aria-live="polite" aria-atomic="true" data-compact={compact || undefined}>
      <HStack gap={1.5}>
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg={dotColor}
          flexShrink={0}
          data-testid="sync-status-dot"
          data-color={dotColor}
          aria-hidden="true"
        />
        <Text fontSize="xs" color="fg.muted">
          Last synced: {formatRelativeTime(syncStatus.lastSyncedAt)}
        </Text>
      </HStack>
    </Box>
  )
})
SyncStatusIndicator.displayName = 'SyncStatusIndicator'
