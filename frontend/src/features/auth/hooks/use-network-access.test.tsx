import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/utils/test-utils'
import { useNetworkAccess } from './use-network-access'
import { resetNetworkAccess } from '@/features/auth/network-access.store'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
  resetNetworkAccess()
})

describe('useNetworkAccess', () => {
  it('should initially be checking', () => {
    // Never resolve so effect doesn't update state outside act()
    mockFetch.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useNetworkAccess())

    // Initial state: checking
    expect(result.current.isChecking).toBe(true)
    expect(result.current.isNetworkDenied).toBe(false)
  })

  it('should set isNetworkDenied=false when API responds successfully', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })

    const { result } = renderHook(() => useNetworkAccess())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.isNetworkDenied).toBe(false)
  })

  it('should set isNetworkDenied=true when API responds with 403 NETWORK_ACCESS_DENIED', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: {
            message: 'Access denied — Vixxo network required.',
            code: 'NETWORK_ACCESS_DENIED',
          },
        }),
    })

    const { result } = renderHook(() => useNetworkAccess())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.isNetworkDenied).toBe(true)
  })

  it('should set isNetworkDenied=false for non-network 403 errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: { message: 'Forbidden', code: 'FORBIDDEN' },
        }),
    })

    const { result } = renderHook(() => useNetworkAccess())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.isNetworkDenied).toBe(false)
  })

  it('should set isNetworkDenied=false for non-403 errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: { message: 'Internal error', code: 'INTERNAL_ERROR' },
        }),
    })

    const { result } = renderHook(() => useNetworkAccess())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.isNetworkDenied).toBe(false)
  })

  it('should re-check on retry', async () => {
    // First call returns denied
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: {
            message: 'Access denied',
            code: 'NETWORK_ACCESS_DENIED',
          },
        }),
    })

    const { result } = renderHook(() => useNetworkAccess())

    await waitFor(() => {
      expect(result.current.isNetworkDenied).toBe(true)
    })

    // Now allow access on retry
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) })

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.isNetworkDenied).toBe(false)
    })
  })

  it('should handle fetch network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNetworkAccess())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    // Network error (can't reach API at all) is NOT the same as network access denied
    expect(result.current.isNetworkDenied).toBe(false)
  })
})
