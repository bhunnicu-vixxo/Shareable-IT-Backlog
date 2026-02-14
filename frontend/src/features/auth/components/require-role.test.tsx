import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { RequireRole } from './require-role'

// Mock useAuth to control role booleans (usePermissions calls useAuth internally)
const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

const defaultAuthState = {
  user: null,
  isLoading: false,
  isIdentified: false,
  isApproved: false,
  isAdmin: false,
  isIT: false,
  error: null,
  identify: vi.fn(),
  isIdentifying: false,
  identifyError: null,
  logout: vi.fn(),
  isLoggingOut: false,
  checkSession: vi.fn(),
}

describe('RequireRole', () => {
  // --- role="it" tests ---

  it('renders children when role="it" and user is IT', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: true })

    render(
      <RequireRole role="it">
        <span>IT Content</span>
      </RequireRole>,
    )

    expect(screen.getByText('IT Content')).toBeInTheDocument()
  })

  it('renders children when role="it" and user is Admin', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isAdmin: true })

    render(
      <RequireRole role="it">
        <span>IT Content</span>
      </RequireRole>,
    )

    expect(screen.getByText('IT Content')).toBeInTheDocument()
  })

  it('does not render children when role="it" and user is regular', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: false, isAdmin: false })

    render(
      <RequireRole role="it">
        <span>IT Content</span>
      </RequireRole>,
    )

    expect(screen.queryByText('IT Content')).not.toBeInTheDocument()
  })

  it('renders fallback when role="it" and user is unauthorized', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: false, isAdmin: false })

    render(
      <RequireRole role="it" fallback={<span>Access denied</span>}>
        <span>IT Content</span>
      </RequireRole>,
    )

    expect(screen.queryByText('IT Content')).not.toBeInTheDocument()
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  // --- role="admin" tests ---

  it('renders children when role="admin" and user is Admin', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isAdmin: true })

    render(
      <RequireRole role="admin">
        <span>Admin Content</span>
      </RequireRole>,
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('does not render children when role="admin" and user is IT only', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: true, isAdmin: false })

    render(
      <RequireRole role="admin">
        <span>Admin Content</span>
      </RequireRole>,
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('does not render children when role="admin" and user is regular', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: false, isAdmin: false })

    render(
      <RequireRole role="admin">
        <span>Admin Content</span>
      </RequireRole>,
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders fallback when role="admin" and user is unauthorized', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: true, isAdmin: false })

    render(
      <RequireRole role="admin" fallback={<span>Not an admin</span>}>
        <span>Admin Content</span>
      </RequireRole>,
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    expect(screen.getByText('Not an admin')).toBeInTheDocument()
  })

  it('renders null (nothing) when unauthorized and no fallback provided', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, isIT: false, isAdmin: false })

    const { container } = render(
      <RequireRole role="admin">
        <span>Admin Content</span>
      </RequireRole>,
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
  })
})
