import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useApproveUser } from './use-approve-user'

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

describe('useApproveUser', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should call POST /admin/users/:id/approve', async () => {
    const mockApproved = { id: 2, email: 'user@vixxo.com', isApproved: true }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApproved),
    })

    const { result } = renderHook(() => useApproveUser(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.approveUser(2)
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/2/approve'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('should handle approval failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { message: 'User not found' } }),
    })

    const { result } = renderHook(() => useApproveUser(), { wrapper: createWrapper() })

    await expect(
      act(async () => {
        await result.current.approveUser(999)
      }),
    ).rejects.toThrow('User not found')
  })
})
