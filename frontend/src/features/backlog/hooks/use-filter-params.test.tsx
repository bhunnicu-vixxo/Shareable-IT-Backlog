import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useFilterParams } from './use-filter-params'

function createWrapper(initialEntries: string[] = ['/'], onLocationChange?: (search: string) => void) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        {onLocationChange ? <LocationObserver onChange={onLocationChange} /> : null}
        {children}
      </MemoryRouter>
    )
  }
}

function LocationObserver({ onChange }: { onChange: (search: string) => void }) {
  const location = useLocation()
  // Update during render is fine for tests; avoids async timing sensitivity.
  onChange(location.search)
  return null
}

describe('useFilterParams', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── URL → State (initialization) ───

  it('returns default filter state when no URL params are present', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/']),
    })

    expect(result.current.selectedLabels).toEqual([])
    expect(result.current.sortBy).toBe('priority')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.searchTerm).toBe('')
    expect(result.current.showNewOnly).toBe(false)
    expect(result.current.hideDone).toBe(true)
  })

  it('initializes filter state from URL params', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?labels=Siebel,Gateway&sort=dateCreated&dir=desc&q=migration&new=1&hideDone=0']),
    })

    expect(result.current.selectedLabels).toEqual(['Siebel', 'Gateway'])
    expect(result.current.sortBy).toBe('dateCreated')
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.searchTerm).toBe('migration')
    expect(result.current.showNewOnly).toBe(true)
    expect(result.current.hideDone).toBe(false)
  })

  it('parses single label correctly', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?labels=Siebel'])
    })

    expect(result.current.selectedLabels).toEqual(['Siebel'])
  })

  it('parses multiple labels as comma-separated', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?labels=Siebel,Gateway,VixxoLink']),
    })

    expect(result.current.selectedLabels).toEqual(['Siebel', 'Gateway', 'VixxoLink'])
  })

  it('trims whitespace in comma-separated labels', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?labels=Siebel,%20Gateway']),
    })

    expect(result.current.selectedLabels).toEqual(['Siebel', 'Gateway'])
  })

  // ─── State → URL (setters) ───

  it('updates URL when labels are set', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setSelectedLabels(['Siebel', 'Dynamics'])
    })

    expect(result.current.selectedLabels).toEqual(['Siebel', 'Dynamics'])
    await waitFor(() => expect(search).toBe('?labels=Siebel,Dynamics'))
  })

  it('updates URL when sort field is set', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setSortBy('dateCreated')
    })

    expect(result.current.sortBy).toBe('dateCreated')
    await waitFor(() => expect(search).toBe('?sort=dateCreated'))
  })

  it('updates URL when sort direction is set', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setSortDirection('desc')
    })

    expect(result.current.sortDirection).toBe('desc')
    await waitFor(() => expect(search).toBe('?dir=desc'))
  })

  it('updates URL when search term is set', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setSearchTerm('migration')
    })

    expect(result.current.searchTerm).toBe('migration')
    await waitFor(() => expect(search).toBe('?q=migration'))
  })

  it('updates URL when showNewOnly is toggled', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setShowNewOnly(true)
    })

    expect(result.current.showNewOnly).toBe(true)
    await waitFor(() => expect(search).toBe('?new=1'))
  })

  it('updates URL when hideDone is toggled', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setHideDone(false)
    })

    expect(result.current.hideDone).toBe(false)
    await waitFor(() => expect(search).toBe('?hideDone=0'))
  })

  // ─── Clearing / defaults ───

  it('clears all filters and removes all query params', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(
        ['/?labels=Siebel&sort=dateCreated&dir=desc&q=test&new=1&hideDone=0'],
        (s) => {
          search = s
        },
      ),
    })

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.selectedLabels).toEqual([])
    expect(result.current.sortBy).toBe('priority')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.searchTerm).toBe('')
    expect(result.current.showNewOnly).toBe(false)
    expect(result.current.hideDone).toBe(true)
    await waitFor(() => expect(search).toBe(''))
  })

  it('does not include default values in URL params', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/'], (s) => {
        search = s
      }),
    })

    // Setting default values should result in no params
    act(() => {
      result.current.setSortBy('priority')
      result.current.setSortDirection('asc')
    })

    // The state should be defaults and URL should be clean
    expect(result.current.selectedLabels).toEqual([])
    expect(result.current.sortBy).toBe('priority')
    expect(result.current.sortDirection).toBe('asc')
    await waitFor(() => expect(search).toBe(''))
  })

  it('does not include empty labels in URL', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?labels=Siebel'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setSelectedLabels([])
    })

    expect(result.current.selectedLabels).toEqual([])
    await waitFor(() => expect(search).toBe(''))
  })

  it('does not include empty search term in URL', async () => {
    let search = ''
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?q=test'], (s) => {
        search = s
      }),
    })

    act(() => {
      result.current.setSearchTerm('')
    })

    expect(result.current.searchTerm).toBe('')
    await waitFor(() => expect(search).toBe(''))
  })

  // ─── Invalid URL params handled gracefully ───

  it('handles invalid sort field gracefully by falling back to default', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?sort=invalidField'])
    })

    expect(result.current.sortBy).toBe('priority')
  })

  it('handles invalid sort direction gracefully by falling back to default', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?dir=sideways'])
    })

    expect(result.current.sortDirection).toBe('asc')
  })

  it('handles invalid new param gracefully', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?new=banana'])
    })

    expect(result.current.showNewOnly).toBe(false)
  })

  it('handles invalid hideDone param gracefully', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?hideDone=banana'])
    })

    expect(result.current.hideDone).toBe(true)
  })

  it('ignores empty labels param', () => {
    const { result } = renderHook(() => useFilterParams(), {
      wrapper: createWrapper(['/?labels='])
    })

    expect(result.current.selectedLabels).toEqual([])
  })
})
