import { memo } from 'react'
import { Box } from '@chakra-ui/react'
import {
  getBadgeDimensions,
  getExplicitSizeDimensions,
  getVariantStyles,
} from './stack-rank-badge.utils'
import type { StackRankBadgeSize, StackRankBadgeVariant } from './stack-rank-badge.utils'

export type { StackRankBadgeSize, StackRankBadgeVariant }

export interface StackRankBadgeProps {
  /** Priority number: 0 = None, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low */
  priority: number
  /** Human-readable priority label: "Urgent" | "High" | "Normal" | "Low" | "None" */
  priorityLabel: string
  /**
   * Explicit size override. When provided, overrides priority-based auto-sizing.
   * - "sm": 24px badge — compact headers, dense lists
   * - "md": 32px badge — standard list views
   * - "lg": 40px badge — detail views, hero placements
   *
   * Omit to use priority-based auto-sizing (default, preserves legacy behavior).
   */
  size?: StackRankBadgeSize
  /**
   * Visual style variant.
   * - "solid" (default): Filled background with white text (meets WCAG AA when rendered as "large text").
   * - "outline": Transparent bg with accessible colored border and text.
   * - "subtle": Light tint bg with accessible colored text (meets WCAG AA when rendered as "large text").
   */
  variant?: StackRankBadgeVariant
}

/**
 * Circular badge displaying a backlog item's priority number.
 *
 * - Priorities 1–4 display in green styling with bold text.
 * - Priority 0 (None) displays in gray with a dash.
 * - Size scales with priority: larger badges for higher priority (1 = largest at 40px).
 * - Font size scales proportionally for readability at all badge sizes.
 * - Optional `size` prop overrides auto-sizing for explicit control.
 * - Optional `variant` prop controls visual style (solid/outline/subtle).
 */
export const StackRankBadge = memo(function StackRankBadge({
  priority,
  priorityLabel,
  size: sizeProp,
  variant = 'solid',
}: StackRankBadgeProps) {
  const isNone = priority === 0
  const displayValue = isNone ? '–' : String(priority)

  // Determine dimensions: explicit size overrides priority-based auto-sizing
  const { size, fontSize } = sizeProp
    ? getExplicitSizeDimensions(sizeProp)
    : getBadgeDimensions(priority)

  // Determine variant styles
  const variantStyles = getVariantStyles(variant, isNone)

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
      bg={variantStyles.bg}
      color={variantStyles.color}
      borderWidth={variantStyles.borderWidth}
      borderColor={variantStyles.borderColor}
      borderStyle={variantStyles.borderWidth !== '0' ? 'solid' : undefined}
      fontWeight="bold"
      fontSize={fontSize}
      lineHeight="1"
      flexShrink={0}
      aria-label={`Priority ${priorityLabel}`}
      role="img"
      data-bg={variantStyles.bg}
      data-font-size={fontSize}
      data-variant={variant}
      data-size={sizeProp ?? 'auto'}
    >
      {displayValue}
    </Box>
  )
})
StackRankBadge.displayName = 'StackRankBadge'
