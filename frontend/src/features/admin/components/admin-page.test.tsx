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

  it('clicking Settings tab shows placeholder message', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByTestId('tab-settings'))

    expect(screen.getByText('System settings will be available in a future update.')).toBeInTheDocument()
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
    expect(screen.getByText('System settings will be available in a future update.')).toBeInTheDocument()

    // Switch back to Users tab
    await user.click(screen.getByTestId('tab-users'))
    expect(screen.getByTestId('user-approval-list')).toBeInTheDocument()
    expect(screen.getByTestId('user-management-list')).toBeInTheDocument()
  })
})
