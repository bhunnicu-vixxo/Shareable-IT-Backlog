import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ConfirmationDialog } from './confirmation-dialog'

describe('ConfirmationDialog', () => {
  const defaultProps = {
    title: 'Confirm Action',
    body: 'Are you sure you want to proceed?',
    confirmLabel: 'Confirm',
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders title and body when open', () => {
    render(<ConfirmationDialog {...defaultProps} />)

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
  })

  it('renders confirm and cancel buttons', () => {
    render(<ConfirmationDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows loading state on confirm button when isLoading is true', () => {
    render(<ConfirmationDialog {...defaultProps} isLoading={true} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it('does not render content when isOpen is false', () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('uses custom confirmColorPalette', () => {
    render(<ConfirmationDialog {...defaultProps} confirmColorPalette="red" />)

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
  })
})
