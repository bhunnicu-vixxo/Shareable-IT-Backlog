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
   * Sequential stack rank position (1-based). When provided, displays this
   * number instead of the raw priority value. Colors still derive from priority.
   */
  stackRank?: number
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
 * Badge displaying a backlog item's stack rank position or priority number.
 *
 * When `stackRank` is provided, shows the sequential rank (1, 2, 3…) with
 * priority-based coloring preserved. When omitted, falls back to displaying
 * the raw priority number (legacy behavior).
 *
 * - Priorities 1–4 display in green styling with bold text.
 * - Priority 0 (None) displays in gray with a dash.
 * - Optional `size` prop overrides auto-sizing for explicit control.
 * - Optional `variant` prop controls visual style (solid/outline/subtle).
 */
export const StackRankBadge = memo(function StackRankBadge({
  priority,
  priorityLabel,
  stackRank,
  size: sizeProp,
  variant = 'solid',
}: StackRankBadgeProps) {
  const isNone = priority === 0
  const hasStackRank = stackRank != null

  // Display value: stack rank > priority number > dash (for None)
  const displayValue = isNone && !hasStackRank
    ? '–'
    : hasStackRank
      ? String(stackRank)
      : String(priority)

  // Determine dimensions
  const digitCount = displayValue.length
  let badgeSize: string
  let badgeFontSize: string

  if (sizeProp) {
    const dims = getExplicitSizeDimensions(sizeProp)
    badgeSize = dims.size
    badgeFontSize = dims.fontSize
  } else if (hasStackRank) {
    // Consistent sizing for stack ranks with font scaling for multi-digit numbers
    badgeSize = digitCount >= 3 ? '34px' : digitCount >= 2 ? '30px' : '28px'
    badgeFontSize = digitCount >= 3 ? '10px' : digitCount >= 2 ? '11px' : 'sm'
  } else {
    const dims = getBadgeDimensions(priority)
    badgeSize = dims.size
    badgeFontSize = dims.fontSize
  }

  // Determine variant styles (priority-based coloring preserved regardless of display mode)
  const variantStyles = getVariantStyles(variant, isNone)

  // Accessible label includes both rank and priority when stack rank is shown
  const ariaLabel = hasStackRank
    ? `Rank ${stackRank}, ${priorityLabel} priority`
    : `Priority ${priorityLabel}`

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minWidth={badgeSize}
      minHeight={hasStackRank ? '28px' : badgeSize}
      width={hasStackRank ? undefined : badgeSize}
      height={hasStackRank ? '28px' : badgeSize}
      px={digitCount >= 2 && hasStackRank ? '1' : '0'}
      borderRadius="full"
      bg={variantStyles.bg}
      color={variantStyles.color}
      borderWidth={variantStyles.borderWidth}
      borderColor={variantStyles.borderColor}
      borderStyle={variantStyles.borderWidth !== '0' ? 'solid' : undefined}
      fontWeight="bold"
      fontSize={badgeFontSize}
      lineHeight="1"
      flexShrink={0}
      aria-label={ariaLabel}
      role="img"
      data-bg={variantStyles.bg}
      data-font-size={badgeFontSize}
      data-variant={variant}
      data-size={sizeProp ?? 'auto'}
    >
      {displayValue}
    </Box>
  )
})
StackRankBadge.displayName = 'StackRankBadge'
