import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import { SortControl } from './sort-control'
import type { SortField, SortDirection } from './sort-control'

describe('SortControl', () => {
  const defaultProps = {
    sortBy: 'priority' as SortField,
    sortDirection: 'asc' as SortDirection,
    onSortByChange: vi.fn(),
    onSortDirectionChange: vi.fn(),
  }

  it('renders with current sort field displayed', () => {
    render(<SortControl {...defaultProps} />)
    const valueText = screen.getByText('Priority', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('has accessible label "Sort backlog items"', () => {
    render(<SortControl {...defaultProps} />)
    expect(
      screen.getByRole('combobox', { name: /sort backlog items/i }),
    ).toBeInTheDocument()
  })

  it('shows all sort options when opened', async () => {
    render(<SortControl {...defaultProps} />)

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Priority' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Date Created' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Date Updated' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Status' })).toBeInTheDocument()
    })
  })

  it('calls onSortByChange when a different sort option is selected via keyboard', async () => {
    const onSortByChange = vi.fn()
    render(<SortControl {...defaultProps} onSortByChange={onSortByChange} />)

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger) // open dropdown
    fireEvent.click(await screen.findByRole('option', { name: 'Date Created' }))

    await waitFor(() => {
      expect(onSortByChange).toHaveBeenCalledWith('dateCreated')
    })
  })

  it('displays ascending arrow icon when sortDirection is asc', () => {
    render(<SortControl {...defaultProps} sortDirection="asc" />)
    const btn = screen.getByRole('button', { name: 'Sort descending' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent('↑')
  })

  it('displays descending arrow icon when sortDirection is desc', () => {
    render(<SortControl {...defaultProps} sortDirection="desc" />)
    const btn = screen.getByRole('button', { name: 'Sort ascending' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent('↓')
  })

  it('calls onSortDirectionChange with desc when asc direction button clicked', () => {
    const onSortDirectionChange = vi.fn()
    render(
      <SortControl
        {...defaultProps}
        sortDirection="asc"
        onSortDirectionChange={onSortDirectionChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }))
    expect(onSortDirectionChange).toHaveBeenCalledWith('desc')
  })

  it('calls onSortDirectionChange with asc when desc direction button clicked', () => {
    const onSortDirectionChange = vi.fn()
    render(
      <SortControl
        {...defaultProps}
        sortDirection="desc"
        onSortDirectionChange={onSortDirectionChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }))
    expect(onSortDirectionChange).toHaveBeenCalledWith('asc')
  })

  it('respects sortBy prop for different fields', () => {
    render(<SortControl {...defaultProps} sortBy="status" />)
    const valueText = screen.getByText('Status', {
      selector: '[data-part="value-text"]',
    })
    expect(valueText).toBeInTheDocument()
  })

  it('renders a hidden select for form compatibility', () => {
    const { container } = render(<SortControl {...defaultProps} />)
    const hiddenSelect = container.querySelector('select')
    expect(hiddenSelect).toBeInTheDocument()
  })
})
