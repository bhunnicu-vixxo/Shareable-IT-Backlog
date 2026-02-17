import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { toaster } from '@/components/ui/toaster'

const { mockUsePendingUsers, mockUseApproveUser, mockUseRejectUser } = vi.hoisted(() => ({
  mockUsePendingUsers: vi.fn(),
  mockUseApproveUser: vi.fn(),
  mockUseRejectUser: vi.fn(),
}))

vi.mock('../hooks/use-pending-users', () => ({
  usePendingUsers: mockUsePendingUsers,
}))

vi.mock('../hooks/use-approve-user', () => ({
  useApproveUser: mockUseApproveUser,
}))

vi.mock('../hooks/use-reject-user', () => ({
  useRejectUser: mockUseRejectUser,
}))

import { UserApprovalList } from './user-approval-list'

let toasterCreateSpy: ReturnType<typeof vi.spyOn>

describe('UserApprovalList', () => {
  beforeEach(() => {
    toasterCreateSpy = vi.spyOn(toaster, 'create').mockImplementation(() => undefined)
    mockUseApproveUser.mockReturnValue({
      approveUser: vi.fn().mockResolvedValue(undefined),
      isApproving: false,
      error: null,
    })
    mockUseRejectUser.mockReturnValue({
      rejectUser: vi.fn().mockResolvedValue(undefined),
      isRejecting: false,
      error: null,
    })
  })

  afterEach(() => {
    toasterCreateSpy.mockRestore()
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

  it('should render approve and reject buttons for each user', () => {
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    expect(screen.getByRole('button', { name: /approve pending@vixxo.com/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject pending@vixxo.com/i })).toBeInTheDocument()
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

  it('should disable all buttons when any approval is in progress', () => {
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

    const approveButtons = screen.getAllByRole('button', { name: /approve/i })
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
    approveButtons.forEach((btn) => expect(btn).toBeDisabled())
    rejectButtons.forEach((btn) => expect(btn).toBeDisabled())
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

  it('should open confirmation dialog when reject is clicked', async () => {
    const user = userEvent.setup()
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    await user.click(screen.getByRole('button', { name: /reject pending@vixxo.com/i }))

    expect(screen.getByText('Reject User')).toBeInTheDocument()
    expect(screen.getByText(/pending@vixxo.com.*disabled list/)).toBeInTheDocument()
  })

  it('should call rejectUser when confirming rejection', async () => {
    const rejectMock = vi.fn().mockResolvedValue(undefined)
    mockUseRejectUser.mockReturnValue({
      rejectUser: rejectMock,
      isRejecting: false,
      error: null,
    })
    const user = userEvent.setup()
    mockUsePendingUsers.mockReturnValue({
      pendingUsers: [
        { id: 2, email: 'pending@vixxo.com', displayName: 'Pending', createdAt: '2026-02-10T10:00:00Z' },
      ],
      isLoading: false,
      error: null,
    })

    render(<UserApprovalList />)

    await user.click(screen.getByRole('button', { name: /reject pending@vixxo.com/i }))
    await user.click(screen.getByRole('button', { name: /^reject$/i }))

    expect(rejectMock).toHaveBeenCalledWith(2)
  })
})
