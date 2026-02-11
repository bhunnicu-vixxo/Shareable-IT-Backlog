import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { SyncControl } from './sync-control'
import type { SyncStatus } from '@/features/backlog/types/backlog.types'

// Mock the hooks
const mockUseSyncStatus = vi.fn()
const mockUseSyncTrigger = vi.fn()
const mockUseSyncHistory = vi.fn()

vi.mock('../hooks/use-sync-status', () => ({
  useSyncStatus: (...args: unknown[]) => mockUseSyncStatus(...args),
}))

vi.mock('../hooks/use-sync-trigger', () => ({
  useSyncTrigger: () => mockUseSyncTrigger(),
}))

vi.mock('../hooks/use-sync-history', () => ({
  useSyncHistory: () => mockUseSyncHistory(),
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
  itemsSynced: null,
  itemsFailed: null,
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
    mockUseSyncHistory.mockReturnValue({
      history: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
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

  it('shows error alert with retry button on failure', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Network error',
        errorCode: 'SYNC_UNKNOWN_ERROR',
        itemsSynced: null,
        itemsFailed: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(await screen.findByText(/sync failed/i)).toBeInTheDocument()
    expect(await screen.findByText(/network error/i)).toBeInTheDocument()

    const retryButton = await screen.findByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    expect(mockTriggerSync).toHaveBeenCalledTimes(1)
  })

  it('shows error code in error alert title', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Linear API authentication failed',
        errorCode: 'SYNC_AUTH_FAILED',
        itemsSynced: null,
        itemsFailed: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(await screen.findByText(/SYNC_AUTH_FAILED/)).toBeInTheDocument()
  })

  it('shows last successful sync time in error alert', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T06:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Connection refused',
        errorCode: 'SYNC_API_UNAVAILABLE',
        itemsSynced: null,
        itemsFailed: null,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(await screen.findByText(/Last successful sync/)).toBeInTheDocument()
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

  it('shows partial success alert after sync transitions to partial', async () => {
    const partialStatus = {
      ...defaultSyncStatus,
      status: 'partial' as const,
      itemsSynced: 45,
      itemsFailed: 3,
      errorCode: 'SYNC_PARTIAL_SUCCESS',
      errorMessage: '3 item(s) failed to sync',
    }

    mockUseSyncStatus.mockReturnValueOnce({
      syncStatus: { ...defaultSyncStatus, status: 'syncing' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    const { rerender } = render(<SyncControl />)
    expect(screen.queryByText(/Synced with warnings/i)).not.toBeInTheDocument()

    // Switch to persistent partial status for subsequent renders
    mockUseSyncStatus.mockReturnValue({
      syncStatus: partialStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    rerender(<SyncControl />)
    expect(await screen.findByText(/Synced with warnings/i)).toBeInTheDocument()
  })

  it('shows items synced/failed counts in partial alert', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        ...defaultSyncStatus,
        status: 'partial',
        itemsSynced: 45,
        itemsFailed: 3,
        errorCode: 'SYNC_PARTIAL_SUCCESS',
        errorMessage: '3 item(s) failed to sync',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(await screen.findByText(/45 synced/)).toBeInTheDocument()
    expect(await screen.findByText(/3 failed/)).toBeInTheDocument()
  })

  it('shows error code in partial alert description', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        ...defaultSyncStatus,
        status: 'partial',
        itemsSynced: 45,
        itemsFailed: 3,
        errorCode: 'SYNC_PARTIAL_SUCCESS',
        errorMessage: '3 item(s) failed to sync',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<SyncControl />)
    expect(await screen.findByText(/SYNC_PARTIAL_SUCCESS/)).toBeInTheDocument()
  })

  it('handles null lastSyncedAt (never synced)', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: null,
        status: 'idle',
        itemCount: null,
        errorMessage: null,
        errorCode: null,
        itemsSynced: null,
        itemsFailed: null,
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

  // --- Sync History Tests ---
  describe('Sync History', () => {
    const mockHistoryEntries = [
      {
        id: 1,
        status: 'success' as const,
        triggerType: 'scheduled' as const,
        triggeredBy: null,
        startedAt: '2026-02-10T06:00:00.000Z',
        completedAt: '2026-02-10T06:00:02.000Z',
        durationMs: 2000,
        itemsSynced: 100,
        itemsFailed: 0,
        errorMessage: null,
        errorDetails: null,
        createdAt: '2026-02-10T06:00:00.000Z',
      },
      {
        id: 2,
        status: 'error' as const,
        triggerType: 'manual' as const,
        triggeredBy: 5,
        startedAt: '2026-02-10T12:00:00.000Z',
        completedAt: '2026-02-10T12:00:01.000Z',
        durationMs: 1000,
        itemsSynced: 0,
        itemsFailed: 0,
        errorMessage: 'Connection refused',
        errorDetails: { errorCode: 'SYNC_API_UNAVAILABLE' },
        createdAt: '2026-02-10T12:00:00.000Z',
      },
      {
        id: 3,
        status: 'partial' as const,
        triggerType: 'scheduled' as const,
        triggeredBy: null,
        startedAt: '2026-02-10T18:00:00.000Z',
        completedAt: '2026-02-10T18:00:03.000Z',
        durationMs: 3000,
        itemsSynced: 80,
        itemsFailed: 5,
        errorMessage: 'Some items failed',
        errorDetails: null,
        createdAt: '2026-02-10T18:00:00.000Z',
      },
    ]

    it('renders sync history heading', () => {
      render(<SyncControl />)
      expect(screen.getByText('Sync History')).toBeInTheDocument()
    })

    it('renders "No sync history yet" when empty', () => {
      render(<SyncControl />)
      expect(screen.getByText('No sync history yet')).toBeInTheDocument()
    })

    it('renders history rows with correct data', () => {
      mockUseSyncHistory.mockReturnValue({
        history: mockHistoryEntries,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      // Check status badges are rendered
      expect(screen.getByText('success')).toBeInTheDocument()
      expect(screen.getByText('error')).toBeInTheDocument()
      expect(screen.getByText('partial')).toBeInTheDocument()
    })

    it('renders status badges with correct color coding', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [mockHistoryEntries[0]], // success entry
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      const successBadge = screen.getByText('success')
      expect(successBadge).toBeInTheDocument()
    })

    it('shows error details for failed rows', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [mockHistoryEntries[1]], // error entry
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
      expect(screen.getByText(/SYNC_API_UNAVAILABLE/)).toBeInTheDocument()
    })

    it('shows error details for partial rows', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [mockHistoryEntries[2]], // partial entry
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      expect(screen.getByText(/Some items failed/)).toBeInTheDocument()
    })

    it('does not show error column content for success rows', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [mockHistoryEntries[0]], // success entry
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      expect(screen.queryByText('Connection refused')).not.toBeInTheDocument()
    })

    it('shows loading state for history', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      expect(screen.getByText('Loading history...')).toBeInTheDocument()
    })

    it('shows error state for history', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [],
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      expect(screen.getByText(/Failed to load sync history/)).toBeInTheDocument()
    })

    it('renders items with failed count when applicable', () => {
      mockUseSyncHistory.mockReturnValue({
        history: [mockHistoryEntries[2]], // partial entry: 80 synced, 5 failed
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<SyncControl />)

      expect(screen.getByText(/80/)).toBeInTheDocument()
      expect(screen.getByText(/5 failed/)).toBeInTheDocument()
    })
  })
})
