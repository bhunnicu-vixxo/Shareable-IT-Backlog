/**
 * Shared status color mapping for workflow state types.
 *
 * Maps Linear WorkflowState types to Chakra UI-compatible
 * background/foreground color pairs plus a human-readable label.
 * Used by BacklogItemCard for status badges AND left-border
 * color indicators with tooltips.
 */

import type { WorkflowStateType } from '../types/backlog.types'

/** A single status color entry with badge colors, border color, and label. */
export interface StatusColorEntry {
  /** Badge background (Chakra token). */
  bg: string
  /** Badge text color (Chakra token). */
  color: string
  /** Left-border indicator color (Chakra token). Uses a vivid shade for scanability. */
  borderColor: string
  /** Human-readable status label shown in tooltips. */
  label: string
}

export const STATUS_COLORS: Record<WorkflowStateType, StatusColorEntry> = {
  backlog: {
    bg: 'gray.700',
    color: 'white',
    borderColor: 'gray.400',
    label: 'Not yet planned',
  },
  triage: {
    bg: 'gray.700',
    color: 'white',
    borderColor: 'gray.500',
    label: 'Triage',
  },
  unstarted: {
    bg: 'brand.blue',
    color: 'white',
    borderColor: 'brand.blue',
    label: 'Planned',
  },
  // AC #1: started items show a green indicator. Badge uses teal (AA with white text),
  // while the left border uses brand.green for fast scanning.
  started: {
    bg: 'brand.teal',
    color: 'white',
    borderColor: 'brand.green',
    label: 'In Progress',
  },
  // AC #4: completed items show a muted green indicator.
  completed: {
    bg: 'brand.greenAccessible',
    color: 'white',
    borderColor: 'brand.greenAccessible',
    label: 'Done',
  },
  // AC #5: cancelled items show a muted red indicator.
  cancelled: {
    bg: 'error.redHover',
    color: 'white',
    borderColor: 'error.red',
    label: 'Cancelled',
  },
}

/** Default colors when statusType is unrecognised. */
export const DEFAULT_STATUS_COLORS: StatusColorEntry = {
  bg: 'gray.700',
  color: 'white',
  borderColor: 'gray.400',
  label: 'Unknown',
}

/**
 * Get status color entry for a workflow state type.
 * Returns a fallback for unknown/empty types.
 */
export function getStatusColor(statusType: string | null | undefined): StatusColorEntry {
  return (statusType ? STATUS_COLORS[statusType as WorkflowStateType] : undefined) ?? DEFAULT_STATUS_COLORS
}
