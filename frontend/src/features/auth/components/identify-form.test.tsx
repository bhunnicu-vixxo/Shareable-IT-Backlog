import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils'
import { IdentifyForm } from './identify-form'

describe('IdentifyForm', () => {
  const defaultProps = {
    onIdentify: vi.fn().mockResolvedValue(undefined),
    isIdentifying: false,
    error: null,
  }

  it('should render email input and Continue button', () => {
    render(<IdentifyForm {...defaultProps} />)

    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('should show validation error for empty email', async () => {
    render(<IdentifyForm {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email address is required')
    })
    expect(defaultProps.onIdentify).not.toHaveBeenCalled()
  })

  it('should show validation error for invalid email', async () => {
    render(<IdentifyForm {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('valid email')
    })
  })

  it('should call onIdentify with valid email', async () => {
    render(<IdentifyForm {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@vixxo.com' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(defaultProps.onIdentify).toHaveBeenCalledWith('user@vixxo.com')
    })
  })

  it('should disable button while identifying', () => {
    render(<IdentifyForm {...defaultProps} isIdentifying={true} />)

    expect(screen.getByRole('button', { name: /identifying/i })).toBeDisabled()
  })

  it('should display API error', () => {
    render(<IdentifyForm {...defaultProps} error="Network error" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
  })

  // --- Screen Reader Support (Story 11.2) ---

  it('renders heading as h1', () => {
    render(<IdentifyForm {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /shareable it backlog/i, level: 1 })).toBeInTheDocument()
  })

  it('email input has associated label via htmlFor', () => {
    render(<IdentifyForm {...defaultProps} />)
    const input = screen.getByLabelText('Email address')
    expect(input).toHaveAttribute('id', 'identify-email-input')
  })
})
