import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@/utils/test-utils'
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

  // --- Task 1: "/" shortcut focuses search (AC #1, #2, #3) ---

  describe('slash shortcut', () => {
    it('focuses search input when "/" is pressed with no input focused', () => {
      render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })

      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })

      expect(document.activeElement).toBe(input)
    })

    it('does NOT steal focus when "/" is pressed while a contenteditable is focused (any truthy variant)', () => {
      render(
        <div>
          <div data-testid="ce-empty" contentEditable tabIndex={0} />
          <div data-testid="ce-plaintext" contentEditable="plaintext-only" tabIndex={0} />
          <KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />
        </div>,
      )

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })

      const ceEmpty = screen.getByTestId('ce-empty')
      ceEmpty.focus()
      expect(document.activeElement).toBe(ceEmpty)
      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })
      expect(document.activeElement).toBe(ceEmpty)
      expect(document.activeElement).not.toBe(input)

      const cePlaintext = screen.getByTestId('ce-plaintext')
      cePlaintext.focus()
      expect(document.activeElement).toBe(cePlaintext)
      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })
      expect(document.activeElement).toBe(cePlaintext)
      expect(document.activeElement).not.toBe(input)
    })

    it('does NOT steal focus when "/" is pressed while an input is focused', () => {
      render(
        <div>
          <input data-testid="other-input" />
          <KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />
        </div>,
      )

      const otherInput = screen.getByTestId('other-input')
      otherInput.focus()

      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })

      expect(document.activeElement).toBe(otherInput)
    })

    it('does NOT steal focus when "/" is pressed while a textarea is focused', () => {
      render(
        <div>
          <textarea data-testid="other-textarea" />
          <KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />
        </div>,
      )

      const textarea = screen.getByTestId('other-textarea')
      textarea.focus()

      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })

      expect(document.activeElement).toBe(textarea)
    })

    it('does NOT trigger when a modal dialog is open', () => {
      render(
        <div>
          <div data-scope="dialog" data-part="backdrop" data-state="open" />
          <KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />
        </div>,
      )

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })

      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })

      expect(document.activeElement).not.toBe(input)
    })

    it('still triggers when a dialog exists but is not open', () => {
      render(
        <div>
          <div data-scope="dialog" data-part="backdrop" data-state="closed" />
          <KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />
        </div>,
      )

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })

      act(() => {
        fireEvent.keyDown(document, { key: '/' })
      })

      expect(document.activeElement).toBe(input)
    })
  })

  // --- Task 2: Escape blurs the search input (AC #4) ---

  describe('escape blur', () => {
    it('blurs the search input when Escape is pressed with no value', () => {
      render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
      act(() => { input.focus() })
      expect(document.activeElement).toBe(input)

      act(() => { fireEvent.keyDown(input, { key: 'Escape' }) })

      expect(document.activeElement).not.toBe(input)
    })

    it('clears and blurs the search input when Escape is pressed with a value', () => {
      const onClear = vi.fn()
      render(<KeywordSearch value="vpn" onChange={vi.fn()} onClear={onClear} />)

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
      act(() => { input.focus() })

      act(() => { fireEvent.keyDown(input, { key: 'Escape' }) })

      expect(onClear).toHaveBeenCalledTimes(1)
      expect(document.activeElement).not.toBe(input)
    })
  })

  // --- Task 3: Visual shortcut hint (AC #5) ---

  describe('shortcut hint badge', () => {
    it('shows "/" hint badge when search input is not focused', () => {
      render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

      expect(screen.getByText('/')).toBeInTheDocument()
    })

    it('hides "/" hint badge when search input is focused', () => {
      render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
      act(() => { fireEvent.focus(input) })

      expect(screen.queryByText('/')).not.toBeInTheDocument()
    })

    it('shows "/" hint badge again after search input loses focus', () => {
      render(<KeywordSearch value="" onChange={vi.fn()} onClear={vi.fn()} />)

      const input = screen.getByRole('searchbox', { name: 'Search backlog items' })
      act(() => { fireEvent.focus(input) })
      expect(screen.queryByText('/')).not.toBeInTheDocument()

      act(() => { fireEvent.blur(input) })
      expect(screen.getByText('/')).toBeInTheDocument()
    })
  })
})
