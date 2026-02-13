import { Box, Heading, HStack, VisuallyHidden } from '@chakra-ui/react'
import { BacklogList } from './backlog-list'
import { SyncStatusIndicator } from './sync-status-indicator'

export function BacklogPage() {
  return (
    <Box p="4" maxWidth="960px" mx="auto">
      <VisuallyHidden>
        This page shows IT backlog items from Linear. Use the filters above to narrow results.
      </VisuallyHidden>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap="3" mb="6">
        <Heading as="h1" size="xl" color="brand.gray">
          Backlog
        </Heading>
        <Box as="footer" aria-label="Sync status">
          <SyncStatusIndicator />
        </Box>
      </HStack>
      <BacklogList />
    </Box>
  )
}
