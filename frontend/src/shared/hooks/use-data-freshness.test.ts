import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDataFreshness } from './use-data-freshness'

describe('useDataFreshness', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns fresh state when servedFromCache is undefined', () => {
    const { result } = renderHook(() => useDataFreshness(undefined, undefined))

    expect(result.current).toEqual({
      isStale: false,
      reason: '',
      lastSyncedAt: null,
    })
  })

  it('returns fresh state when servedFromCache is false', () => {
    const { result } = renderHook(() =>
      useDataFreshness(false, '2026-02-13T10:00:00Z'),
    )

    expect(result.current.isStale).toBe(false)
    expect(result.current.reason).toBe('')
    expect(result.current.lastSyncedAt).toBe('2026-02-13T10:00:00Z')
  })

  it('returns fresh state when servedFromCache is undefined with lastSyncedAt', () => {
    const { result } = renderHook(() =>
      useDataFreshness(undefined, '2026-02-13T10:00:00Z'),
    )

    expect(result.current.isStale).toBe(false)
  })

  it('returns fresh when cached data is less than 10 minutes old', () => {
    // Mock Date.now to return a fixed time 5 minutes after the sync
    const syncTime = '2026-02-13T10:00:00Z'
    const fiveMinutesLater = new Date('2026-02-13T10:05:00Z').getTime()
    vi.spyOn(Date, 'now').mockReturnValue(fiveMinutesLater)

    const { result } = renderHook(() => useDataFreshness(true, syncTime))

    expect(result.current.isStale).toBe(false)
    expect(result.current.reason).toBe('')
  })

  it('returns stale when cached data is older than 10 minutes', () => {
    const syncTime = '2026-02-13T10:00:00Z'
    const fifteenMinutesLater = new Date('2026-02-13T10:15:00Z').getTime()
    vi.spyOn(Date, 'now').mockReturnValue(fifteenMinutesLater)

    const { result } = renderHook(() => useDataFreshness(true, syncTime))

    expect(result.current.isStale).toBe(true)
    expect(result.current.reason).toBe('Data may be outdated due to a service disruption')
    expect(result.current.lastSyncedAt).toBe(syncTime)
  })

  it('returns stale when cached with null lastSyncedAt (unknown sync time)', () => {
    const { result } = renderHook(() => useDataFreshness(true, null))

    expect(result.current.isStale).toBe(true)
    expect(result.current.lastSyncedAt).toBeNull()
  })

  it('returns stale when cached with undefined lastSyncedAt', () => {
    const { result } = renderHook(() => useDataFreshness(true, undefined))

    expect(result.current.isStale).toBe(true)
    expect(result.current.lastSyncedAt).toBeNull()
  })

  it('uses custom staleReason when provided', () => {
    const syncTime = '2026-02-13T10:00:00Z'
    const twentyMinutesLater = new Date('2026-02-13T10:20:00Z').getTime()
    vi.spyOn(Date, 'now').mockReturnValue(twentyMinutesLater)

    const { result } = renderHook(() =>
      useDataFreshness(true, syncTime, 'Database connection failed'),
    )

    expect(result.current.isStale).toBe(true)
    expect(result.current.reason).toBe('Database connection failed')
  })

  it('treats exactly 10 minutes as stale (boundary test)', () => {
    const syncTime = '2026-02-13T10:00:00Z'
    const exactlyTenMinutes = new Date('2026-02-13T10:10:00Z').getTime()
    vi.spyOn(Date, 'now').mockReturnValue(exactlyTenMinutes)

    const { result } = renderHook(() => useDataFreshness(true, syncTime))

    // At exactly 10 minutes (not < 10), data is stale
    expect(result.current.isStale).toBe(true)
  })
})
