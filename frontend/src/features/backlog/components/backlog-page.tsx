import { Box, Heading, HStack } from '@chakra-ui/react'
import { BacklogList } from './backlog-list'
import { SyncStatusIndicator } from './sync-status-indicator'

export function BacklogPage() {
  return (
    <Box p="4" maxWidth="960px" mx="auto">
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap="3" mb="6">
        <Heading as="h1" size="xl" color="brand.gray">
          Backlog
        </Heading>
        <SyncStatusIndicator />
      </HStack>
      <BacklogList />
    </Box>
  )
}
