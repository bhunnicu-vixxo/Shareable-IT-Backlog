import { describe, it, vi } from 'vitest'
import { BacklogPage } from './backlog-page'
import { AppLayout } from '@/shared/components/layout/app-layout'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

// Mock BacklogList — it has complex data-fetching internals
vi.mock('./backlog-list', () => ({
  BacklogList: () => (
    <div data-testid="backlog-list" role="list" aria-label="Backlog items">
      <div role="listitem">Mock backlog item 1</div>
      <div role="listitem">Mock backlog item 2</div>
    </div>
  ),
}))

// Mock SyncStatusIndicator — it depends on API hooks
vi.mock('./sync-status-indicator', () => ({
  SyncStatusIndicator: () => (
    <div role="status" aria-live="polite">
      Last synced: 5 minutes ago
    </div>
  ),
}))

// Mock auth hook for AppLayout/AppHeader
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { email: 'test@vixxo.com', id: '1', isAdmin: true, status: 'approved' },
    isAdmin: true,
    logout: vi.fn(),
    isLoggingOut: false,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

describe('BacklogPage accessibility', () => {
  it('should have no axe violations with default state', async () => {
    const results = await checkAccessibility(
      <AppLayout>
        <BacklogPage />
      </AppLayout>,
      { wrapInMain: false }
    )
    expectNoCriticalOrSeriousViolations(results)
  })
})
