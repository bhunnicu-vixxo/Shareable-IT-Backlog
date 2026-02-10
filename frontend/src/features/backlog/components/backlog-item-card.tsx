import { Badge, Box, Flex, HStack, Text } from '@chakra-ui/react'
import { StackRankBadge } from '@/shared/components/ui/stack-rank-badge'
import { STATUS_COLORS, DEFAULT_STATUS_COLORS } from '../utils/status-colors'
import { highlightText } from '../utils/highlight'
import type { BacklogItem } from '../types/backlog.types'

export interface BacklogItemCardProps {
  item: BacklogItem
  /** Optional click handler. When provided, card is clickable (cursor pointer, keyboard activatable). */
  onClick?: () => void
  /** Search tokens to highlight in the title (and other visible text). Empty array = no highlights. */
  highlightTokens?: string[]
}

/**
 * Displays a single backlog item in a scannable card format.
 *
 * Layout:
 *  [Priority Badge]  Title
 *                    Status | Team | Identifier
 *                    Labels: [Label1] [Label2]
 *
 * When onClick is provided, the card is clickable and keyboard-accessible (Enter/Space to activate).
 */
export function BacklogItemCard({ item, onClick, highlightTokens = [] }: BacklogItemCardProps) {
  const isClickable = !!onClick

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isClickable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <Flex
      p="4"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      gap="4"
      alignItems="flex-start"
      _hover={{ bg: 'gray.50' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'brand.green',
        outlineOffset: '2px',
        borderColor: 'brand.green',
      }}
      transition="background 0.15s"
      aria-label={`${item.title}, Priority ${item.priorityLabel}${item.isNew ? ', New item' : ''}`}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      cursor={isClickable ? 'pointer' : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Left: Priority badge */}
      <StackRankBadge priority={item.priority} priorityLabel={item.priorityLabel} />

      {/* Center: Content */}
      <Box flex="1" minWidth="0">
        {/* Title */}
        <Text fontWeight="bold" fontSize="md" truncate>
          {highlightTokens.length > 0
            ? highlightText(item.title, highlightTokens)
            : item.title}
        </Text>

        {/* Metadata row */}
        <HStack gap="2" mt="1" flexWrap="wrap">
          <StatusBadge status={item.status} statusType={item.statusType} />
          {item.isNew && <NewItemBadge />}
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

/**
 * "New" badge for items recently added to the backlog.
 * Uses Vixxo Yellow (brand.yellow) as background with dark text for WCAG AA contrast.
 * Includes text label so colour is not the sole indicator (accessibility).
 */
function NewItemBadge() {
  return (
    <Badge
      fontSize="xs"
      bg="brand.yellow"
      color="brand.gray"
      px="2"
      py="0.5"
      borderRadius="sm"
      fontWeight="semibold"
      aria-label="New item"
    >
      New
    </Badge>
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
  const colors = STATUS_COLORS[statusType] ?? DEFAULT_STATUS_COLORS

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
