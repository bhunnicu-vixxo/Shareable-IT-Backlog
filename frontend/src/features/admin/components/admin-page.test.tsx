import { vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { waitFor } from '@testing-library/react'

vi.mock('./user-approval-list', () => ({
  UserApprovalList: () => <div data-testid="user-approval-list">UserApprovalList</div>,
}))

vi.mock('./user-management-list', () => ({
  UserManagementList: () => <div data-testid="user-management-list">UserManagementList</div>,
}))

vi.mock('./sync-control', () => ({
  SyncControl: () => <div data-testid="sync-control">SyncControl</div>,
}))

vi.mock('./label-visibility-manager', () => ({
  LabelVisibilityManager: () => <div data-testid="label-visibility-manager">LabelVisibilityManager</div>,
}))

vi.mock('../hooks/use-label-visibility', () => ({
  useLabelVisibility: () => ({
    labels: [],
    unreviewedCount: 0,
    isLoading: false,
    error: null,
  }),
}))

import { AdminPage } from './admin-page'

describe('AdminPage', () => {
  it('renders "Administration" heading', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /administration/i })).toBeInTheDocument()
    })
  })

  it('renders three tabs: Users, Sync, Settings', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByTestId('tab-users')).toBeInTheDocument()
      expect(screen.getByTestId('tab-sync')).toBeInTheDocument()
      expect(screen.getByTestId('tab-settings')).toBeInTheDocument()
    })
  })

  it('Users tab is active by default and shows UserApprovalList and UserManagementList', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByTestId('user-approval-list')).toBeInTheDocument()
      expect(screen.getByTestId('user-management-list')).toBeInTheDocument()
    })
  })

  it('clicking Sync tab shows SyncControl', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByTestId('tab-sync'))

    expect(screen.getByTestId('sync-control')).toBeInTheDocument()
  })

  it('clicking Settings tab shows LabelVisibilityManager', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByTestId('tab-settings'))

    expect(screen.getByTestId('label-visibility-manager')).toBeInTheDocument()
  })

  // --- Screen Reader Support (Story 11.2) ---

  it('renders "Administration" as h1 heading', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /administration/i, level: 1 })
      expect(heading).toBeInTheDocument()
    })
  })

  it('tabs list has aria-label "Admin sections"', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'Admin sections' })).toBeInTheDocument()
    })
  })

  it('renders screen reader-only instructions', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText(/Admin dashboard\. Use tabs to switch/)).toBeInTheDocument()
    })
  })

  it('tab navigation works — clicking tab changes content', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    // Initially shows Users tab content
    expect(screen.getByTestId('user-approval-list')).toBeInTheDocument()
    expect(screen.getByTestId('user-management-list')).toBeInTheDocument()

    // Switch to Sync tab
    await user.click(screen.getByTestId('tab-sync'))
    expect(screen.getByTestId('sync-control')).toBeInTheDocument()

    // Switch to Settings tab
    await user.click(screen.getByTestId('tab-settings'))
    expect(screen.getByTestId('label-visibility-manager')).toBeInTheDocument()

    // Switch back to Users tab
    await user.click(screen.getByTestId('tab-users'))
    expect(screen.getByTestId('user-approval-list')).toBeInTheDocument()
    expect(screen.getByTestId('user-management-list')).toBeInTheDocument()
  })
})
