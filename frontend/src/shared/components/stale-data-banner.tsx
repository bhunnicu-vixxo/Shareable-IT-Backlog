import { Alert, Box, Button } from '@chakra-ui/react'
import { formatRelativeTime } from '@/utils/formatters'

export interface StaleDataBannerProps {
  /** Whether the currently displayed data is stale (served from cache during an outage). */
  isStale: boolean
  /** Reason the data is stale (e.g., "Linear API unavailable"). */
  reason: string
  /** ISO 8601 timestamp of the last successful sync, or null if never synced. */
  lastSyncedAt: string | null
  /** Callback to trigger a manual retry/refresh. */
  onRetry: () => void
}

/**
 * Prominent warning banner displayed when the application is serving cached/stale data
 * due to an API or database outage.
 *
 * This is a SEPARATE component from SyncStatusIndicator — it's a more prominent,
 * attention-grabbing banner for active outage situations.
 *
 * Uses Vixxo brand copper (#956125) for WCAG-compliant warning indication.
 * Dismissible behavior is handled by the parent (isStale prop toggles visibility).
 */
export function StaleDataBanner({ isStale, reason, lastSyncedAt, onRetry }: StaleDataBannerProps) {
  if (!isStale) return null

  const timeDisplay = lastSyncedAt ? formatRelativeTime(lastSyncedAt) : 'unknown'

  return (
    <Alert.Root
      status="warning"
      variant="outline"
      borderRadius="lg"
      mb={4}
      role="alert"
      aria-live="polite"
      data-testid="stale-data-banner"
      bg="surface.raised"
      borderColor="yellow.600/50"
      color="fg.brand"
    >
      <Alert.Indicator color="yellow.500" />
      <Box flex="1">
        <Alert.Title fontSize="sm" fontWeight="semibold" data-testid="stale-banner-title">
          Showing cached data
        </Alert.Title>
        <Alert.Description fontSize="xs" color="fg.brandMuted" data-testid="stale-banner-description">
          {reason}. Last synced: {timeDisplay}.
        </Alert.Description>
      </Box>
      <Button
        size="xs"
        variant="outline"
        color="fg.brand"
        borderColor="border.subtle"
        onClick={onRetry}
        aria-label="Refresh data"
        data-testid="stale-banner-retry"
        flexShrink={0}
      >
        Refresh
      </Button>
    </Alert.Root>
  )
}
