/**
 * Shared status color mapping for workflow state types.
 *
 * Maps Linear WorkflowState types to Chakra UI-compatible
 * background/foreground color pairs. Used by BacklogItemCard
 * and ItemDetailModal to render consistent status badges.
 */
export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  started: { bg: 'brand.teal', color: 'white' },
  completed: { bg: 'brand.green', color: 'white' },
  cancelled: { bg: 'gray.400', color: 'white' },
  backlog: { bg: 'gray.500', color: 'white' },
  unstarted: { bg: 'brand.blue', color: 'white' },
}

/** Default colors when statusType is unrecognised. */
export const DEFAULT_STATUS_COLORS = { bg: 'gray.500', color: 'white' }
