import { Box, Heading, HStack, VisuallyHidden } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { BacklogList } from './backlog-list'
import { SyncStatusIndicator } from './sync-status-indicator'
import { StaleDataBanner } from '@/shared/components/stale-data-banner'
import { useBacklogItems } from '../hooks/use-backlog-items'
import { useDataFreshness } from '@/shared/hooks/use-data-freshness'

export function BacklogPage() {
  const queryClient = useQueryClient()
  const { data } = useBacklogItems()
  const { isStale, reason, lastSyncedAt } = useDataFreshness(
    data ? { servedFromCache: data.servedFromCache, lastSyncedAt: data.lastSyncedAt } : undefined,
  )

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['backlog-items'] })
  }

  return (
    <Box p="4" maxWidth="960px" mx="auto">
      <VisuallyHidden>
        This page shows IT backlog items from Linear. Use the filters above to narrow results.
      </VisuallyHidden>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap="3" mb="6">
        <Heading as="h1" size="xl" color="brand.gray">
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
