import { vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'

const mockLogout = vi.fn()

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}))

import { AppHeader } from './app-header'

function setupAdminUser() {
  mockUseAuth.mockReturnValue({
    user: { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false },
    isAdmin: true,
    logout: mockLogout,
    isLoggingOut: false,
  })
}

function setupRegularUser() {
  mockUseAuth.mockReturnValue({
    user: { id: 2, email: 'user@vixxo.com', displayName: 'User', isAdmin: false, isApproved: true, isDisabled: false },
    isAdmin: false,
    logout: mockLogout,
    isLoggingOut: false,
  })
}

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders app title that links to "/"', () => {
    setupAdminUser()
    render(<AppHeader />)

    const titleLink = screen.getByRole('link', { name: /it backlog/i })
    expect(titleLink).toBeInTheDocument()
    expect(titleLink).toHaveAttribute('href', '/')
  })

  it('renders "Backlog" navigation link', () => {
    setupRegularUser()
    render(<AppHeader />)

    const backlogLink = screen.getByRole('link', { name: /^backlog$/i })
    expect(backlogLink).toBeInTheDocument()
    expect(backlogLink).toHaveAttribute('href', '/')
  })

  it('renders "Admin" link when user is admin', () => {
    setupAdminUser()
    render(<AppHeader />)

    const adminLink = screen.getByRole('link', { name: /^admin$/i })
    expect(adminLink).toBeInTheDocument()
    expect(adminLink).toHaveAttribute('href', '/admin')
  })

  it('does NOT render "Admin" link when user is not admin', () => {
    setupRegularUser()
    render(<AppHeader />)

    const adminLink = screen.queryByRole('link', { name: /^admin$/i })
    expect(adminLink).not.toBeInTheDocument()
  })

  it('renders user email', () => {
    setupAdminUser()
    render(<AppHeader />)

    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@vixxo.com')
  })

  it('"Sign Out" button calls logout()', async () => {
    setupAdminUser()
    const user = userEvent.setup()

    render(<AppHeader />)

    const signOutButton = screen.getByTestId('sign-out-button')
    await user.click(signOutButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('displays user email for regular user', () => {
    setupRegularUser()
    render(<AppHeader />)

    expect(screen.getByTestId('user-email')).toHaveTextContent('user@vixxo.com')
  })
})
