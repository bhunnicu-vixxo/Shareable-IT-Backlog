import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import {
  EmptyStateWithGuidance,
  type EmptyStateWithGuidanceProps,
} from './empty-state-with-guidance'

function renderComponent(overrides: Partial<EmptyStateWithGuidanceProps> = {}) {
  const defaultProps: EmptyStateWithGuidanceProps = {
    keyword: '',
    businessUnit: null,
    showNewOnly: false,
    onClearKeyword: vi.fn(),
    onClearBusinessUnit: vi.fn(),
    onClearNewOnly: vi.fn(),
    onClearAll: vi.fn(),
    ...overrides,
  }
  return { ...render(<EmptyStateWithGuidance {...defaultProps} />), props: defaultProps }
}

describe('EmptyStateWithGuidance', () => {
  // ─── Icon Tests ───

  it('renders search icon when keyword is active', () => {
    renderComponent({ keyword: 'test' })
    expect(screen.getByTestId('empty-state-icon-search')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state-icon-filter')).not.toBeInTheDocument()
  })

  it('renders filter icon when keyword is not active', () => {
    renderComponent({ businessUnit: 'Finance' })
    expect(screen.getByTestId('empty-state-icon-filter')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state-icon-search')).not.toBeInTheDocument()
  })

  // ─── Heading Tests ───

  it('shows correct heading when keyword is active', () => {
    renderComponent({ keyword: 'vpn config' })
    expect(screen.getByText('No items found matching "vpn config"')).toBeInTheDocument()
  })

  it('shows correct heading for keyword with extra whitespace', () => {
    renderComponent({ keyword: '  vpn  ' })
    expect(screen.getByText('No items found matching "vpn"')).toBeInTheDocument()
  })

  it('shows correct heading when only business unit is active', () => {
    renderComponent({ businessUnit: 'Operations' })
    expect(screen.getByText('No items found for Operations')).toBeInTheDocument()
  })

  it('shows correct heading when only new-only is active', () => {
    renderComponent({ showNewOnly: true })
    expect(screen.getByText('No new items')).toBeInTheDocument()
  })

  it('shows correct heading when BU + new-only are active', () => {
    renderComponent({ businessUnit: 'Finance', showNewOnly: true })
    expect(screen.getByText('No new items for Finance')).toBeInTheDocument()
  })

  it('shows correct heading when keyword + BU are active (keyword takes priority)', () => {
    renderComponent({ keyword: 'server', businessUnit: 'Finance' })
    expect(screen.getByText('No items found matching "server"')).toBeInTheDocument()
  })

  it('shows correct heading when keyword + new-only are active (keyword takes priority)', () => {
    renderComponent({ keyword: 'patch', showNewOnly: true })
    expect(screen.getByText('No items found matching "patch"')).toBeInTheDocument()
  })

  it('shows correct heading when all filters are active (keyword takes priority)', () => {
    renderComponent({ keyword: 'update', businessUnit: 'Finance', showNewOnly: true })
    expect(screen.getByText('No items found matching "update"')).toBeInTheDocument()
  })

  // ─── Description Tests ───

  it('shows keyword description when keyword is active', () => {
    renderComponent({ keyword: 'test' })
    expect(
      screen.getByText(
        'Try different keywords, adjust your filters, or check that items are assigned to the expected business unit.',
      ),
    ).toBeInTheDocument()
  })

  it('shows BU description when only business unit is active', () => {
    renderComponent({ businessUnit: 'Finance' })
    expect(
      screen.getByText(
        'Try selecting a different business unit, clear the filter, or check business unit assignment.',
      ),
    ).toBeInTheDocument()
  })

  it('shows new-only description when only new-only is active', () => {
    renderComponent({ showNewOnly: true })
    expect(
      screen.getByText('All items have been reviewed. Remove the filter to see all items.'),
    ).toBeInTheDocument()
  })

  it('shows BU + new-only description when both are active', () => {
    renderComponent({ businessUnit: 'Operations', showNewOnly: true })
    expect(
      screen.getByText(
        'Try selecting a different business unit, remove the "New only" filter to see all items, or check business unit assignment.',
      ),
    ).toBeInTheDocument()
  })

  // ─── Button Tests ───

  it('"Clear all filters" button is always visible', () => {
    renderComponent({ showNewOnly: true })
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
  })

  it('"Clear all filters" calls onClearAll', async () => {
    const user = userEvent.setup()
    const { props } = renderComponent({ showNewOnly: true })
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(props.onClearAll).toHaveBeenCalledTimes(1)
  })

  it('shows "Clear search filter" button only when keyword is active', () => {
    renderComponent({ keyword: 'test' })
    expect(screen.getByRole('button', { name: 'Clear search filter' })).toBeInTheDocument()
  })

  it('does not show "Clear search filter" when keyword is empty', () => {
    renderComponent({ businessUnit: 'Finance' })
    expect(screen.queryByRole('button', { name: 'Clear search filter' })).not.toBeInTheDocument()
  })

  it('"Clear search filter" calls onClearKeyword', async () => {
    const user = userEvent.setup()
    const { props } = renderComponent({ keyword: 'test' })
    await user.click(screen.getByRole('button', { name: 'Clear search filter' }))
    expect(props.onClearKeyword).toHaveBeenCalledTimes(1)
  })

  it('shows "Clear business unit filter" button only when BU is active', () => {
    renderComponent({ businessUnit: 'Finance' })
    expect(screen.getByRole('button', { name: 'Clear business unit filter' })).toBeInTheDocument()
  })

  it('does not show "Clear business unit filter" when BU is null', () => {
    renderComponent({ showNewOnly: true })
    expect(
      screen.queryByRole('button', { name: 'Clear business unit filter' }),
    ).not.toBeInTheDocument()
  })

  it('"Clear business unit filter" calls onClearBusinessUnit', async () => {
    const user = userEvent.setup()
    const { props } = renderComponent({ businessUnit: 'Finance' })
    await user.click(screen.getByRole('button', { name: 'Clear business unit filter' }))
    expect(props.onClearBusinessUnit).toHaveBeenCalledTimes(1)
  })

  it('shows "Turn off New only" button only when showNewOnly is active', () => {
    renderComponent({ showNewOnly: true })
    expect(screen.getByRole('button', { name: 'Turn off New only' })).toBeInTheDocument()
  })

  it('does not show "Turn off New only" when showNewOnly is false', () => {
    renderComponent({ keyword: 'test' })
    expect(screen.queryByRole('button', { name: 'Turn off New only' })).not.toBeInTheDocument()
  })

  it('"Turn off New only" calls onClearNewOnly', async () => {
    const user = userEvent.setup()
    const { props } = renderComponent({ showNewOnly: true })
    await user.click(screen.getByRole('button', { name: 'Turn off New only' }))
    expect(props.onClearNewOnly).toHaveBeenCalledTimes(1)
  })

  it('shows all individual clear buttons when all filters are active', () => {
    renderComponent({ keyword: 'test', businessUnit: 'Finance', showNewOnly: true })
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear business unit filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn off New only' })).toBeInTheDocument()
  })

  // ─── Accessibility Tests ───

  it('has role="status" on the component root', () => {
    renderComponent({ showNewOnly: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has a meaningful heading accessible to screen readers', () => {
    renderComponent({ keyword: 'search term' })
    expect(screen.getByText('No items found matching "search term"')).toBeInTheDocument()
  })

  it('all action buttons are keyboard-focusable', () => {
    renderComponent({ keyword: 'test', businessUnit: 'Finance', showNewOnly: true })
    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled()
    })
  })

  // ─── Brand Token Compliance Tests ───

  it('title uses brand.gray token (no gray.800 or CSS variable anti-patterns)', () => {
    renderComponent({ keyword: 'test' })
    const title = screen.getByText('No items found matching "test"')
    // Chakra v3 applies color tokens via CSS classes, not inline styles.
    // Verify the rendered element's outerHTML doesn't contain anti-patterns:
    // no CSS variable references (old icon pattern) and no old generic gray token names.
    expect(title.outerHTML).not.toContain('var(--chakra-colors-')
    expect(title.outerHTML).not.toContain('gray-800')
    expect(title.outerHTML).not.toContain('gray.800')
  })

  it('description uses brand.grayLight token (no gray.600 or CSS variable anti-patterns)', () => {
    renderComponent({ keyword: 'test' })
    const description = screen.getByText(
      'Try different keywords, adjust your filters, or check that items are assigned to the expected business unit.',
    )
    // Chakra v3 applies color tokens via CSS classes, not inline styles.
    // Verify the rendered element's outerHTML doesn't contain anti-patterns.
    expect(description.outerHTML).not.toContain('var(--chakra-colors-')
    expect(description.outerHTML).not.toContain('gray-600')
    expect(description.outerHTML).not.toContain('gray.600')
  })

  it('icon color inherits from Indicator wrapper (no CSS variable on icon SVG)', () => {
    renderComponent({ keyword: 'test' })
    const icon = screen.getByTestId('empty-state-icon-search')
    const iconColor = icon.getAttribute('color')
    // Icon should NOT have a color attribute — it inherits via currentColor from the Indicator wrapper
    expect(iconColor).toBeNull()
  })

  it('filter icon color inherits from Indicator wrapper (no CSS variable on icon SVG)', () => {
    renderComponent({ businessUnit: 'Finance' })
    const icon = screen.getByTestId('empty-state-icon-filter')
    const iconColor = icon.getAttribute('color')
    // Icon should NOT have a color attribute — it inherits via currentColor from the Indicator wrapper
    expect(iconColor).toBeNull()
  })

  it('buttons do NOT have inline _focusVisible style overrides', () => {
    renderComponent({ keyword: 'test', businessUnit: 'Finance', showNewOnly: true })
    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      // Check the full outerHTML (not just the style attribute) for focus-related
      // anti-patterns. Inline _focusVisible overrides would inject CSS variable
      // references or outline properties into the rendered element.
      const html = button.outerHTML
      expect(html).not.toContain('outlineColor')
      expect(html).not.toContain('outline-color')
      expect(html).not.toContain('var(--chakra-colors-')
    })
  })

  // ─── ARIA Live Region Tests ───

  it('root has aria-live="polite" and aria-atomic="true"', () => {
    renderComponent({ showNewOnly: true })
    const root = screen.getByRole('status')
    expect(root).toHaveAttribute('aria-live', 'polite')
    expect(root).toHaveAttribute('aria-atomic', 'true')
  })

  // ─── Data Testid Tests ───

  it('root has data-testid="empty-state-with-guidance"', () => {
    renderComponent({ showNewOnly: true })
    expect(screen.getByTestId('empty-state-with-guidance')).toBeInTheDocument()
  })

  // ─── Compact Variant Tests ───

  it('compact mode adds data-compact attribute', () => {
    renderComponent({ showNewOnly: true, compact: true })
    const root = screen.getByTestId('empty-state-with-guidance')
    expect(root).toHaveAttribute('data-compact')
  })

  it('compact mode hides indicator/icon', () => {
    renderComponent({ keyword: 'test', compact: true })
    expect(screen.queryByTestId('empty-state-icon-search')).not.toBeInTheDocument()
    expect(screen.queryByTestId('empty-state-icon-filter')).not.toBeInTheDocument()
  })

  it('compact mode hides indicator/icon (filter variant)', () => {
    renderComponent({ businessUnit: 'Finance', compact: true })
    expect(screen.queryByTestId('empty-state-icon-filter')).not.toBeInTheDocument()
    expect(screen.queryByTestId('empty-state-icon-search')).not.toBeInTheDocument()
  })

  it('compact mode hides individual clear buttons (only "Clear all filters" shown)', () => {
    renderComponent({
      keyword: 'test',
      businessUnit: 'Finance',
      showNewOnly: true,
      compact: true,
    })
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear search filter' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Clear business unit filter' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn off New only' })).not.toBeInTheDocument()
  })

  it('non-compact mode (default) renders at standard size with all buttons', () => {
    renderComponent({ keyword: 'test', businessUnit: 'Finance', showNewOnly: true })
    expect(screen.getByTestId('empty-state-icon-search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear business unit filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn off New only' })).toBeInTheDocument()
  })

  it('compact prop is optional — backward compatible when omitted', () => {
    renderComponent({ showNewOnly: true })
    const root = screen.getByTestId('empty-state-with-guidance')
    expect(root).not.toHaveAttribute('data-compact')
    expect(screen.getByRole('button', { name: 'Turn off New only' })).toBeInTheDocument()
  })

  it('non-compact mode does not have data-compact attribute', () => {
    renderComponent({ showNewOnly: true, compact: false })
    const root = screen.getByTestId('empty-state-with-guidance')
    expect(root).not.toHaveAttribute('data-compact')
  })

  it('compact mode applies reduced font sizes to title and description', () => {
    const { unmount } = renderComponent({ showNewOnly: true, compact: true })
    const compactTitle = screen.getByText('No new items')
    const compactTitleClass = compactTitle.className
    const compactDesc = screen.getByText(
      'All items have been reviewed. Remove the filter to see all items.',
    )
    const compactDescClass = compactDesc.className
    unmount()

    renderComponent({ showNewOnly: true })
    const normalTitle = screen.getByText('No new items')
    const normalTitleClass = normalTitle.className
    const normalDesc = screen.getByText(
      'All items have been reviewed. Remove the filter to see all items.',
    )
    const normalDescClass = normalDesc.className

    // Compact mode (fontSize="sm"/"xs") produces different CSS classes than default
    expect(compactTitleClass).not.toBe(normalTitleClass)
    expect(compactDescClass).not.toBe(normalDescClass)
  })

  it('compact mode applies reduced padding to root element', () => {
    const { unmount } = renderComponent({ showNewOnly: true, compact: true })
    const compactRoot = screen.getByTestId('empty-state-with-guidance')
    const compactRootClass = compactRoot.className
    unmount()

    renderComponent({ showNewOnly: true })
    const normalRoot = screen.getByTestId('empty-state-with-guidance')
    const normalRootClass = normalRoot.className

    // Compact mode (px="4"/py="6") produces different CSS classes than default (px="6"/py="10")
    expect(compactRootClass).not.toBe(normalRootClass)
  })
})
