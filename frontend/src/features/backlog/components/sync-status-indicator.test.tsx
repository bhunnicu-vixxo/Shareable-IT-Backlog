import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@/utils/test-utils'
import { SyncStatusIndicator } from './sync-status-indicator'
import type { SyncStatus } from '../types/backlog.types'

// Mock the hook — we test the component's rendering logic, not the data fetching
vi.mock('../hooks/use-sync-status', () => ({
  useSyncStatus: vi.fn(),
}))

// Mock useQueryClient from TanStack Query
const mockInvalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  }
})

// Import the mocked module to control return values per test
import { useSyncStatus } from '../hooks/use-sync-status'
const mockUseSyncStatus = vi.mocked(useSyncStatus)

// Mock formatRelativeTime to return predictable values
vi.mock('@/utils/formatters', () => ({
  formatRelativeTime: vi.fn((iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'some time ago'

    const diffMs = Date.now() - d.getTime()
    const diffMinutes = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMs / 3_600_000)

    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    if (diffHours < 48) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }),
}))

// Mock getUserFriendlyErrorMessage to return predictable values
vi.mock('@/utils/sync-error-messages', () => ({
  getUserFriendlyErrorMessage: vi.fn((code: string | null) => {
    if (code === 'SYNC_API_UNAVAILABLE') {
      return {
        title: 'Linear is unreachable',
        description: 'Unable to connect to Linear to refresh data.',
        guidance: 'The system will retry automatically. Data shown may be outdated.',
      }
    }
    return {
      title: 'Sync issue',
      description: 'An unexpected issue occurred while refreshing data.',
      guidance: 'Data shown may be outdated. The system will retry automatically.',
    }
  }),
}))

function makeSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    lastSyncedAt: '2026-02-10T16:00:00.000Z',
    status: 'success',
    itemCount: 42,
    errorMessage: null,
    errorCode: null,
    itemsSynced: null,
    itemsFailed: null,
    ...overrides,
  }
}

describe('SyncStatusIndicator', () => {
  const realNow = Date.now

  beforeEach(() => {
    vi.restoreAllMocks()
    mockInvalidateQueries.mockClear()
    // Default: loading state
    vi.mocked(useSyncStatus).mockReturnValue({
      syncStatus: null,
      isLoading: true,
      error: null,
    })
  })

  afterEach(() => {
    Date.now = realNow
  })

  it('should render skeleton placeholder during initial load', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: null,
      isLoading: true,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByTestId('sync-status-skeleton')).toBeInTheDocument()
  })

  it('should render "Not yet synced" when lastSyncedAt is null', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({ lastSyncedAt: null, status: 'idle' }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByText('Not yet synced')).toBeInTheDocument()
    const dot = screen.getByTestId('sync-status-dot')
    expect(dot).toHaveAttribute('data-color', 'brand.grayLight')
  })

  it('should render spinner and "Syncing..." when status is syncing', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({ status: 'syncing' }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('should render "Last synced: X ago" with green dot when sync is recent (<4h)', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        lastSyncedAt: '2026-02-10T16:00:00.000Z',
        status: 'success',
      }),
      isLoading: false,
      error: null,
    })

    Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

    render(<SyncStatusIndicator />)
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
    expect(screen.getByText(/2 minutes ago/)).toBeInTheDocument()
    const dot = screen.getByTestId('sync-status-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute('data-color', 'brand.teal')
  })

  it('should render yellow dot when sync is stale (4-24h)', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        lastSyncedAt: '2026-02-10T08:00:00.000Z',
        status: 'success',
      }),
      isLoading: false,
      error: null,
    })

    Date.now = vi.fn(() => new Date('2026-02-10T16:00:00.000Z').getTime())

    render(<SyncStatusIndicator />)
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
    const dot = screen.getByTestId('sync-status-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute('data-color', 'brand.yellow')
  })

  it('should render red dot when sync is very stale (>24h)', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        lastSyncedAt: '2026-02-08T06:00:00.000Z',
        status: 'success',
      }),
      isLoading: false,
      error: null,
    })

    Date.now = vi.fn(() => new Date('2026-02-10T16:00:00.000Z').getTime())

    render(<SyncStatusIndicator />)
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
    const dot = screen.getByTestId('sync-status-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute('data-color', 'error.red')
  })

  it('should render alert banner with user-friendly message when status is error', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        errorMessage: 'Connection refused',
        errorCode: 'SYNC_API_UNAVAILABLE',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByTestId('sync-error-title')).toHaveTextContent('Linear is unreachable')
    expect(screen.getByText(/Unable to connect/)).toBeInTheDocument()
    expect(screen.getByText(/retry automatically/)).toBeInTheDocument()
  })

  it('should show last successful sync time in error state', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        errorMessage: 'API timeout',
        errorCode: 'SYNC_TIMEOUT',
        lastSyncedAt: '2026-02-10T16:00:00.000Z',
      }),
      isLoading: false,
      error: null,
    })

    Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

    render(<SyncStatusIndicator />)
    const description = screen.getByText(/Last successful sync:/)
    expect(description).toHaveTextContent(/Last successful sync: 2 minutes ago\./)
  })

  it('should not show last successful sync when lastSyncedAt is null in error state', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        lastSyncedAt: null,
        errorMessage: 'Some error',
        errorCode: 'SYNC_UNKNOWN_ERROR',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByTestId('sync-error-title')).toHaveTextContent('Sync issue')
    expect(screen.queryByText(/Last successful sync/)).not.toBeInTheDocument()
  })

  it('should not expose technical error details to users', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        errorMessage: 'Linear API rate limit exceeded',
        errorCode: 'SYNC_RATE_LIMITED',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(
      screen.queryByText('Linear API rate limit exceeded'),
    ).not.toBeInTheDocument()
  })

  it('should include guidance text in error alert', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        errorMessage: 'Connection refused',
        errorCode: 'SYNC_API_UNAVAILABLE',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByText(/Data shown may be outdated/)).toBeInTheDocument()
  })

  it('should render "Refresh data" button in error state', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        errorMessage: 'Connection refused',
        errorCode: 'SYNC_API_UNAVAILABLE',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    const refreshBtn = screen.getByTestId('sync-error-refresh-btn')
    expect(refreshBtn).toBeInTheDocument()
    expect(refreshBtn).toHaveTextContent('Refresh data')
    expect(refreshBtn).toHaveAttribute('aria-label', 'Refresh backlog data')
  })

  it('should call invalidateQueries when "Refresh data" button is clicked', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'error',
        errorMessage: 'Connection refused',
        errorCode: 'SYNC_API_UNAVAILABLE',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    const refreshBtn = screen.getByTestId('sync-error-refresh-btn')
    fireEvent.click(refreshBtn)

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['backlog-items'] })
  })

  it('should render yellow dot with "Synced with warnings" when status is partial', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'partial',
        itemsSynced: 45,
        itemsFailed: 3,
        errorCode: 'SYNC_PARTIAL_SUCCESS',
        errorMessage: '3 item(s) failed to sync',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    const dot = screen.getByTestId('sync-status-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute('data-color', 'brand.yellow')
    expect(screen.getByText(/Synced with warnings/)).toBeInTheDocument()
  })

  it('should show count of failed items in partial status', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'partial',
        itemsSynced: 45,
        itemsFailed: 3,
        errorCode: 'SYNC_PARTIAL_SUCCESS',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByText(/3 items failed/)).toBeInTheDocument()
  })

  it('should show singular "item" when exactly 1 item failed in partial status', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'partial',
        itemsSynced: 49,
        itemsFailed: 1,
        errorCode: 'SYNC_PARTIAL_SUCCESS',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    expect(screen.getByText(/1 item failed/)).toBeInTheDocument()
    // Should NOT have plural "items"
    expect(screen.queryByText(/1 items failed/)).not.toBeInTheDocument()
  })

  it('should not show error alert banner for partial status', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'partial',
        itemsSynced: 45,
        itemsFailed: 3,
        errorCode: 'SYNC_PARTIAL_SUCCESS',
      }),
      isLoading: false,
      error: null,
    })

    render(<SyncStatusIndicator />)
    // Should NOT render the error alert
    expect(screen.queryByTestId('sync-error-title')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sync-error-refresh-btn')).not.toBeInTheDocument()
  })

  it('should not render "Refresh data" button when status is success', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: makeSyncStatus({
        status: 'success',
        lastSyncedAt: '2026-02-10T16:00:00.000Z',
      }),
      isLoading: false,
      error: null,
    })

    Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

    render(<SyncStatusIndicator />)
    expect(screen.queryByTestId('sync-error-refresh-btn')).not.toBeInTheDocument()
  })

  // =========================================================================
  // New tests for Story 8.4 enhancements
  // =========================================================================

  describe('ARIA live region', () => {
    it('should wrap content in a role="status" element with aria-live="polite"', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      render(<SyncStatusIndicator />)
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      expect(statusRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('should have role="status" wrapper in syncing state', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({ status: 'syncing' }),
        isLoading: false,
        error: null,
      })

      render(<SyncStatusIndicator />)
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should have role="status" wrapper in error state', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          status: 'error',
          errorMessage: 'Connection refused',
          errorCode: 'SYNC_API_UNAVAILABLE',
        }),
        isLoading: false,
        error: null,
      })

      render(<SyncStatusIndicator />)
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should have aria-hidden on status dot', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      render(<SyncStatusIndicator />)
      const dot = screen.getByTestId('sync-status-dot')
      expect(dot).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Compact variant', () => {
    it('should render error as inline text instead of alert banner in compact mode', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          status: 'error',
          errorMessage: 'Connection refused',
          errorCode: 'SYNC_API_UNAVAILABLE',
        }),
        isLoading: false,
        error: null,
      })

      render(<SyncStatusIndicator compact />)
      // Should show inline text with error title
      expect(screen.getByText(/Sync error — Linear is unreachable/)).toBeInTheDocument()
      // Should NOT show the full alert banner
      expect(screen.queryByTestId('sync-error-title')).not.toBeInTheDocument()
      expect(screen.queryByTestId('sync-error-refresh-btn')).not.toBeInTheDocument()
    })

    it('should show dot and "Last synced" text for success state in compact mode', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      render(<SyncStatusIndicator compact />)
      expect(screen.getByTestId('sync-status-dot')).toBeInTheDocument()
      expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
      expect(screen.getByText(/2 minutes ago/)).toBeInTheDocument()
    })

    it('should have data-compact attribute when compact prop is true', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      render(<SyncStatusIndicator compact />)
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('data-compact', 'true')
    })

    it('should NOT have data-compact attribute when compact prop is false/default', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      render(<SyncStatusIndicator />)
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).not.toHaveAttribute('data-compact')
    })

    it('should show error dot with error.red color in compact error mode', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          status: 'error',
          errorMessage: 'Connection refused',
          errorCode: 'SYNC_API_UNAVAILABLE',
        }),
        isLoading: false,
        error: null,
      })

      render(<SyncStatusIndicator compact />)
      const dot = screen.getByTestId('sync-status-dot')
      expect(dot).toHaveAttribute('data-color', 'error.red')
    })
  })

  describe('Auto-refresh interval', () => {
    it('should set up a 60-second interval for re-rendering', () => {
      vi.useFakeTimers()

      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      let now = new Date('2026-02-10T16:02:00.000Z').getTime()
      Date.now = vi.fn(() => now)

      render(<SyncStatusIndicator />)
      expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
      expect(screen.getByText(/2 minutes ago/)).toBeInTheDocument()

      // Advance timers by 60 seconds — should trigger re-render
      act(() => {
        now += 60_000
        vi.advanceTimersByTime(60_000)
      })

      // Component should still render correctly after the interval fires
      expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
      expect(screen.getByText(/3 minutes ago/)).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should clean up interval on unmount', () => {
      vi.useFakeTimers()
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      const { unmount } = render(<SyncStatusIndicator />)
      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
      vi.useRealTimers()
    })
  })

  describe('Backward compatibility', () => {
    it('should render without any props (default behavior)', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          lastSyncedAt: '2026-02-10T16:00:00.000Z',
          status: 'success',
        }),
        isLoading: false,
        error: null,
      })
      Date.now = vi.fn(() => new Date('2026-02-10T16:02:00.000Z').getTime())

      // Should render successfully with no props (as backlog-page.tsx uses it)
      render(<SyncStatusIndicator />)
      expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
      expect(screen.getByTestId('sync-status-dot')).toBeInTheDocument()
    })

    it('should render full error alert banner in default (non-compact) mode', () => {
      mockUseSyncStatus.mockReturnValue({
        syncStatus: makeSyncStatus({
          status: 'error',
          errorMessage: 'Connection refused',
          errorCode: 'SYNC_API_UNAVAILABLE',
        }),
        isLoading: false,
        error: null,
      })

      render(<SyncStatusIndicator />)
      // Full alert banner should be visible
      expect(screen.getByTestId('sync-error-title')).toHaveTextContent('Linear is unreachable')
      expect(screen.getByTestId('sync-error-refresh-btn')).toBeInTheDocument()
    })
  })
})
