import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { PendingApproval } from './pending-approval'

describe('PendingApproval', () => {
  const defaultProps = {
    onCheckStatus: vi.fn(),
  }

  it('should render "Access Pending Approval" heading', () => {
    render(<PendingApproval {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /access pending approval/i })).toBeInTheDocument()
  })

  it('should render explanation text', () => {
    render(<PendingApproval {...defaultProps} />)

    expect(screen.getByText(/submitted for admin review/i)).toBeInTheDocument()
  })

  it('should render Check Status button', () => {
    render(<PendingApproval {...defaultProps} />)

    expect(screen.getByRole('button', { name: /check.*status/i })).toBeInTheDocument()
  })

  it('should call onCheckStatus when Check Status button is clicked', () => {
    render(<PendingApproval {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /check.*status/i }))

    expect(defaultProps.onCheckStatus).toHaveBeenCalled()
  })

  it('should display email when provided', () => {
    render(<PendingApproval {...defaultProps} email="user@vixxo.com" />)

    expect(screen.getByText('user@vixxo.com')).toBeInTheDocument()
  })

  it('should have proper heading level', () => {
    render(<PendingApproval {...defaultProps} />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/access pending approval/i)
  })
})
