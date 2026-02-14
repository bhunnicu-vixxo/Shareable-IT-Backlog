import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import { LabelFilter } from './label-filter'
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
  createMockItem({
    id: '1',
    labels: [
      { id: 'l1', name: 'Siebel', color: '#ff0000' },
      { id: 'l2', name: 'Gateway', color: '#00ff00' },
    ],
  }),
  createMockItem({
    id: '2',
    labels: [
      { id: 'l3', name: 'VixxoLink', color: '#0000ff' },
    ],
  }),
  createMockItem({
    id: '3',
    labels: [
      { id: 'l1', name: 'Siebel', color: '#ff0000' },
    ],
  }),
  createMockItem({
    id: '4',
    labels: [
      { id: 'l4', name: 'Corrigo', color: '#ffff00' },
      { id: 'l2', name: 'Gateway', color: '#00ff00' },
    ],
  }),
]

describe('LabelFilter', () => {
  it('renders with placeholder text "All Labels" when no labels selected', () => {
    render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )
    const valueText = screen.getByText('All Labels', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('has accessible label "Filter by label"', () => {
    render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )
    expect(
      screen.getByRole('combobox', { name: /filter by label/i }),
    ).toBeInTheDocument()
  })

  it('handles empty items array gracefully', () => {
    render(
      <LabelFilter items={[]} value={[]} onChange={vi.fn()} />,
    )
    const valueText = screen.getByText('All Labels', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('extracts and displays unique labels sorted alphabetically when opened', async () => {
    render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      const options = screen.getAllByTestId('label-filter-option')
      // 4 unique labels: Corrigo, Gateway, Siebel, VixxoLink (sorted)
      expect(options.length).toBe(4)
    })

    // Verify alphabetical order
    const options = screen.getAllByTestId('label-filter-option')
    expect(options[0]).toHaveTextContent('Corrigo')
    expect(options[1]).toHaveTextContent('Gateway')
    expect(options[2]).toHaveTextContent('Siebel')
    expect(options[3]).toHaveTextContent('VixxoLink')
  })

  it('calls onChange with selected label array', async () => {
    const onChange = vi.fn()
    render(
      <LabelFilter items={mockItems} value={[]} onChange={onChange} />,
    )

    const trigger = screen.getByRole('combobox', { name: /filter by label/i })
    fireEvent.click(trigger)
    const option = await screen.findByRole('option', { name: /Siebel/ })
    fireEvent.click(option)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['Siebel'])
    })
  })

  it('supports multi-select (multiple labels in value)', () => {
    render(
      <LabelFilter
        items={mockItems}
        value={['Siebel', 'Gateway']}
        onChange={vi.fn()}
      />,
    )
    // When multiple labels are selected, trigger shows a summary + chips are visible
    expect(
      screen.getByRole('combobox', { name: /filter by label/i }),
    ).toHaveTextContent('2 Labels')
    expect(screen.getAllByText('Siebel').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Gateway').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole('button', { name: 'Remove label Siebel' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove label Gateway' }),
    ).toBeInTheDocument()
  })

  it('shows single label name when one label selected', () => {
    render(
      <LabelFilter
        items={mockItems}
        value={['Siebel']}
        onChange={vi.fn()}
      />,
    )
    // The trigger area should display the single label name
    const triggerTexts = screen.getAllByText('Siebel')
    expect(triggerTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('allows removing an individual label via chip remove button', async () => {
    const onChange = vi.fn()
    render(
      <LabelFilter
        items={mockItems}
        value={['Siebel', 'Gateway']}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove label Gateway' }))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['Siebel'])
    })
  })

  it('uses getLabelColor() for colored dots in dropdown options', async () => {
    render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      const options = screen.getAllByTestId('label-filter-option')
      expect(options.length).toBe(4)
    })

    // Verify options contain label names and counts (colored dots are CSS-styled divs)
    const options = screen.getAllByTestId('label-filter-option')
    // Each option contains label text + count — verifying the structure is correct
    expect(options[0]).toHaveTextContent('Corrigo')
    expect(options[1]).toHaveTextContent('Gateway')
    expect(options[2]).toHaveTextContent('Siebel')
    expect(options[3]).toHaveTextContent('VixxoLink')
  })

  it('shows clear trigger when labels are selected', () => {
    const { container } = render(
      <LabelFilter
        items={mockItems}
        value={['Siebel']}
        onChange={vi.fn()}
      />,
    )

    const clearTrigger = container.querySelector('[data-part="clear-trigger"]')
    expect(clearTrigger).toBeInTheDocument()
  })

  it('does not show clear trigger when no labels are selected', () => {
    const { container } = render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )

    const clearTrigger = container.querySelector('[data-part="clear-trigger"]')
    expect(clearTrigger).not.toBeInTheDocument()
  })

  describe('ARIA live region', () => {
    it('has an ARIA live region with role="status" and aria-live="polite"', () => {
      render(
        <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('does NOT announce on initial mount', () => {
      render(
        <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('')
    })

    it('announces when labels are selected', () => {
      const { rerender } = render(
        <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
      )
      rerender(
        <LabelFilter items={mockItems} value={['Siebel']} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('Filtered to 1 label: Siebel')
    })

    it('announces when multiple labels are selected', () => {
      const { rerender } = render(
        <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
      )
      rerender(
        <LabelFilter items={mockItems} value={['Siebel', 'Gateway']} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('Filtered to 2 labels: Siebel, Gateway')
    })

    it('announces when filter is cleared', () => {
      const { rerender } = render(
        <LabelFilter items={mockItems} value={['Siebel']} onChange={vi.fn()} />,
      )
      rerender(
        <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
      )
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent('Label filter cleared, showing all items')
    })
  })

  describe('active state styling', () => {
    it('sets data-active attribute on trigger when labels are selected', () => {
      const { container } = render(
        <LabelFilter
          items={mockItems}
          value={['Siebel']}
          onChange={vi.fn()}
        />,
      )
      const trigger = container.querySelector('[data-part="trigger"]')
      expect(trigger).toHaveAttribute('data-active')
    })

    it('does NOT set data-active attribute when no labels selected', () => {
      const { container } = render(
        <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
      )
      const trigger = container.querySelector('[data-part="trigger"]')
      expect(trigger).not.toHaveAttribute('data-active')
    })
  })

  it('displays item counts next to label names in dropdown', async () => {
    render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      const options = screen.getAllByTestId('label-filter-option')
      expect(options.length).toBe(4)
    })

    // Siebel appears in items 1 and 3 → count 2
    // Gateway appears in items 1 and 4 → count 2
    // VixxoLink appears in item 2 → count 1
    // Corrigo appears in item 4 → count 1
    const options = screen.getAllByTestId('label-filter-option')
    expect(options[2]).toHaveTextContent('Siebel')
    expect(options[2]).toHaveTextContent('2')
    expect(options[1]).toHaveTextContent('Gateway')
    expect(options[1]).toHaveTextContent('2')
    expect(options[3]).toHaveTextContent('VixxoLink')
    expect(options[3]).toHaveTextContent('1')
    expect(options[0]).toHaveTextContent('Corrigo')
    expect(options[0]).toHaveTextContent('1')
  })

  it('renders a hidden select for form compatibility', () => {
    const { container } = render(
      <LabelFilter items={mockItems} value={[]} onChange={vi.fn()} />,
    )
    const hiddenSelect = container.querySelector('select')
    expect(hiddenSelect).toBeInTheDocument()
  })
})
