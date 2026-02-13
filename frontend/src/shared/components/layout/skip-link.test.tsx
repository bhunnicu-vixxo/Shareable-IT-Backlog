import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { SkipLink } from './skip-link'

describe('SkipLink', () => {
  it('renders a skip link with correct text', () => {
    render(<SkipLink />)
    const link = screen.getByTestId('skip-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveTextContent('Skip to main content')
  })

  it('links to #main-content', () => {
    render(<SkipLink />)
    const link = screen.getByTestId('skip-link')
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('is positioned off-screen by default', () => {
    render(<SkipLink />)
    const link = screen.getByTestId('skip-link')
    // The skip link uses position: fixed and top: -100px to be off-screen
    expect(link).toHaveStyle({ position: 'fixed', top: '-100px' })
  })

  it('is rendered as an anchor element', () => {
    render(<SkipLink />)
    const link = screen.getByTestId('skip-link')
    expect(link.tagName).toBe('A')
  })

  it('moves focus to the main content target when activated', () => {
    render(
      <>
        <SkipLink />
        <div id="main-content" tabIndex={-1}>
          Main content
        </div>
      </>,
    )

    const link = screen.getByTestId('skip-link')
    const main = screen.getByText('Main content')

    link.focus()
    expect(link).toHaveFocus()

    fireEvent.click(link)
    expect(main).toHaveFocus()
  })
})
