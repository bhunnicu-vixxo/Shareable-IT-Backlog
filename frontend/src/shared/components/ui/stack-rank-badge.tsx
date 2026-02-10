import { Box } from '@chakra-ui/react'
import { getBadgeDimensions } from './stack-rank-badge.utils'

export interface StackRankBadgeProps {
  /** Priority number: 0 = None, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low */
  priority: number
  /** Human-readable priority label: "Urgent" | "High" | "Normal" | "Low" | "None" */
  priorityLabel: string
}

/**
 * Circular badge displaying a backlog item's priority number.
 *
 * - Priorities 1–4 display in Vixxo Green (#8E992E) with white text.
 * - Priority 0 (None) displays in gray with a dash.
 * - Size scales with priority: larger badges for higher priority (1 = largest at 40px).
 * - Font size scales proportionally for readability at all badge sizes.
 */
export function StackRankBadge({ priority, priorityLabel }: StackRankBadgeProps) {
  const isNone = priority === 0
  const displayValue = isNone ? '–' : String(priority)
  const bgColor = isNone ? 'gray.400' : 'brand.green'
  const { size, fontSize } = getBadgeDimensions(priority)

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minWidth={size}
      minHeight={size}
      width={size}
      height={size}
      borderRadius="full"
      bg={bgColor}
      color="white"
      fontWeight="bold"
      fontSize={fontSize}
      lineHeight="1"
      flexShrink={0}
      aria-label={`Priority ${priorityLabel}`}
      role="img"
      data-bg={bgColor}
      data-font-size={fontSize}
    >
      {displayValue}
    </Box>
  )
}
