import { describe, it, expect, vi } from 'vitest'
import { render } from '@/utils/test-utils'
import { SyncStatusIndicator } from './sync-status-indicator'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

// Mock the sync status hook
vi.mock('../hooks/use-sync-status', () => ({
  useSyncStatus: vi.fn(),
}))

// Mock useQueryClient
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})

// Mock formatRelativeTime for predictable output
vi.mock('@/utils/formatters', () => ({
  formatRelativeTime: vi.fn(() => '5 minutes ago'),
}))

// Mock getUserFriendlyErrorMessage
vi.mock('@/utils/sync-error-messages', () => ({
  getUserFriendlyErrorMessage: vi.fn(() => ({
    title: 'Sync Error',
    description: 'An error occurred during sync.',
    guidance: 'Please try again later.',
  })),
}))

import { useSyncStatus } from '../hooks/use-sync-status'
const mockUseSyncStatus = vi.mocked(useSyncStatus)

describe('SyncStatusIndicator accessibility', () => {
  it('should have no axe violations when synced successfully', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: new Date().toISOString(),
        status: 'success',
        itemCount: 42,
        errorMessage: null,
        errorCode: null,
        itemsSynced: 42,
        itemsFailed: null,
      },
      isLoading: false,
    })

    const results = await checkAccessibility(<SyncStatusIndicator />)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations in error state', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: '2026-02-10T10:00:00.000Z',
        status: 'error',
        itemCount: null,
        errorMessage: 'Connection timeout',
        errorCode: 'SYNC_API_UNAVAILABLE',
        itemsSynced: null,
        itemsFailed: null,
      },
      isLoading: false,
    })

    const results = await checkAccessibility(<SyncStatusIndicator />)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations when never synced', async () => {
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
    })

    const results = await checkAccessibility(<SyncStatusIndicator />)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations while loading', async () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: null,
      isLoading: true,
    })

    const results = await checkAccessibility(<SyncStatusIndicator />)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have decorative dots with aria-hidden', () => {
    mockUseSyncStatus.mockReturnValue({
      syncStatus: {
        lastSyncedAt: new Date().toISOString(),
        status: 'success',
        itemCount: 42,
        errorMessage: null,
        errorCode: null,
        itemsSynced: 42,
        itemsFailed: null,
      },
      isLoading: false,
    })

    const { container } = render(<SyncStatusIndicator />)
    const dot = container.querySelector('[data-testid="sync-status-dot"]')
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })
})
