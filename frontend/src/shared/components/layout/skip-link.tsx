import './skip-link.css'

/**
 * Skip navigation link for keyboard users.
 *
 * Visually hidden by default, becomes visible when focused via Tab key.
 * Allows keyboard users to skip past the header and filter bar directly
 * to the main content area.
 */
export function SkipLink() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.getElementById('main-content')
    if (!target) return

    // Update the URL hash for expected skip-link semantics and scrolling.
    // Then programmatically move focus to the main region so keyboard users
    // truly "skip" past header/filter controls in SPAs.
    if (window.location.hash !== '#main-content') {
      window.location.hash = 'main-content'
    }

    try {
      target.scrollIntoView({ block: 'start' })
    } catch {
      // scrollIntoView is not implemented in some environments (e.g. jsdom)
    }
    try {
      ;(target as HTMLElement).focus({ preventScroll: true })
    } catch {
      ;(target as HTMLElement).focus()
    }
  }

  return (
    <a
      href="#main-content"
      className="skip-link"
      data-testid="skip-link"
      onClick={handleClick}
    >
      Skip to main content
    </a>
  )
}
