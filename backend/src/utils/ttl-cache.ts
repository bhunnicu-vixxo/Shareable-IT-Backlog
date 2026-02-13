/**
 * Generic in-memory cache with per-entry time-to-live (TTL).
 *
 * Uses lazy eviction — expired entries are removed on `get()` access,
 * not via timers. This avoids timer leaks and keeps the implementation
 * simple and testable.
 *
 * @template T - The type of cached values.
 */
export class TtlCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>()

  /**
   * @param defaultTtlMs - Default time-to-live in milliseconds for new entries.
   */
  constructor(private defaultTtlMs: number) {}

  /**
   * Retrieve a cached value by key.
   *
   * Returns `undefined` if the key doesn't exist or has expired.
   * Expired entries are lazily deleted on access.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  /**
   * Store a value in the cache with an optional per-entry TTL override.
   *
   * @param key - Cache key
   * @param value - Value to store
   * @param ttlMs - Optional TTL in milliseconds (overrides default)
   */
  set(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    })
  }

  /**
   * Check if a key exists and has not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete a specific cache entry.
   *
   * @returns `true` if the entry existed, `false` otherwise.
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Number of entries in the cache (including potentially expired ones).
   *
   * Note: This may include expired entries that haven't been lazily evicted yet.
   * For an accurate count of live entries, iterate and check expiry.
   */
  get size(): number {
    return this.cache.size
  }
}
