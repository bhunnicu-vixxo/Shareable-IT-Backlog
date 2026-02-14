import { memo } from 'react'
import { Button, EmptyState, HStack } from '@chakra-ui/react'
import { FilterX, SearchX } from 'lucide-react'

/** Props for the EmptyStateWithGuidance component. */
export interface EmptyStateWithGuidanceProps {
  /** Active search term (empty string if none). */
  keyword: string
  /** Selected label names (empty array if none). */
  selectedLabels: string[]
  /** Whether the "New only" toggle is active. */
  showNewOnly: boolean
  /** Callback to clear the keyword search. */
  onClearKeyword: () => void
  /** Callback to clear the label filter. */
  onClearLabels: () => void
  /** Callback to clear the "New only" toggle. */
  onClearNewOnly: () => void
  /** Callback to clear all active filters at once. */
  onClearAll: () => void
  /** When true, renders a condensed layout suitable for tight spaces. */
  compact?: boolean
}

/** Returns the contextual heading based on which filters are active. */
function getHeading(
  keyword: string,
  selectedLabels: string[],
  showNewOnly: boolean,
): string {
  const trimmedKeyword = keyword.trim()

  // Keyword takes priority (even if combined with other filters)
  if (trimmedKeyword) {
    return `No items found matching "${trimmedKeyword}"`
  }

  const labelText = selectedLabels.length > 0 ? selectedLabels.join(', ') : ''

  // Labels + new-only
  if (labelText && showNewOnly) {
    return `No new items for ${labelText}`
  }

  // Labels only
  if (labelText) {
    return `No items found for ${labelText}`
  }

  // New-only only
  if (showNewOnly) {
    return 'No new items'
  }

  // Fallback (shouldn't normally happen if at least one filter is active)
  return 'No items found'
}

/** Returns the contextual description with actionable suggestions. */
function getDescription(
  keyword: string,
  selectedLabels: string[],
  showNewOnly: boolean,
): string {
  const trimmedKeyword = keyword.trim()

  if (trimmedKeyword) {
    return 'Try different keywords, adjust your filters, or check that items have the expected labels.'
  }

  if (selectedLabels.length > 0 && showNewOnly) {
    return 'Try selecting different labels, remove the "New only" filter to see all items, or check label assignment.'
  }

  if (selectedLabels.length > 0) {
    return 'Try selecting different labels, clear the filter, or check label assignment.'
  }

  if (showNewOnly) {
    return 'All items have been reviewed. Remove the filter to see all items.'
  }

  return 'Try adjusting your filters to find what you are looking for.'
}

/**
 * Reusable empty state component displayed when filters return no results.
 *
 * Built on Chakra UI v3 EmptyState parts with contextual icons, headings,
 * descriptions, and action buttons based on active filter combination.
 */
export const EmptyStateWithGuidance = memo(function EmptyStateWithGuidance({
  keyword,
  selectedLabels,
  showNewOnly,
  onClearKeyword,
  onClearLabels,
  onClearNewOnly,
  onClearAll,
  compact = false,
}: EmptyStateWithGuidanceProps) {
  const trimmedKeyword = keyword.trim()
  const hasKeyword = trimmedKeyword.length > 0
  const hasLabels = selectedLabels.length > 0

  return (
    <EmptyState.Root
      size="md"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="empty-state-with-guidance"
      data-compact={compact || undefined}
      borderWidth="1px"
      borderRadius="lg"
      borderColor="border.subtle"
      bg="surface.raised"
      boxShadow="0 1px 2px rgba(62,69,67,0.04)"
      px={compact ? '4' : '6'}
      py={compact ? '6' : '10'}
      textAlign="center"
    >
      <EmptyState.Content>
        {!compact && (
          <EmptyState.Indicator color="brand.teal">
            {hasKeyword ? (
              <SearchX
                aria-hidden="true"
                focusable="false"
                data-testid="empty-state-icon-search"
              />
            ) : (
              <FilterX
                aria-hidden="true"
                focusable="false"
                data-testid="empty-state-icon-filter"
              />
            )}
          </EmptyState.Indicator>
        )}
        <EmptyState.Title
          color="fg.brand"
          fontSize={compact ? 'sm' : undefined}
        >
          {getHeading(keyword, selectedLabels, showNewOnly)}
        </EmptyState.Title>
        <EmptyState.Description
          color="fg.brandMuted"
          maxW="72ch"
          fontSize={compact ? 'xs' : undefined}
        >
          {getDescription(keyword, selectedLabels, showNewOnly)}
        </EmptyState.Description>
      </EmptyState.Content>
      <HStack gap="2" flexWrap="wrap" justifyContent="center">
        <Button onClick={onClearAll} variant="outline" size="sm">
          Clear all filters
        </Button>
        {!compact && hasKeyword && (
          <Button onClick={onClearKeyword} variant="outline" size="sm">
            Clear search filter
          </Button>
        )}
        {!compact && hasLabels && (
          <Button onClick={onClearLabels} variant="outline" size="sm">
            Clear label filter
          </Button>
        )}
        {!compact && showNewOnly && (
          <Button onClick={onClearNewOnly} variant="outline" size="sm">
            Turn off New only
          </Button>
        )}
      </HStack>
    </EmptyState.Root>
  )
})
EmptyStateWithGuidance.displayName = 'EmptyStateWithGuidance'
