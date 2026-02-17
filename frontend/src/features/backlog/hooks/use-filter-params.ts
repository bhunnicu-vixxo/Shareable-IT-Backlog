import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { SortField, SortDirection } from '../components/sort-control'

/** Default filter values — URL only includes non-default state. */
const DEFAULTS = {
  sortBy: 'priority' as SortField,
  sortDirection: 'asc' as SortDirection,
  searchTerm: '',
  showNewOnly: false,
  hideDone: true,
} as const

const VALID_SORT_FIELDS = new Set<SortField>(['priority', 'dateCreated', 'dateUpdated', 'status'])
const VALID_SORT_DIRECTIONS = new Set<SortDirection>(['asc', 'desc'])

/** URL parameter keys — human-readable. */
const PARAM = {
  labels: 'labels',
  sort: 'sort',
  dir: 'dir',
  q: 'q',
  new: 'new',
  hideDone: 'hideDone',
} as const

export interface FilterParamsState {
  selectedLabels: string[]
  sortBy: SortField
  sortDirection: SortDirection
  searchTerm: string
  showNewOnly: boolean
  hideDone: boolean
}

export interface FilterParamsActions {
  setSelectedLabels: (labels: string[]) => void
  setSortBy: (field: SortField) => void
  setSortDirection: (dir: SortDirection) => void
  setSearchTerm: (term: string) => void
  setShowNewOnly: (show: boolean) => void
  setHideDone: (hide: boolean) => void
  toggleShowNewOnly: () => void
  toggleHideDone: () => void
  clearAll: () => void
}

export type UseFilterParamsReturn = FilterParamsState & FilterParamsActions

/**
 * Parse URL search params into a typed filter state object.
 * Invalid values fall back to defaults.
 */
function parseSearchParams(params: URLSearchParams): FilterParamsState {
  const labelsRaw = params.get(PARAM.labels)
  // Labels are separated by '|' to avoid conflicts with commas in label names.
  // Each label is URL-encoded, so we split first then decode individually.
  const selectedLabels =
    labelsRaw && labelsRaw.trim().length > 0
      ? labelsRaw
          .split('|')
          .map((l) => {
            try {
              return decodeURIComponent(l.trim())
            } catch {
              return l.trim()
            }
          })
          .filter(Boolean)
      : []

  const sortByRaw = params.get(PARAM.sort) as SortField | null
  const sortBy = sortByRaw && VALID_SORT_FIELDS.has(sortByRaw) ? sortByRaw : DEFAULTS.sortBy

  const dirRaw = params.get(PARAM.dir) as SortDirection | null
  const sortDirection =
    dirRaw && VALID_SORT_DIRECTIONS.has(dirRaw) ? dirRaw : DEFAULTS.sortDirection

  const searchTerm = (params.get(PARAM.q) ?? DEFAULTS.searchTerm).trim()

  const newRaw = params.get(PARAM.new)
  const showNewOnly = newRaw === '1'

  const hideDoneRaw = params.get(PARAM.hideDone)
  const hideDone = hideDoneRaw === '0' ? false : DEFAULTS.hideDone

  return { selectedLabels, sortBy, sortDirection, searchTerm, showNewOnly, hideDone }
}

/**
 * Build a query string (including leading '?') from filter state,
 * omitting any parameter whose value matches its default.
 *
 * Labels are joined with '|' to avoid conflicts with commas in label names.
 * Each label value is URL-encoded individually.
 */
function buildSearchString(state: FilterParamsState): string {
  const pairs: Array<[string, string]> = []

  const normalizedLabels = Array.from(
    new Set(state.selectedLabels.map((l) => l.trim()).filter(Boolean)),
  )
  if (normalizedLabels.length > 0) {
    // Encode each label and join with '|' separator
    const encodedLabels = normalizedLabels.map((l) => encodeURIComponent(l)).join('|')
    pairs.push([PARAM.labels, encodedLabels])
  }
  if (state.sortBy !== DEFAULTS.sortBy) {
    pairs.push([PARAM.sort, state.sortBy])
  }
  if (state.sortDirection !== DEFAULTS.sortDirection) {
    pairs.push([PARAM.dir, state.sortDirection])
  }
  const normalizedSearch = state.searchTerm.trim()
  if (normalizedSearch.length > 0) {
    pairs.push([PARAM.q, normalizedSearch])
  }
  if (state.showNewOnly) {
    pairs.push([PARAM.new, '1'])
  }
  if (!state.hideDone) {
    pairs.push([PARAM.hideDone, '0'])
  }

  if (pairs.length === 0) return ''

  const query = pairs
    .map(([k, v]) => {
      const encodedKey = encodeURIComponent(k)
      if (k === PARAM.labels) {
        // Labels are already encoded with '|' separator in the value
        return `${encodedKey}=${v}`
      }
      return `${encodedKey}=${encodeURIComponent(v)}`
    })
    .join('&')
  return `?${query}`
}

/**
 * Bidirectional URL ↔ filter state hook.
 *
 * Uses local state (useState) as the primary store for fast synchronous
 * updates that work correctly with Chakra UI components. Syncs state
 * changes to the URL via useEffect, and reads initial state from URL
 * params on mount for shareable link support.
 *
 * Uses `replace` navigation to avoid polluting browser history.
 * Default values are omitted from the URL to keep links clean.
 */
export function useFilterParams(): UseFilterParamsReturn {
  // Keep `useSearchParams` in play for parsing semantics; use `navigate` for writing
  // so we can preserve comma readability in the URL for `labels`.
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Initialize state from URL params on mount
  const [state, setState] = useState<FilterParamsState>(() =>
    parseSearchParams(searchParams),
  )

  // Track whether URL was recently updated by this hook (to avoid feedback loop).
  const lastPushedSearch = useRef<string | null>(null)
  // Track if state change originated from URL sync (to avoid state→URL feedback).
  const isUrlSync = useRef(false)

  // Sync URL → state when user navigates (back/forward, manual URL edit).
  // This effect MUST run before the state→URL effect so external URL changes
  // update state before the state→URL effect can overwrite the URL.
  useEffect(() => {
    // Skip if this URL change originated from our own navigation
    if (lastPushedSearch.current === location.search) {
      return
    }
    const urlState = parseSearchParams(new URLSearchParams(location.search))
    setState((prev) => {
      if (
        prev.selectedLabels.join('\0') === urlState.selectedLabels.join('\0') &&
        prev.sortBy === urlState.sortBy &&
        prev.sortDirection === urlState.sortDirection &&
        prev.searchTerm === urlState.searchTerm &&
        prev.showNewOnly === urlState.showNewOnly &&
        prev.hideDone === urlState.hideDone
      ) {
        return prev
      }
      isUrlSync.current = true
      return urlState
    })
  }, [location.search])

  // Sync state → URL whenever state changes (skip if change came from URL)
  useEffect(() => {
    if (isUrlSync.current) {
      isUrlSync.current = false
      return
    }
    const newSearch = buildSearchString(state)
    // Avoid redundant replace() calls if URL is already canonical.
    if (newSearch !== location.search) {
      lastPushedSearch.current = newSearch
      navigate({ pathname: location.pathname, search: newSearch }, { replace: true })
    }
  }, [state, navigate, location.pathname, location.search])

  const setSelectedLabels = useCallback(
    (labels: string[]) =>
      setState((s) => ({
        ...s,
        selectedLabels: Array.from(new Set(labels.map((l) => l.trim()).filter(Boolean))),
      })),
    [],
  )

  const setSortBy = useCallback(
    (field: SortField) => setState((s) => ({ ...s, sortBy: field })),
    [],
  )

  const setSortDirection = useCallback(
    (dir: SortDirection) => setState((s) => ({ ...s, sortDirection: dir })),
    [],
  )

  const setSearchTerm = useCallback(
    (term: string) => setState((s) => ({ ...s, searchTerm: term })),
    [],
  )

  const setShowNewOnly = useCallback(
    (show: boolean) => setState((s) => ({ ...s, showNewOnly: show })),
    [],
  )

  const setHideDone = useCallback(
    (hide: boolean) => setState((s) => ({ ...s, hideDone: hide })),
    [],
  )

  const toggleShowNewOnly = useCallback(
    () => setState((s) => ({ ...s, showNewOnly: !s.showNewOnly })),
    [],
  )

  const toggleHideDone = useCallback(
    () => setState((s) => ({ ...s, hideDone: !s.hideDone })),
    [],
  )

  const clearAll = useCallback(
    () =>
      setState({
        selectedLabels: [],
        sortBy: DEFAULTS.sortBy,
        sortDirection: DEFAULTS.sortDirection,
        searchTerm: DEFAULTS.searchTerm,
        showNewOnly: DEFAULTS.showNewOnly,
        hideDone: DEFAULTS.hideDone,
      }),
    [],
  )

  return {
    ...state,
    setSelectedLabels,
    setSortBy,
    setSortDirection,
    setSearchTerm,
    setShowNewOnly,
    setHideDone,
    toggleShowNewOnly,
    toggleHideDone,
    clearAll,
  }
}
