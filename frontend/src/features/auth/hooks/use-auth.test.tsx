import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAuth } from './use-auth'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

const mockUser = {
  id: 1,
  email: 'user@vixxo.com',
  displayName: 'User',
  isAdmin: false,
  isApproved: true,
  isDisabled: false,
}

describe('useAuth', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch /auth/me on mount and populate user', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isIdentified).toBe(true)
    expect(result.current.isApproved).toBe(true)
  })

  it('should handle 401 on /auth/me (no session)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Auth required', code: 'AUTH_REQUIRED' } }),
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isIdentified).toBe(false)
  })

  it('should identify user via /auth/identify', async () => {
    // /auth/me returns 401, then /auth/identify returns user
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/auth/identify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        })
      }
      // /auth/me returns 401
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { code: 'AUTH_REQUIRED' } }),
      })
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.identify('user@vixxo.com')
    })

    // After identify, the user should be set via setQueryData
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })
    expect(result.current.isIdentified).toBe(true)
  })

  it('should clear user on logout', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/auth/logout')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      // /auth/me returns user
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUser),
      })
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isIdentified).toBe(true)
    })

    // Now make /auth/me also return 401 (after logout, session is gone)
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/auth/logout')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { code: 'AUTH_REQUIRED' } }),
      })
    })

    await act(async () => {
      await result.current.logout()
    })

    await waitFor(() => {
      expect(result.current.user).toBeNull()
    })
  })
})
