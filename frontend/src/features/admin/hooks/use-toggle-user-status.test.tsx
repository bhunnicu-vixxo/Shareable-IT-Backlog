import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useToggleUserStatus } from './use-toggle-user-status'

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

describe('useToggleUserStatus', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should call POST /admin/users/:id/disable', async () => {
    const mockDisabled = { id: 2, email: 'user@vixxo.com', isDisabled: true }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDisabled),
    })

    const { result } = renderHook(() => useToggleUserStatus(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.toggleStatus({ userId: 2, action: 'disable' })
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/2/disable'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should call POST /admin/users/:id/enable', async () => {
    const mockEnabled = { id: 3, email: 'disabled@vixxo.com', isDisabled: false }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEnabled),
    })

    const { result } = renderHook(() => useToggleUserStatus(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.toggleStatus({ userId: 3, action: 'enable' })
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/3/enable'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should handle disable failure with error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: 'Cannot disable your own account' } }),
    })

    const { result } = renderHook(() => useToggleUserStatus(), { wrapper: createWrapper() })

    await expect(
      act(async () => {
        await result.current.toggleStatus({ userId: 1, action: 'disable' })
      }),
    ).rejects.toThrow('Cannot disable your own account')
  })

  it('should invalidate both all-users and pending-users queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 2, isDisabled: true }),
    })

    const { result } = renderHook(() => useToggleUserStatus(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.toggleStatus({ userId: 2, action: 'disable' })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'all-users'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'pending-users'] })
  })
})
