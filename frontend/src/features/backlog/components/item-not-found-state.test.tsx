import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { ItemNotFoundState } from './item-not-found-state'

describe('ItemNotFoundState', () => {
  it('renders the "no longer available" message', () => {
    render(<ItemNotFoundState onClose={vi.fn()} />)

    expect(
      screen.getByText('This item is no longer available'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'It may have been removed from the backlog or deleted in Linear.',
      ),
    ).toBeInTheDocument()
  })

  it('renders a Close button', () => {
    render(<ItemNotFoundState onClose={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /close/i }),
    ).toBeInTheDocument()
  })

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ItemNotFoundState onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the Chakra UI alert component', () => {
    const { container } = render(<ItemNotFoundState onClose={vi.fn()} />)

    const alertEl = container.querySelector('.chakra-alert__root')
    expect(alertEl).toBeInTheDocument()
  })
})
