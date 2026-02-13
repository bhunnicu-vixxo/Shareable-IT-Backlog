/**
 * Shared status color mapping for workflow state types.
 *
 * Maps Linear WorkflowState types to Chakra UI-compatible
 * background/foreground color pairs. Used by BacklogItemCard
 * and ItemDetailModal to render consistent status badges.
 */
export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  started: { bg: 'brand.teal', color: 'white' },
  // WCAG: brand.greenAccessible (#6F7B24) provides 4.63:1 with white text (AA compliant).
  // brand.green (#8E992E) only provides 3.11:1 which fails AA for normal-size text.
  completed: { bg: 'brand.greenAccessible', color: 'white' },
  // WCAG: gray.700 provides strong contrast with white text (AA compliant for normal text).
  // gray.500 (#718096) is ~4.02:1 on white and is NOT sufficient for normal-size text.
  cancelled: { bg: 'gray.700', color: 'white' },
  backlog: { bg: 'gray.600', color: 'white' },
  unstarted: { bg: 'brand.blue', color: 'white' },
}

/** Default colors when statusType is unrecognised. */
export const DEFAULT_STATUS_COLORS = { bg: 'gray.600', color: 'white' }
