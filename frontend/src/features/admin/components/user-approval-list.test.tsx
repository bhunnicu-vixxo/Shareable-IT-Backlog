import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'

const { mockUsePendingUsers, mockUseApproveUser } = vi.hoisted(() => ({
  mockUsePendingUsers: vi.fn(),
  mockUseApproveUser: vi.fn(),
}))

vi.mock('../hooks/use-pending-users', () => ({
  usePendingUsers: mockUsePendingUsers,
}))

vi.mock('../hooks/use-approve-user', () => ({
  useApproveUser: mockUseApproveUser,
}))

import { UserApprovalList } from './user-approval-list'

describe('UserApprovalList', () => {
  beforeEach(() => {
    mockUseApproveUser.mockReturnValue({
      approveUser: vi.fn().mockResolvedValue(undefined),
      isApproving: false,
      error: null,
    })
  })

  it('should render list of pending users', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
        { id: 3, email: 'another@vixxo.com', displayName: null, createdAt: '2026-02-10T11:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    expect(screen.getByText('pending@vixxo.com')).toBeInTheDocument()
    expect(screen.getByText('another@vixxo.com')).toBeInTheDocument()
  })

  it('should show empty state when no pending users', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    expect(screen.getByText(/no pending approval requests/i)).toBeInTheDocument()
  })

  it('should render approve button for each user', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    expect(screen.getByRole('button', { name: /approve pending@vixxo.com/i })).toBeInTheDocument()
  })

  it('should show skeleton when loading', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [],
      isLoading: true,
      error: null,
    })

    render(<UserApprovalList />)

    expect(screen.getByTestId('user-approval-skeleton')).toBeInTheDocument()
    expect(screen.queryByText(/loading pending users/i)).not.toBeInTheDocument()
  })

  it('should disable all approve buttons when any approval is in progress', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
        { id: 3, email: 'another@vixxo.com', displayName: null, createdAt: '2026-02-10T11:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })
    mockUseApproveUser.mockReturnValue({
      approveUser: vi.fn().mockResolvedValue(undefined),
      isApproving: true,
      error: null,
    })

    render(<UserApprovalList />)

    // Both buttons should be disabled when any approval is in progress
    const approveButtons = screen.getAllByRole('button', { name: /approve/i })
    expect(approveButtons).toHaveLength(2)
    approveButtons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it('should show pending count badge', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    expect(screen.getByText('1 pending')).toBeInTheDocument()
  })
})
