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

/**
 * Relative time formatter using native Intl.RelativeTimeFormat.
 * `numeric: 'auto'` produces "yesterday" instead of "1 day ago".
 */
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/**
 * Format an ISO 8601 datetime string as relative time.
 *
 * Output examples:
 * - <60s: "just now"
 * - <60min: "2 minutes ago"
 * - <24h: "1 hour ago"
 * - <7d: "yesterday", "3 days ago"
 * - >7d: absolute date via formatDateOnly (e.g. "Jan 15, 2026")
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffMs / 60_000)
  const diffHours = Math.round(diffMs / 3_600_000)
  const diffDays = Math.round(diffMs / 86_400_000)

  if (Math.abs(diffSeconds) < 60) return 'just now'
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day')

  // Older than 7 days: use absolute date
  return formatDateOnly(isoString)
}
