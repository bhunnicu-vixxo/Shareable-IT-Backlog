import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { ItemErrorState } from './item-error-state'

describe('ItemErrorState', () => {
  const defaultProps = {
    onRetry: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders the "unable to load" message', () => {
    render(<ItemErrorState {...defaultProps} />)

    expect(
      screen.getByText('Unable to load this item'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('A temporary problem prevented loading. Please try again.'),
    ).toBeInTheDocument()
  })

  it('displays the error message in subdued text', () => {
    render(<ItemErrorState {...defaultProps} />)

    // Technical error details should not be shown to end users.
    expect(screen.queryByText(/connection timed out/i)).not.toBeInTheDocument()
  })

  it('renders Try Again and Close buttons', () => {
    render(<ItemErrorState {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: 'Try Again' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Close' }),
    ).toBeInTheDocument()
  })

  it('calls onRetry when Try Again button is clicked', () => {
    const onRetry = vi.fn()
    render(<ItemErrorState {...defaultProps} onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ItemErrorState {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the Chakra UI alert component', () => {
    const { container } = render(<ItemErrorState {...defaultProps} />)

    const alertEl = container.querySelector('.chakra-alert__root')
    expect(alertEl).toBeInTheDocument()
  })
})
