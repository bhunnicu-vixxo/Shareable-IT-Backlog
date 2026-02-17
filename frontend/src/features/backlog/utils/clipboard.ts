/** Copy text to clipboard. Returns true on success, false on failure. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Build the shareable deep-link URL for an item identifier. */
export function buildItemLink(identifier: string): string {
  // Use Vite's BASE_URL so links work when the app is hosted under a subpath.
  // Example: origin=https://example.com, BASE_URL=/it-backlog/ => https://example.com/it-backlog/?item=VIX-338
  const baseUrl = import.meta.env.BASE_URL || '/'
  const url = new URL(baseUrl, window.location.origin)
  url.searchParams.set('item', identifier)
  return url.toString()
}
