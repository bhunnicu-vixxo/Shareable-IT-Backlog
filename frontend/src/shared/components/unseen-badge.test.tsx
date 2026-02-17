import { vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'

const { mockUseUnseenCount } = vi.hoisted(() => ({
  mockUseUnseenCount: vi.fn(),
}))

vi.mock('@/features/backlog/hooks/use-unseen-count', () => ({
  useUnseenCount: mockUseUnseenCount,
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  }
})

import { UnseenBadge } from './unseen-badge'

describe('UnseenBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders badge with count when unseenCount > 0', () => {
    mockUseUnseenCount.mockReturnValue({
      data: { unseenCount: 5, lastSeenAt: '2026-02-15T10:00:00.000Z' },
      isLoading: false,
    })

    render(<UnseenBadge />)

    expect(screen.getByTestId('unseen-badge')).toBeInTheDocument()
    expect(screen.getByText('5 new')).toBeInTheDocument()
  })

  it('hides badge when unseenCount is 0', () => {
    mockUseUnseenCount.mockReturnValue({
      data: { unseenCount: 0, lastSeenAt: '2026-02-17T10:00:00.000Z' },
      isLoading: false,
    })

    render(<UnseenBadge />)

    expect(screen.queryByTestId('unseen-badge')).not.toBeInTheDocument()
  })

  it('hides badge while loading', () => {
    mockUseUnseenCount.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<UnseenBadge />)

    expect(screen.queryByTestId('unseen-badge')).not.toBeInTheDocument()
  })

  it('navigates to /?unseen=1 when clicked', async () => {
    mockUseUnseenCount.mockReturnValue({
      data: { unseenCount: 3, lastSeenAt: '2026-02-15T10:00:00.000Z' },
      isLoading: false,
    })

    render(<UnseenBadge />)

    const badge = screen.getByTestId('unseen-badge')
    await userEvent.click(badge)

    expect(mockNavigate).toHaveBeenCalledWith(
      { pathname: '/', search: '?unseen=1' },
    )
  })

  it('has correct aria-label for accessibility', () => {
    mockUseUnseenCount.mockReturnValue({
      data: { unseenCount: 7, lastSeenAt: '2026-02-15T10:00:00.000Z' },
      isLoading: false,
    })

    render(<UnseenBadge />)

    const badge = screen.getByTestId('unseen-badge')
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('7 new items'))
  })
})
