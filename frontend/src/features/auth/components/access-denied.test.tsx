import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { AccessDenied } from './access-denied'

describe('AccessDenied', () => {
  const defaultProps = {
    onRetry: vi.fn(),
  }

  it('renders the "Access Denied" heading', () => {
    render(<AccessDenied {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: /access denied/i }),
    ).toBeInTheDocument()
  })

  it('renders the Vixxo network requirement message', () => {
    render(<AccessDenied {...defaultProps} />)

    expect(
      screen.getByText(/vixxo network required/i),
    ).toBeInTheDocument()
  })

  it('renders VPN connection guidance text', () => {
    render(<AccessDenied {...defaultProps} />)

    expect(
      screen.getByText(/connect to the vixxo vpn/i),
    ).toBeInTheDocument()
  })

  it('renders a Retry button', () => {
    render(<AccessDenied {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: /retry/i }),
    ).toBeInTheDocument()
  })

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<AccessDenied onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has proper heading level (h1)', () => {
    render(<AccessDenied {...defaultProps} />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/access denied/i)
  })

  it('renders an alert region for accessibility', () => {
    render(<AccessDenied {...defaultProps} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
