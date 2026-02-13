import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TtlCache } from './ttl-cache.js'

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should store and retrieve a value', () => {
    const cache = new TtlCache<string>(5000)
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('should return undefined for missing keys', () => {
    const cache = new TtlCache<string>(5000)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('should return undefined after TTL expires (lazy eviction)', () => {
    const cache = new TtlCache<string>(1000)
    cache.set('key1', 'value1')

    // Still valid at 999ms
    vi.advanceTimersByTime(999)
    expect(cache.get('key1')).toBe('value1')

    // Expired at 1001ms
    vi.advanceTimersByTime(2)
    expect(cache.get('key1')).toBeUndefined()
  })

  it('should use per-entry TTL override when provided', () => {
    const cache = new TtlCache<string>(5000)
    cache.set('short', 'value', 100)
    cache.set('default', 'value')

    vi.advanceTimersByTime(101)
    expect(cache.get('short')).toBeUndefined()
    expect(cache.get('default')).toBe('value')
  })

  it('should report has() correctly for existing and expired keys', () => {
    const cache = new TtlCache<string>(1000)
    cache.set('key1', 'value1')

    expect(cache.has('key1')).toBe(true)
    expect(cache.has('missing')).toBe(false)

    vi.advanceTimersByTime(1001)
    expect(cache.has('key1')).toBe(false)
  })

  it('should delete a specific entry', () => {
    const cache = new TtlCache<string>(5000)
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')

    expect(cache.delete('key1')).toBe(true)
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBe('value2')
  })

  it('should return false when deleting non-existent key', () => {
    const cache = new TtlCache<string>(5000)
    expect(cache.delete('missing')).toBe(false)
  })

  it('should clear all entries', () => {
    const cache = new TtlCache<string>(5000)
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.set('key3', 'value3')

    cache.clear()

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
    expect(cache.get('key3')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('should report correct size', () => {
    const cache = new TtlCache<string>(5000)
    expect(cache.size).toBe(0)

    cache.set('key1', 'value1')
    expect(cache.size).toBe(1)

    cache.set('key2', 'value2')
    expect(cache.size).toBe(2)

    cache.delete('key1')
    expect(cache.size).toBe(1)
  })

  it('should overwrite existing entries', () => {
    const cache = new TtlCache<string>(5000)
    cache.set('key1', 'original')
    cache.set('key1', 'updated')

    expect(cache.get('key1')).toBe('updated')
    expect(cache.size).toBe(1)
  })

  it('should lazily delete expired entries on get()', () => {
    const cache = new TtlCache<string>(1000)
    cache.set('key1', 'value1')

    vi.advanceTimersByTime(1001)

    // Before get(), size still reports the expired entry
    expect(cache.size).toBe(1)

    // After get(), the expired entry is removed
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('should work with complex value types', () => {
    interface Complex {
      name: string
      items: number[]
    }
    const cache = new TtlCache<Complex>(5000)
    const value: Complex = { name: 'test', items: [1, 2, 3] }

    cache.set('obj', value)
    const retrieved = cache.get('obj')

    expect(retrieved).toEqual({ name: 'test', items: [1, 2, 3] })
    // Should return the same reference (no cloning)
    expect(retrieved).toBe(value)
  })
})
