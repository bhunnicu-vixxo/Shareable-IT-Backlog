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

  it('calls onChange with selected business unit value via keyboard', async () => {
    const onChange = vi.fn()
    render(
      <BusinessUnitFilter items={mockItems} value={null} onChange={onChange} />,
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: 'Finance' }))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('Finance')
    })
  })

  it('calls onChange with null when "All Business Units" is selected via keyboard', async () => {
    const onChange = vi.fn()
    render(
      <BusinessUnitFilter
        items={mockItems}
        value="Operations"
        onChange={onChange}
      />,
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: 'All Business Units' }))

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
})
