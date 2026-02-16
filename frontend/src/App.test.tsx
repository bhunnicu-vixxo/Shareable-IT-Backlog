import { vi } from 'vitest'
import { render, screen, waitFor } from '@/utils/test-utils'

// Mock the network access hook to bypass the network check in App tests
vi.mock('@/features/auth/hooks/use-network-access', () => ({
  useNetworkAccess: () => ({
    isChecking: false,
    isNetworkDenied: false,
    retry: vi.fn(),
  }),
}))

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}))

import App from './App'

const authenticatedUser = {
  user: { id: 1, email: 'user@vixxo.com', displayName: 'User', isAdmin: false, isApproved: true, isDisabled: false },
  isLoading: false,
  isIdentified: true,
  isApproved: true,
  isAdmin: false,
  error: null,
  identify: vi.fn(),
  isIdentifying: false,
  identifyError: null,
  logout: vi.fn(),
  isLoggingOut: false,
  checkSession: vi.fn(),
}

const adminUser = {
  ...authenticatedUser,
  user: { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false },
  isAdmin: true,
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders backlog page when user is authenticated and approved', async () => {
    mockUseAuth.mockReturnValue(authenticatedUser)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /backlog/i })).toBeInTheDocument()
    })
  })

  it('renders AppHeader when user is authenticated and approved', async () => {
    mockUseAuth.mockReturnValue(authenticatedUser)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /it backlog/i })).toBeInTheDocument()
      expect(screen.getByTestId('user-email')).toHaveTextContent('user@vixxo.com')
      expect(screen.getByTestId('sign-out-button')).toBeInTheDocument()
    })
  })

  it('renders Admin link in header for admin users', async () => {
    mockUseAuth.mockReturnValue(adminUser)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^admin$/i })).toBeInTheDocument()
    })
  })

  it('does NOT render Admin link in header for non-admin users', async () => {
    mockUseAuth.mockReturnValue(authenticatedUser)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /it backlog/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument()
  })

  it('renders access denied when non-admin visits /admin', async () => {
    mockUseAuth.mockReturnValue(authenticatedUser)

    render(<App />, { initialEntries: ['/admin'] })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument()
    })
  })

  it('renders identify form when not authenticated (no AppHeader)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isIdentified: false,
      isApproved: false,
      isAdmin: false,
      error: null,
      identify: vi.fn(),
      isIdentifying: false,
      identifyError: null,
      logout: vi.fn(),
      isLoggingOut: false,
      checkSession: vi.fn(),
    })

    render(<App />)

    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.queryByTestId('sign-out-button')).not.toBeInTheDocument()
  })

  it('renders pending approval when identified but not approved (no AppHeader)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'user@vixxo.com', displayName: 'User', isAdmin: false, isApproved: false, isDisabled: false },
      isLoading: false,
      isIdentified: true,
      isApproved: false,
      isAdmin: false,
      error: null,
      identify: vi.fn(),
      isIdentifying: false,
      identifyError: null,
      logout: vi.fn(),
      isLoggingOut: false,
      checkSession: vi.fn(),
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: /access pending approval/i })).toBeInTheDocument()
    expect(screen.queryByTestId('sign-out-button')).not.toBeInTheDocument()
  })

  it('renders loading state while checking session (no AppHeader)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isIdentified: false,
      isApproved: false,
      isAdmin: false,
      error: null,
      identify: vi.fn(),
      isIdentifying: false,
      identifyError: null,
      logout: vi.fn(),
      isLoggingOut: false,
      checkSession: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByTestId('sign-out-button')).not.toBeInTheDocument()
  })
})
