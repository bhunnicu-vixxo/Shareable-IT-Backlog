import { Box, Button, Flex, HStack, Skeleton, Text, VStack } from '@chakra-ui/react'
import { useBacklogItems } from '../hooks/use-backlog-items'
import { BacklogItemCard } from './backlog-item-card'

/**
 * Loading skeleton matching the BacklogItemCard layout.
 * Shows 5 skeleton cards during data fetching.
 */
function BacklogListSkeleton() {
  return (
    <VStack gap="4" align="stretch">
      {Array.from({ length: 5 }).map((_, i) => (
        <HStack key={i} p="4" borderWidth="1px" borderRadius="md" gap="4">
          <Skeleton boxSize="8" borderRadius="full" />
          <VStack align="start" flex="1" gap="2">
            <Skeleton height="5" width="60%" />
            <Skeleton height="4" width="40%" />
          </VStack>
        </HStack>
      ))}
    </VStack>
  )
}

/**
 * Empty state displayed when no backlog items exist.
 */
function BacklogEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      p="12"
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      textAlign="center"
    >
      <Text fontSize="2xl" mb="2">
        🔍
      </Text>
      <Text fontWeight="bold" fontSize="lg" mb="2">
        No backlog items found
      </Text>
      <Text color="gray.500" mb="4">
        Data may not have been synced yet. Contact your admin to trigger a sync.
      </Text>
      <Button onClick={onRetry} variant="outline" size="sm">
        Retry
      </Button>
    </Flex>
  )
}

/**
 * Error state displayed when the API request fails.
 */
function BacklogErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      p="12"
      borderWidth="1px"
      borderRadius="md"
      borderColor="red.200"
      bg="red.50"
      textAlign="center"
      role="alert"
    >
      <Text fontSize="2xl" mb="2">
        ⚠️
      </Text>
      <Text fontWeight="bold" fontSize="lg" mb="2" color="red.600">
        Failed to load backlog items
      </Text>
      <Text color="gray.600" mb="4">
        {message}
      </Text>
      <Button onClick={onRetry} variant="outline" size="sm">
        Try Again
      </Button>
    </Flex>
  )
}

/**
 * Main backlog list component.
 *
 * Composes BacklogItemCard with loading, error, and empty states.
 * Displays a results count and sorts items by priority (pre-sorted by backend).
 */
export function BacklogList() {
  const { data, isLoading, isError, error, refetch } = useBacklogItems()

  if (isLoading) {
    return (
      <Box data-testid="backlog-list-loading">
        <Skeleton height="5" width="120px" mb="4" />
        <BacklogListSkeleton />
      </Box>
    )
  }

  if (isError) {
    return (
      <BacklogErrorState
        message={error?.message ?? 'Please try again or contact your admin.'}
        onRetry={() => void refetch()}
      />
    )
  }

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  if (items.length === 0) {
    return <BacklogEmptyState onRetry={() => void refetch()} />
  }

  return (
    <Box>
      <Text fontSize="sm" color="gray.500" mb="4">
        Showing {totalCount} {totalCount === 1 ? 'item' : 'items'}
      </Text>
      <VStack gap="4" align="stretch">
        {items.map((item) => (
          <BacklogItemCard key={item.id} item={item} />
        ))}
      </VStack>
    </Box>
  )
}
