import { vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}))

import { AppLayout } from './app-layout'

describe('AppLayout', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'admin@vixxo.com', displayName: 'Admin', isAdmin: true, isApproved: true, isDisabled: false },
      isAdmin: true,
      logout: vi.fn(),
      isLoggingOut: false,
    })
  })

  it('renders AppHeader and children', () => {
    render(
      <AppLayout>
        <div data-testid="child-content">Hello World</div>
      </AppLayout>
    )

    // Header should be present
    expect(screen.getByRole('link', { name: /it backlog/i })).toBeInTheDocument()

    // Children should be rendered
    expect(screen.getByTestId('child-content')).toHaveTextContent('Hello World')
  })
})
