import { Badge, Box, Flex, HStack, Text } from '@chakra-ui/react'
import { StackRankBadge } from '@/shared/components/ui/stack-rank-badge'
import type { BacklogItem } from '../types/backlog.types'

export interface BacklogItemCardProps {
  item: BacklogItem
}

/**
 * Displays a single backlog item in a scannable card format.
 *
 * Layout:
 *  [Priority Badge]  Title
 *                    Status | Team | Identifier
 *                    Labels: [Label1] [Label2]
 */
export function BacklogItemCard({ item }: BacklogItemCardProps) {
  return (
    <Flex
      p="4"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      gap="4"
      alignItems="flex-start"
      _hover={{ bg: 'gray.50' }}
      transition="background 0.15s"
      aria-label={`${item.title}, Priority ${item.priorityLabel}`}
      role="article"
    >
      {/* Left: Priority badge */}
      <StackRankBadge priority={item.priority} priorityLabel={item.priorityLabel} />

      {/* Center: Content */}
      <Box flex="1" minWidth="0">
        {/* Title */}
        <Text fontWeight="bold" fontSize="md" truncate>
          {item.title}
        </Text>

        {/* Metadata row */}
        <HStack gap="2" mt="1" flexWrap="wrap">
          <StatusBadge status={item.status} statusType={item.statusType} />
          <Text fontSize="sm" color="gray.500">
            {item.teamName}
          </Text>
          <Text fontSize="sm" color="gray.500">
            {item.identifier}
          </Text>
        </HStack>

        {/* Labels row */}
        {item.labels.length > 0 && (
          <HStack gap="1" mt="1" flexWrap="wrap">
            {item.labels.map((label) => (
              <Box
                key={label.id}
                px="2"
                py="0.5"
                borderRadius="sm"
                fontSize="xs"
                bg="gray.100"
                color="gray.700"
              >
                {label.name}
              </Box>
            ))}
          </HStack>
        )}
      </Box>
    </Flex>
  )
}

/** Status badge component with color coding based on workflow state type. */
function StatusBadge({
  status,
  statusType,
}: {
  status: string
  statusType: string
}) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    started: { bg: 'brand.teal', color: 'white' },
    completed: { bg: 'brand.green', color: 'white' },
    cancelled: { bg: 'gray.400', color: 'white' },
    backlog: { bg: 'gray.500', color: 'white' },
    unstarted: { bg: 'brand.blue', color: 'white' },
  }
  const colors = colorMap[statusType] ?? { bg: 'gray.500', color: 'white' }

  return (
    <Badge
      fontSize="sm"
      bg={colors.bg}
      color={colors.color}
      px="2"
      py="0.5"
      borderRadius="sm"
      fontWeight="semibold"
      aria-label={`Status: ${status}`}
    >
      {status}
    </Badge>
  )
}
