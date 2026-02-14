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
    selectedLabels: [],
    showNewOnly: false,
    onClearKeyword: vi.fn(),
    onClearLabels: vi.fn(),
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
    renderComponent({ selectedLabels: ['Siebel'] })
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

  it('shows correct heading when only labels are active (single)', () => {
    renderComponent({ selectedLabels: ['Siebel'] })
    expect(screen.getByText('No items found for Siebel')).toBeInTheDocument()
  })

  it('shows correct heading when only labels are active (multiple)', () => {
    renderComponent({ selectedLabels: ['Siebel', 'Gateway'] })
    expect(screen.getByText('No items found for Siebel, Gateway')).toBeInTheDocument()
  })

  it('shows correct heading when only new-only is active', () => {
    renderComponent({ showNewOnly: true })
    expect(screen.getByText('No new items')).toBeInTheDocument()
  })

  it('shows correct heading when labels + new-only are active', () => {
    renderComponent({ selectedLabels: ['Siebel'], showNewOnly: true })
    expect(screen.getByText('No new items for Siebel')).toBeInTheDocument()
  })

  it('shows correct heading when keyword + labels are active (keyword takes priority)', () => {
    renderComponent({ keyword: 'server', selectedLabels: ['Siebel'] })
    expect(screen.getByText('No items found matching "server"')).toBeInTheDocument()
  })

  it('shows correct heading when keyword + new-only are active (keyword takes priority)', () => {
    renderComponent({ keyword: 'patch', showNewOnly: true })
    expect(screen.getByText('No items found matching "patch"')).toBeInTheDocument()
  })

  it('shows correct heading when all filters are active (keyword takes priority)', () => {
    renderComponent({ keyword: 'update', selectedLabels: ['Siebel'], showNewOnly: true })
    expect(screen.getByText('No items found matching "update"')).toBeInTheDocument()
  })

  // ─── Description Tests ───

  it('shows keyword description when keyword is active', () => {
    renderComponent({ keyword: 'test' })
    expect(
      screen.getByText(
        'Try different keywords, adjust your filters, or check that items have the expected labels.',
      ),
    ).toBeInTheDocument()
  })

  it('shows label description when only labels are active', () => {
    renderComponent({ selectedLabels: ['Siebel'] })
    expect(
      screen.getByText(
        'Try selecting different labels, clear the filter, or check label assignment.',
      ),
    ).toBeInTheDocument()
  })

  it('shows new-only description when only new-only is active', () => {
    renderComponent({ showNewOnly: true })
    expect(
      screen.getByText('All items have been reviewed. Remove the filter to see all items.'),
    ).toBeInTheDocument()
  })

  it('shows labels + new-only description when both are active', () => {
    renderComponent({ selectedLabels: ['Siebel'], showNewOnly: true })
    expect(
      screen.getByText(
        'Try selecting different labels, remove the "New only" filter to see all items, or check label assignment.',
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
    renderComponent({ selectedLabels: ['Siebel'] })
    expect(screen.queryByRole('button', { name: 'Clear search filter' })).not.toBeInTheDocument()
  })

  it('"Clear search filter" calls onClearKeyword', async () => {
    const user = userEvent.setup()
    const { props } = renderComponent({ keyword: 'test' })
    await user.click(screen.getByRole('button', { name: 'Clear search filter' }))
    expect(props.onClearKeyword).toHaveBeenCalledTimes(1)
  })

  it('shows "Clear label filter" button only when labels are active', () => {
    renderComponent({ selectedLabels: ['Siebel'] })
    expect(screen.getByRole('button', { name: 'Clear label filter' })).toBeInTheDocument()
  })

  it('does not show "Clear label filter" when no labels selected', () => {
    renderComponent({ showNewOnly: true })
    expect(
      screen.queryByRole('button', { name: 'Clear label filter' }),
    ).not.toBeInTheDocument()
  })

  it('"Clear label filter" calls onClearLabels', async () => {
    const user = userEvent.setup()
    const { props } = renderComponent({ selectedLabels: ['Siebel'] })
    await user.click(screen.getByRole('button', { name: 'Clear label filter' }))
    expect(props.onClearLabels).toHaveBeenCalledTimes(1)
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
    renderComponent({ keyword: 'test', selectedLabels: ['Siebel'], showNewOnly: true })
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear label filter' })).toBeInTheDocument()
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
    renderComponent({ keyword: 'test', selectedLabels: ['Siebel'], showNewOnly: true })
    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled()
    })
  })

  // ─── Brand Token Compliance Tests ───

  it('title uses brand.gray token (no gray.800 or CSS variable anti-patterns)', () => {
    renderComponent({ keyword: 'test' })
    const title = screen.getByText('No items found matching "test"')
    expect(title.outerHTML).not.toContain('var(--chakra-colors-')
    expect(title.outerHTML).not.toContain('gray-800')
    expect(title.outerHTML).not.toContain('gray.800')
  })

  it('description uses brand.grayLight token (no gray.600 or CSS variable anti-patterns)', () => {
    renderComponent({ keyword: 'test' })
    const description = screen.getByText(
      'Try different keywords, adjust your filters, or check that items have the expected labels.',
    )
    expect(description.outerHTML).not.toContain('var(--chakra-colors-')
    expect(description.outerHTML).not.toContain('gray-600')
    expect(description.outerHTML).not.toContain('gray.600')
  })

  it('icon color inherits from Indicator wrapper (no CSS variable on icon SVG)', () => {
    renderComponent({ keyword: 'test' })
    const icon = screen.getByTestId('empty-state-icon-search')
    const iconColor = icon.getAttribute('color')
    expect(iconColor).toBeNull()
  })

  it('filter icon color inherits from Indicator wrapper (no CSS variable on icon SVG)', () => {
    renderComponent({ selectedLabels: ['Siebel'] })
    const icon = screen.getByTestId('empty-state-icon-filter')
    const iconColor = icon.getAttribute('color')
    expect(iconColor).toBeNull()
  })

  it('buttons do NOT have inline _focusVisible style overrides', () => {
    renderComponent({ keyword: 'test', selectedLabels: ['Siebel'], showNewOnly: true })
    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
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
    renderComponent({ selectedLabels: ['Siebel'], compact: true })
    expect(screen.queryByTestId('empty-state-icon-filter')).not.toBeInTheDocument()
    expect(screen.queryByTestId('empty-state-icon-search')).not.toBeInTheDocument()
  })

  it('compact mode hides individual clear buttons (only "Clear all filters" shown)', () => {
    renderComponent({
      keyword: 'test',
      selectedLabels: ['Siebel'],
      showNewOnly: true,
      compact: true,
    })
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear search filter' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Clear label filter' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn off New only' })).not.toBeInTheDocument()
  })

  it('non-compact mode (default) renders at standard size with all buttons', () => {
    renderComponent({ keyword: 'test', selectedLabels: ['Siebel'], showNewOnly: true })
    expect(screen.getByTestId('empty-state-icon-search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search filter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear label filter' })).toBeInTheDocument()
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

    expect(compactRootClass).not.toBe(normalRootClass)
  })
})
