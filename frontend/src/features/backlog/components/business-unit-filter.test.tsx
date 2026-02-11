import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import { BusinessUnitFilter } from './business-unit-filter'
import type { BacklogItem } from '../types/backlog.types'

function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 'issue-1',
    identifier: 'VIX-1',
    title: 'Test Issue',
    description: null,
    priority: 2,
    priorityLabel: 'High',
    status: 'In Progress',
    statusType: 'started',
    assigneeName: null,
    projectName: 'Test Project',
    teamName: 'Vixxo',
    labels: [],
    createdAt: '2026-02-05T10:00:00.000Z',
    updatedAt: '2026-02-05T12:00:00.000Z',
    completedAt: null,
    dueDate: null,
    sortOrder: 1.0,
    prioritySortOrder: 1.0,
    url: 'https://linear.app/vixxo/issue/VIX-1',
    isNew: false,
    ...overrides,
  }
}

const mockItems: BacklogItem[] = [
  createMockItem({ id: '1', teamName: 'Operations' }),
  createMockItem({ id: '2', teamName: 'Finance' }),
  createMockItem({ id: '3', teamName: 'Operations' }), // duplicate
  createMockItem({ id: '4', teamName: 'Engineering' }),
]

describe('BusinessUnitFilter', () => {
  it('renders with placeholder text "All Business Units"', () => {
    render(
      <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
    )
    // The value-text span shows the placeholder when no value is selected
    const valueText = screen.getByText('All Business Units', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('has accessible label "Filter by business unit"', () => {
    render(
      <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
    )
    // Ensure the actual control is labelled (not just that text exists somewhere).
    expect(
      screen.getByRole('combobox', { name: /filter by business unit/i }),
    ).toBeInTheDocument()
  })

  it('handles empty items array gracefully', () => {
    render(
      <BusinessUnitFilter items={[]} value={null} onChange={vi.fn()} />,
    )
    const valueText = screen.getByText('All Business Units', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('displays selected value when value prop is set', () => {
    render(
      <BusinessUnitFilter
        items={mockItems}
        value="Operations"
        onChange={vi.fn()}
      />,
    )
    // The trigger value-text should display the selected value
    const valueText = screen.getByText('Operations', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('populates dropdown with unique sorted teamName values when opened', async () => {
    render(
      <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
    )

    // Click the trigger to open dropdown
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      // Verify unique team options are present as option roles
      expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Finance' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Operations' })).toBeInTheDocument()
    })

    // "All Business Units" option should also exist
    expect(screen.getByRole('option', { name: 'All Business Units' })).toBeInTheDocument()
  })

  it('calls onChange with selected business unit value', async () => {
    const onChange = vi.fn()
    render(
      <BusinessUnitFilter items={mockItems} value={null} onChange={onChange} />,
    )

    const trigger = screen.getByRole('combobox', { name: /filter by business unit/i })
    fireEvent.click(trigger)
    const option = await screen.findByRole('option', { name: 'Finance' })
    fireEvent.click(option)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('Finance')
    })
  })

  it('calls onChange with null when "All Business Units" is selected', async () => {
    const onChange = vi.fn()
    render(
      <BusinessUnitFilter
        items={mockItems}
        value="Operations"
        onChange={onChange}
      />,
    )

    const trigger = screen.getByRole('combobox', { name: /filter by business unit/i })
    fireEvent.click(trigger)
    const option = await screen.findByRole('option', { name: 'All Business Units' })
    fireEvent.click(option)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(null)
    })
  })

  it('renders a hidden select for form compatibility', () => {
    const { container } = render(
      <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
    )
    const hiddenSelect = container.querySelector('select')
    expect(hiddenSelect).toBeInTheDocument()
  })

  // =========================================================================
  // Story 8.5: Brand token styling, ARIA live region, resultCount, compact
  // =========================================================================

  describe('brand token active state (AC: #1, #2, #10)', () => {
    it('does NOT use hardcoded CSS variable in boxShadow when active', () => {
      const { container } = render(
        <BusinessUnitFilter
          items={mockItems}
          value="Operations"
          onChange={vi.fn()}
        />,
      )
      const trigger = container.querySelector('[data-part="trigger"]')
      expect(trigger).toBeInTheDocument()
      // Verify no var(--chakra-colors-*) in inline boxShadow style
      const style = trigger?.getAttribute('style') ?? ''
      expect(style).not.toContain('var(--chakra-colors-')
    })

    it('sets data-active attribute on trigger when value is non-null', () => {
      const { container } = render(
        <BusinessUnitFilter
          items={mockItems}
          value="Operations"
          onChange={vi.fn()}
        />,
      )
      const trigger = container.querySelector('[data-part="trigger"]')
      expect(trigger).toHaveAttribute('data-active')
    })

    it('does NOT set data-active attribute on trigger when value is null', () => {
      const { container } = render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const trigger = container.querySelector('[data-part="trigger"]')
      expect(trigger).not.toHaveAttribute('data-active')
    })
  })

  describe('ARIA live region (AC: #4, #5)', () => {
    it('has an ARIA live region with role="status" and aria-live="polite"', () => {
      render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('does NOT announce on initial mount (no false screen reader announcement)', () => {
      render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      // On initial render the live region should be empty — no "Filter cleared" announcement
      expect(liveRegion).toHaveTextContent('')
    })

    it('announces "Filtered to Finance" when value changes to "Finance"', () => {
      const { rerender } = render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      rerender(
        <BusinessUnitFilter items={mockItems} value="Finance" onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('Filtered to Finance')
    })

    it('announces "Filter cleared, showing all business units" when value changes to null', () => {
      const { rerender } = render(
        <BusinessUnitFilter items={mockItems} value="Finance" onChange={vi.fn()} />,
      )
      rerender(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('Filter cleared, showing all business units')
    })
  })

  describe('resultCount prop (AC: #6, #7)', () => {
    it('renders "Showing 5 items" when resultCount is 5', () => {
      render(
        <BusinessUnitFilter
          items={mockItems}
          value={null}
          onChange={vi.fn()}
          resultCount={5}
        />,
      )
      const countText = screen.getByTestId('business-unit-result-count')
      expect(countText).toHaveTextContent('Showing 5 items')
    })

    it('renders "Showing 1 item" (singular) when resultCount is 1', () => {
      render(
        <BusinessUnitFilter
          items={mockItems}
          value={null}
          onChange={vi.fn()}
          resultCount={1}
        />,
      )
      const countText = screen.getByTestId('business-unit-result-count')
      expect(countText).toHaveTextContent('Showing 1 item')
    })

    it('renders "Showing 0 items" when resultCount is 0', () => {
      render(
        <BusinessUnitFilter
          items={mockItems}
          value={null}
          onChange={vi.fn()}
          resultCount={0}
        />,
      )
      const countText = screen.getByTestId('business-unit-result-count')
      expect(countText).toHaveTextContent('Showing 0 items')
    })

    it('does NOT render result count text when resultCount is not provided', () => {
      render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      expect(screen.queryByTestId('business-unit-result-count')).not.toBeInTheDocument()
    })
  })

  describe('compact prop (AC: #8, #9)', () => {
    it('sets data-compact attribute when compact is true', () => {
      const { container } = render(
        <BusinessUnitFilter
          items={mockItems}
          value={null}
          onChange={vi.fn()}
          compact
        />,
      )
      const root = container.querySelector('[data-testid="business-unit-filter"]')
      expect(root).toHaveAttribute('data-compact')
    })

    it('does NOT set data-compact attribute when compact is false (default)', () => {
      const { container } = render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const root = container.querySelector('[data-testid="business-unit-filter"]')
      expect(root).not.toHaveAttribute('data-compact')
    })

    it('hides resultCount text in compact mode even when resultCount is provided', () => {
      render(
        <BusinessUnitFilter
          items={mockItems}
          value={null}
          onChange={vi.fn()}
          resultCount={5}
          compact
        />,
      )
      expect(screen.queryByTestId('business-unit-result-count')).not.toBeInTheDocument()
    })

    it('renders at standard size when compact is not provided (200px min-width trigger)', () => {
      const { container } = render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const trigger = container.querySelector('[data-part="trigger"]')
      expect(trigger).toBeInTheDocument()
      // Standard (non-compact) mode: trigger should have 200px min-width
      expect(trigger).toHaveStyle({ minWidth: '200px' })
    })
  })

  describe('Select.Item dropdown options (AC: #3)', () => {
    it('renders all dropdown items with data-testid for targeting', async () => {
      render(
        <BusinessUnitFilter items={mockItems} value={null} onChange={vi.fn()} />,
      )
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        const options = screen.getAllByTestId('business-unit-option')
        // 4 options: All Business Units + Engineering + Finance + Operations
        expect(options.length).toBe(4)
      })
    })

    it('applies _highlighted and _selected brand token styles to items (structural)', async () => {
      // Note: jsdom cannot trigger _highlighted pseudo-state to verify computed
      // styles at runtime. This test verifies the items render with the expected
      // Chakra data attributes that carry the brand token styles.
      render(
        <BusinessUnitFilter items={mockItems} value="Finance" onChange={vi.fn()} />,
      )
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        const options = screen.getAllByTestId('business-unit-option')
        // Each Select.Item has data-part="item" from Chakra — confirms the
        // component is correctly using Select.Item (which receives _highlighted
        // and _selected props)
        options.forEach((option) => {
          expect(option.getAttribute('data-part')).toBe('item')
        })
      })
    })
  })
})
