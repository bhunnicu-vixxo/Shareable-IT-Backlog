import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { KeywordSearch } from './keyword-search'

describe('KeywordSearch', () => {
  it('renders input with accessible label', () => {
    render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

    const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
    expect(input).toBeInTheDocument()
  })

  it('renders with default placeholder', () => {
    render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

    const input = screen.getByPlaceholderText('Search items…')
    expect(input).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(
      <KeywordSearch
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        placeholder="Find items…"
      />,
    )

    expect(screen.getByPlaceholderText('Find items…')).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<KeywordSearch value="" onChange={onChange} onClear={vi.fn()} />)

    const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.change(input, { target: { value: 'vpn' } })

    expect(onChange).toHaveBeenCalledWith('vpn')
  })

  it('shows clear button when value is non-empty', () => {
    render(<KeywordSearch value="vpn" onChange={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Clear search input' })).toBeInTheDocument()
  })

  it('does not show clear button when value is empty', () => {
    render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Clear search input' })).not.toBeInTheDocument()
  })

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn()
    render(<KeywordSearch value="vpn" onChange={vi.fn()} onClear={onClear} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear search input' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('clears when Escape is pressed', () => {
    const onClear = vi.fn()
    render(<KeywordSearch value="vpn" onChange={vi.fn()} onClear={onClear} />)

    const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('displays the current value in the input', () => {
    render(<KeywordSearch value="network" onChange={vi.fn()} onClear={vi.fn()} />)

    const input = screen.getByRole('searchbox', { name: 'Search backlog items' }) as HTMLInputElement
    expect(input.value).toBe('network')
  })
})
