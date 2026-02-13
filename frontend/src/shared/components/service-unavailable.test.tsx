import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { ServiceUnavailable } from './service-unavailable'

describe('ServiceUnavailable', () => {
  const defaultProps = {
    onRetry: vi.fn(),
  }

  it('renders the service unavailable page with default message', () => {
    render(<ServiceUnavailable {...defaultProps} />)

    expect(screen.getByTestId('service-unavailable')).toBeInTheDocument()
    expect(screen.getByTestId('service-unavailable-title')).toHaveTextContent(
      'Service Temporarily Unavailable',
    )
    expect(screen.getByTestId('service-unavailable-message')).toHaveTextContent(
      'The service is temporarily unavailable',
    )
  })

  it('renders with custom message', () => {
    render(
      <ServiceUnavailable {...defaultProps} message="Custom error message" />,
    )

    expect(screen.getByTestId('service-unavailable-message')).toHaveTextContent(
      'Custom error message',
    )
  })

  it('calls onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<ServiceUnavailable onRetry={onRetry} />)

    fireEvent.click(screen.getByTestId('service-unavailable-retry'))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has an accessible alert role', () => {
    render(<ServiceUnavailable {...defaultProps} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders the Retry button', () => {
    render(<ServiceUnavailable {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
