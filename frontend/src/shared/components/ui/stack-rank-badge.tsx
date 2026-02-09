import { Box } from '@chakra-ui/react'

export interface StackRankBadgeProps {
  /** Priority number: 0 = None, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low */
  priority: number
  /** Human-readable priority label: "Urgent" | "High" | "Normal" | "Low" | "None" */
  priorityLabel: string
}

/** Return type for getBadgeDimensions - size (px) and Chakra fontSize token (md/sm/xs) */
export interface BadgeDimensions {
  /** CSS size string for width and height */
  size: string
  /** Chakra UI fontSize token: md (16px), sm (14px), xs (12px) */
  fontSize: string
}

/**
 * Returns badge dimensions (size and font size) based on priority level.
 *
 * Higher priorities get larger badges to create visual hierarchy:
 * - Priority 1 (Urgent): 40px, font md
 * - Priority 2 (High):   36px, font md
 * - Priority 3 (Normal): 32px, font sm
 * - Priority 4 (Low):    28px, font xs
 * - Priority 0 (None):   32px, font sm (base size, gray styling)
 *
 * @param priority - Linear priority: 0 (None), 1 (Urgent), 2 (High), 3 (Normal), 4 (Low)
 * @returns Badge dimensions; unknown values default to 32px/sm
 */
export function getBadgeDimensions(priority: number): BadgeDimensions {
  switch (priority) {
    case 1:
      return { size: '40px', fontSize: 'md' }
    case 2:
      return { size: '36px', fontSize: 'md' }
    case 3:
      return { size: '32px', fontSize: 'sm' }
    case 4:
      return { size: '28px', fontSize: 'xs' }
    case 0:
      return { size: '32px', fontSize: 'sm' }
    default:
      return { size: '32px', fontSize: 'sm' }
  }
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
