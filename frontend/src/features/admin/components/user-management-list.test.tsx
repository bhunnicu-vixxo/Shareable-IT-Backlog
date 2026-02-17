import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { toaster } from '@/components/ui/toaster'

const { mockUseAllUsers, mockUseToggleUserStatus, mockUseAuth, mockUseToggleITRole, mockUseRemoveUser, mockUseToggleAdminRole } = vi.hoisted(() => ({
  mockUseAllUsers: vi.fn(),
  mockUseToggleUserStatus: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseToggleITRole: vi.fn(),
  mockUseRemoveUser: vi.fn(),
  mockUseToggleAdminRole: vi.fn(),
}))

vi.mock('../hooks/use-all-users', () => ({
  useAllUsers: mockUseAllUsers,
}))

vi.mock('../hooks/use-toggle-user-status', () => ({
  useToggleUserStatus: mockUseToggleUserStatus,
}))

vi.mock('../hooks/use-toggle-it-role', () => ({
  useToggleITRole: mockUseToggleITRole,
}))

vi.mock('../hooks/use-remove-user', () => ({
  useRemoveUser: mockUseRemoveUser,
}))

vi.mock('../hooks/use-toggle-admin-role', () => ({
  useToggleAdminRole: mockUseToggleAdminRole,
}))

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}))

import { UserManagementList } from './user-management-list'

let toasterCreateSpy: ReturnType<typeof vi.spyOn>

const approvedUser = {
  id: 2,
  email: 'approved@vixxo.com',
  displayName: 'Approved User',
  isAdmin: false,
  isIT: false,
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
  isIT: false,
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
  isIT: false,
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
  isIT: false,
  isApproved: true,
  isDisabled: false,
  approvedAt: '2026-02-10T08:00:00Z',
  lastAccessAt: '2026-02-10T15:00:00Z',
  createdAt: '2026-02-10T08:00:00Z',
}

const otherAdminUser = {
  id: 5,
  email: 'otheradmin@vixxo.com',
  displayName: 'Other Admin',
  isAdmin: true,
  isIT: false,
  isApproved: true,
  isDisabled: false,
  approvedAt: '2026-02-10T08:00:00Z',
  lastAccessAt: '2026-02-10T15:00:00Z',
  createdAt: '2026-02-10T08:00:00Z',
}

describe('UserManagementList', () => {
  beforeEach(() => {
    toasterCreateSpy = vi.spyOn(toaster, 'create').mockImplementation(() => 'mock-toast-id')
    mockUseToggleUserStatus.mockReturnValue({
      toggleStatus: vi.fn().mockResolvedValue(undefined),
      isToggling: false,
      error: null,
    })
    mockUseToggleITRole.mockReturnValue({
      toggleITRole: vi.fn().mockResolvedValue(undefined),
      isToggling: false,
      error: null,
    })
    mockUseRemoveUser.mockReturnValue({
      removeUser: vi.fn().mockResolvedValue(undefined),
      isRemoving: false,
      error: null,
    })
    mockUseToggleAdminRole.mockReturnValue({
      toggleAdminRole: vi.fn().mockResolvedValue(undefined),
      isToggling: false,
      error: null,
    })
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false },
      isAdmin: true,
    })
  })

  afterEach(() => {
    toasterCreateSpy.mockRestore()
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

    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
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

  it('should show "Enable" and "Remove" buttons for disabled users', () => {
    mockUseAllUsers.mockReturnValue({
      users: [disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByRole('button', { name: /enable disabled@vixxo.com/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove disabled@vixxo.com/i })).toBeInTheDocument()
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

  it('should NOT show "Disable" or admin role buttons for current admin user', () => {
    mockUseAllUsers.mockReturnValue({
      users: [adminUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.queryByRole('button', { name: /disable admin@vixxo.com/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /demote.*admin@vixxo.com/i })).not.toBeInTheDocument()
  })

  it('should show "Make Admin" button for approved non-admin users (not self)', () => {
    mockUseAllUsers.mockReturnValue({
      users: [approvedUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByRole('button', { name: /promote approved@vixxo.com to admin/i })).toBeInTheDocument()
  })

  it('should show "Demote Admin" button for other admin users (not self)', () => {
    mockUseAllUsers.mockReturnValue({
      users: [otherAdminUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByRole('button', { name: /demote otheradmin@vixxo.com from admin/i })).toBeInTheDocument()
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

  it('should show skeleton when loading', () => {
    mockUseAllUsers.mockReturnValue({
      users: [],
      isLoading: true,
      error: null,
    })

    render(<UserManagementList />)

    expect(screen.getByTestId('user-management-skeleton')).toBeInTheDocument()
    expect(screen.queryByText(/loading users/i)).not.toBeInTheDocument()
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

  it('should open confirmation dialog when disable is clicked', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [approvedUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /disable approved@vixxo.com/i }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/no longer be able to access/)).toBeInTheDocument()
  })

  it('should open confirmation dialog when remove is clicked', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /remove disabled@vixxo.com/i }))

    expect(screen.getByText('Permanently Remove User')).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it('should open confirmation dialog when promote is clicked', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [approvedUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /promote approved@vixxo.com to admin/i }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/full administrative privileges/)).toBeInTheDocument()
  })

  it('should open confirmation dialog when demote is clicked', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [otherAdminUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /demote otheradmin@vixxo.com from admin/i }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/lose all administrative privileges/)).toBeInTheDocument()
  })

  it('should call removeUser when confirming removal', async () => {
    const removeMock = vi.fn().mockResolvedValue(undefined)
    mockUseRemoveUser.mockReturnValue({
      removeUser: removeMock,
      isRemoving: false,
      error: null,
    })
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /remove disabled@vixxo.com/i }))
    await user.click(screen.getByRole('button', { name: /remove permanently/i }))

    expect(removeMock).toHaveBeenCalledWith(4)
  })

  it('should call toggleAdminRole when confirming promotion', async () => {
    const toggleMock = vi.fn().mockResolvedValue(undefined)
    mockUseToggleAdminRole.mockReturnValue({
      toggleAdminRole: toggleMock,
      isToggling: false,
      error: null,
    })
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [approvedUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /promote approved@vixxo.com to admin/i }))
    await user.click(screen.getByRole('button', { name: /promote to admin/i }))

    expect(toggleMock).toHaveBeenCalledWith({ userId: 2, isAdmin: true })
  })

  it('should close dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    mockUseAllUsers.mockReturnValue({
      users: [disabledUser],
      isLoading: false,
      error: null,
    })

    render(<UserManagementList />)

    await user.click(screen.getByRole('button', { name: /remove disabled@vixxo.com/i }))
    expect(screen.getByText('Permanently Remove User')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText('Permanently Remove User')).not.toBeInTheDocument()
  })
})
