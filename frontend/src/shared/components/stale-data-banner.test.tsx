import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { StaleDataBanner } from './stale-data-banner'

describe('StaleDataBanner', () => {
  const defaultProps = {
    isStale: true,
    reason: 'Linear API unavailable',
    lastSyncedAt: '2026-02-13T10:00:00Z',
    onRetry: vi.fn(),
  }

  it('renders warning banner when isStale is true', () => {
    render(<StaleDataBanner {...defaultProps} />)

    expect(screen.getByTestId('stale-data-banner')).toBeInTheDocument()
    expect(screen.getByTestId('stale-banner-title')).toHaveTextContent('Showing cached data')
    expect(screen.getByTestId('stale-banner-description')).toHaveTextContent(
      'Linear API unavailable',
    )
  })

  it('does not render when isStale is false', () => {
    render(<StaleDataBanner {...defaultProps} isStale={false} />)

    expect(screen.queryByTestId('stale-data-banner')).not.toBeInTheDocument()
  })

  it('calls onRetry when Refresh button is clicked', () => {
    const onRetry = vi.fn()
    render(<StaleDataBanner {...defaultProps} onRetry={onRetry} />)

    fireEvent.click(screen.getByTestId('stale-banner-retry'))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('displays formatted relative time for lastSyncedAt', () => {
    render(<StaleDataBanner {...defaultProps} />)

    const description = screen.getByTestId('stale-banner-description')
    // Should contain "Last synced:" followed by some relative time
    expect(description).toHaveTextContent(/Last synced:/)
  })

  it('displays "unknown" when lastSyncedAt is null', () => {
    render(<StaleDataBanner {...defaultProps} lastSyncedAt={null} />)

    const description = screen.getByTestId('stale-banner-description')
    expect(description).toHaveTextContent('Last synced: unknown')
  })

  it('has an accessible alert role', () => {
    render(<StaleDataBanner {...defaultProps} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('displays the reason in the description', () => {
    render(
      <StaleDataBanner {...defaultProps} reason="Database connection failed" />,
    )

    expect(screen.getByTestId('stale-banner-description')).toHaveTextContent(
      'Database connection failed',
    )
  })
})
