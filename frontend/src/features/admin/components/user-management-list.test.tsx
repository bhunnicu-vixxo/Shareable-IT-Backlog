import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'

const { mockUseAllUsers, mockUseToggleUserStatus, mockUseAuth } = vi.hoisted(() => ({
  mockUseAllUsers: vi.fn(),
  mockUseToggleUserStatus: vi.fn(),
  mockUseAuth: vi.fn(),
}))

vi.mock('../hooks/use-all-users', () => ({
  useAllUsers: mockUseAllUsers,
}))

vi.mock('../hooks/use-toggle-user-status', () => ({
  useToggleUserStatus: mockUseToggleUserStatus,
}))

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}))

import { UserManagementList } from './user-management-list'

const approvedUser = {
  id: 2,
  email: 'approved@vixxo.com',
  displayName: 'Approved User',
  isAdmin: false,
  isApproved: true,
  isDisabled: false,
  approvedAt: '2026-02-10T10:00:00Z',
  lastAccessAt: '2026-02-10T14:00:00Z',
  createdAt: '2026-02-10T09:00:00Z',
}

const pendingUser = {
  id: 3,
  email: 'pending@vixxo.com',
  displayName: 'Pending User',
  isAdmin: false,
  isApproved: false,
  isDisabled: false,
  approvedAt: null,
  lastAccessAt: null,
  createdAt: '2026-02-10T11:00:00Z',
}

const disabledUser = {
  id: 4,
  email: 'disabled@vixxo.com',
  displayName: 'Disabled User',
  isAdmin: false,
  isApproved: true,
  isDisabled: true,
  approvedAt: '2026-02-10T10:00:00Z',
  lastAccessAt: null,
  createdAt: '2026-02-10T12:00:00Z',
}

const adminUser = {
  id: 1,
  email: 'admin@vixxo.com',
  displayName: 'Admin',
  isAdmin: true,
  isApproved: true,
  isDisabled: false,
  approvedAt: '2026-02-10T08:00:00Z',
  lastAccessAt: '2026-02-10T15:00:00Z',
  createdAt: '2026-02-10T08:00:00Z',
}

describe('UserManagementList', () => {
  beforeEach(() => {
    mockUseToggleUserStatus.mockReturnValue({
      toggleStatus: vi.fn().mockResolvedValue(undefined),
      isToggling: false,
      error: null,
    })
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false },
      isAdmin: true,
    })
  })

  it('should render user list with names and status badges', () => {
    mockUseAllUsers.mockReturnValue({
      users: [adminUser, approvedUser, pendingUser, disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByText('admin@vixxo.com')).toBeInTheDocument()
    expect(screen.getByText('approved@vixxo.com')).toBeInTheDocument()
    expect(screen.getByText('pending@vixxo.com')).toBeInTheDocument()
    expect(screen.getByText('disabled@vixxo.com')).toBeInTheDocument()
    expect(screen.getByText('4 total')).toBeInTheDocument()

    // Role badges should always be visible (Admin vs User)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getAllByText('User').length).toBeGreaterThan(0)
  })

  it('should show "Disable" button for approved users', () => {
    mockUseAllUsers.mockReturnValue({
      users: [approvedUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByRole('button', { name: /disable approved@vixxo.com/i })).toBeInTheDocument()
  })

  it('should show "Enable" button for disabled users', () => {
    mockUseAllUsers.mockReturnValue({
      users: [disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByRole('button', { name: /enable disabled@vixxo.com/i })).toBeInTheDocument()
  })

  it('should NOT show action button for pending users', () => {
    mockUseAllUsers.mockReturnValue({
      users: [pendingUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.queryByRole('button', { name: /disable/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enable/i })).not.toBeInTheDocument()
  })

  it('should NOT show "Disable" button for current admin user', () => {
    mockUseAllUsers.mockReturnValue({
      users: [adminUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    // adminUser.id === 1 matches currentUser.id === 1, so no Disable button
    expect(screen.queryByRole('button', { name: /disable admin@vixxo.com/i })).not.toBeInTheDocument()
  })

  it('should filter users by email when searching', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [adminUser, approvedUser, pendingUser, disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    const searchInput = screen.getByTestId('user-search-input')
    await user.type(searchInput, 'approved')

    expect(screen.getByText('approved@vixxo.com')).toBeInTheDocument()
    expect(screen.queryByText('pending@vixxo.com')).not.toBeInTheDocument()
    expect(screen.queryByText('disabled@vixxo.com')).not.toBeInTheDocument()
    expect(screen.queryByText('admin@vixxo.com')).not.toBeInTheDocument()
  })

  it('should filter users by display name when searching', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [adminUser, approvedUser, pendingUser, disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    const searchInput = screen.getByTestId('user-search-input')
    await user.type(searchInput, 'Disabled User')

    expect(screen.getByText('disabled@vixxo.com')).toBeInTheDocument()
    expect(screen.queryByText('approved@vixxo.com')).not.toBeInTheDocument()
  })

  it('should show empty state when no users', () => {
    mockUseAllUsers.mockReturnValue({
      users: [],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    mockUseAllUsers.mockReturnValue({
      users: [],
      isLoading: true,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByText(/loading users/i)).toBeInTheDocument()
  })

  it('should show "no match" message when search has no results', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [approvedUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    const searchInput = screen.getByTestId('user-search-input')
    await user.type(searchInput, 'nonexistent')

    expect(screen.getByText('No users match your search')).toBeInTheDocument()
  })
})
