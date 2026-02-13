import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { AppLayout } from '@/shared/components/layout/app-layout'
import {
  AXE_RUN_OPTIONS_WCAG_A,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'
import { axe } from 'vitest-axe'

// Mock child components — they have their own a11y tests and API dependencies
vi.mock('./user-approval-list', () => ({
  UserApprovalList: () => (
    <div data-testid="user-approval-list" role="region" aria-label="Pending user approvals">
      <p>No pending approvals</p>
    </div>
  ),
}))

vi.mock('./user-management-list', () => ({
  UserManagementList: () => (
    <div data-testid="user-management-list" role="region" aria-label="User management">
      <table>
        <thead><tr><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody><tr><td>user@vixxo.com</td><td>Approved</td><td><button>Remove</button></td></tr></tbody>
      </table>
    </div>
  ),
}))

vi.mock('./sync-control', () => ({
  SyncControl: () => (
    <div data-testid="sync-control" role="region" aria-label="Sync controls">
      <button>Trigger Sync</button>
      <p>Last sync: 5 minutes ago</p>
    </div>
  ),
}))

vi.mock('./audit-log-list', () => ({
  AuditLogList: () => (
    <div data-testid="audit-log-list" role="region" aria-label="Audit logs">
      <p>No audit log entries</p>
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

import { AdminPage } from './admin-page'

describe('AdminDashboard accessibility', () => {
  it('should have no axe violations on Users tab (default)', async () => {
    const { container } = render(
      <AppLayout>
        <AdminPage />
      </AppLayout>
    )
    const results = await axe(container, AXE_RUN_OPTIONS_WCAG_A)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations on Sync tab', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <AppLayout>
        <AdminPage />
      </AppLayout>
    )

    await waitFor(() => {
      expect(screen.getByTestId('tab-sync')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('tab-sync'))

    const results = await axe(container, AXE_RUN_OPTIONS_WCAG_A)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations on Audit Logs tab', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <AppLayout>
        <AdminPage />
      </AppLayout>
    )

    await waitFor(() => {
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('tab-audit'))

    const results = await axe(container, AXE_RUN_OPTIONS_WCAG_A)
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations on Settings tab', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <AppLayout>
        <AdminPage />
      </AppLayout>
    )

    await waitFor(() => {
      expect(screen.getByTestId('tab-settings')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('tab-settings'))

    const results = await axe(container, AXE_RUN_OPTIONS_WCAG_A)
    expectNoCriticalOrSeriousViolations(results)
  })
})
