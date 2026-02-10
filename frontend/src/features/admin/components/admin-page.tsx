import { Box, Heading, VStack } from '@chakra-ui/react'
import { SyncControl } from './sync-control'

export function AdminPage() {
  return (
    <Box maxW="960px" mx="auto" p={6}>
      <VStack gap={8} align="stretch">
        <Heading size="xl">Administration</Heading>
        <SyncControl />
      </VStack>
    </Box>
  )
}
