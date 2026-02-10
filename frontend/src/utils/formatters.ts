/**
 * Shared date and text formatting utilities.
 */

/**
 * Format an ISO 8601 datetime string to a locale-aware date + time display.
 * Falls back to the raw string if parsing fails.
 *
 * Example: "Feb 5, 2026, 10:30 AM"
 */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/**
 * Format an ISO 8601 datetime string to a date-only display (no time).
 * Falls back to the raw string if parsing fails.
 *
 * Example: "Feb 5, 2026"
 */
export function formatDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'medium',
    })
  } catch {
    return iso
  }
}
