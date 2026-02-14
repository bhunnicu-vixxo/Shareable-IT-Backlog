import { Box, Heading, HStack, VisuallyHidden } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { BacklogList } from './backlog-list'
import { SyncStatusIndicator } from './sync-status-indicator'
import { StaleDataBanner } from '@/shared/components/stale-data-banner'
import { useBacklogItems } from '../hooks/use-backlog-items'
import { useAutoRefreshOnSync } from '../hooks/use-auto-refresh-on-sync'
import { useDataFreshness } from '@/shared/hooks/use-data-freshness'

export function BacklogPage() {
  const queryClient = useQueryClient()
  const { data } = useBacklogItems()
  const { isStale, reason, lastSyncedAt } = useDataFreshness(
    data?.servedFromCache,
    data?.lastSyncedAt,
  )

  // Auto-refresh backlog items when a sync completes (bridges 5s sync poll → backlog data)
  useAutoRefreshOnSync()

  const handleRetry = () => {
    // Invalidate both queries so sync status and backlog data refresh together
    queryClient.invalidateQueries({ queryKey: ['backlog-items'] })
    queryClient.invalidateQueries({ queryKey: ['sync-status'] })
  }

  return (
    <Box p={{ base: '4', md: '6' }} maxWidth="960px" mx="auto">
      <VisuallyHidden>
        This page shows IT backlog items from Linear. Use the filters above to narrow results.
      </VisuallyHidden>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap="3" mb="8">
        <Heading
          as="h1"
          size="xl"
          color="fg.brand"
          fontFamily="heading"
          letterSpacing="-0.03em"
          fontWeight="800"
        >
          Backlog
        </Heading>
        <Box role="region" aria-label="Sync status">
          <SyncStatusIndicator />
        </Box>
      </HStack>
      <StaleDataBanner
        isStale={isStale}
        reason={reason}
        lastSyncedAt={lastSyncedAt}
        onRetry={handleRetry}
      />
      <BacklogList />
    </Box>
  )
}
