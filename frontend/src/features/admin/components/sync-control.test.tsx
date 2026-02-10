import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { SyncControl } from './sync-control'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'

// Mock the hooks
const mockUseSyncStatus = vi.fn()
const mockUseSyncTrigger = vi.fn()

vi.mock('../hooks/use-sync-status', () => ({
  useSyncStatus: (...args: unknown[]) => mockUseSyncStatus(...args),
}))

vi.mock('../hooks/use-sync-trigger', () => ({
  useSyncTrigger: () => mockUseSyncTrigger(),
}))

// Mock formatRelativeTime to get predictable output
vi.mock('@/utils/formatters', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/formatters')>()
  return {
    ...original,
    formatRelativeTime: vi.fn((iso: string) => `relative(${iso})`),
  }
})

const defaultSyncStatus: SyncStatus = {
  lastSyncedAt: '2026-02-10T06:00:00.000Z',
  status: 'success',
  itemCount: 42,
  errorMessage: null,
  errorCode: null,
}

describe('SyncControl', () => {
  const mockTriggerSync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSyncStatus.mockReturnValue({
      syncStatus: defaultSyncStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseSyncTrigger.mockReturnValue({
      triggerSync: mockTriggerSync,
      isTriggering: false,
      triggerError: null,
    })
  })

  it('renders "Sync Now" button', () => {
    render(<SyncControl />)
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
  })

  it('renders section heading', () => {
    render(<SyncControl />)
    expect(screen.getByText('Data Synchronization')).toBeInTheDocument()
  })

  it('calls triggerSync when button is clicked', () => {
    render(<SyncControl />)
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
    expect(mockTriggerSync).toHaveBeenCalledTimes(1)
  })

  it('disables button and shows spinner during sync', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: { ...defaultSyncStatus, status: 'syncing' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    const button = screen.getByRole('button', { name: /syncing/i })
    expect(button).toBeDisabled()
  })

  it('disables button while trigger mutation is pending', () => {
    mockUseSyncTrigger.mockReturnValue({
      triggerSync: mockTriggerSync,
      isTriggering: true,
      triggerError: null,
    })

    render(<SyncControl />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows success alert after sync completes', async () => {
    mockUseSyncStatus
      .mockReturnValueOnce({
        syncStatus: { ...defaultSyncStatus, status: 'syncing' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        syncStatus: defaultSyncStatus,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

    const { rerender } = render(<SyncControl />)
    expect(screen.queryByText(/sync completed/i)).not.toBeInTheDocument()

    rerender(<SyncControl />)
    expect(await screen.findByText(/sync completed/i)).toBeInTheDocument()
    expect(screen.getByText(/42 items synced/i)).toBeInTheDocument()
  })

  it('shows error alert with retry button on failure', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Network error',
        errorCode: 'SYNC_UNKNOWN_ERROR',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(screen.getByText(/sync failed/i)).toBeInTheDocument()
    expect(screen.getByText(/network error/i)).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    expect(mockTriggerSync).toHaveBeenCalledTimes(1)
  })

  it('shows error code in error alert title', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Linear API authentication failed',
        errorCode: 'SYNC_AUTH_FAILED',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(screen.getByText(/SYNC_AUTH_FAILED/)).toBeInTheDocument()
  })

  it('shows last successful sync time in error alert', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Connection refused',
        errorCode: 'SYNC_API_UNAVAILABLE',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(screen.getByText(/Last successful sync/)).toBeInTheDocument()
  })

  it('displays last synced relative time', () => {
    render(<SyncControl />)
    expect(
      screen.getByText(/relative\(2026-02-10T06:00:00.000Z\)/),
    ).toBeInTheDocument()
  })

  it('displays item count in status line', () => {
    render(<SyncControl />)
    // Both the status line and success alert show "42 items" — verify at least one exists
    const matches = screen.getAllByText(/42 items/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('handles null lastSyncedAt (never synced)', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: null,
        status: 'idle',
        itemCount: null,
        errorMessage: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(screen.getByText(/never synced/i)).toBeInTheDocument()
  })

  it('handles null syncStatus (loading)', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    // Should still render the button
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
  })
})
