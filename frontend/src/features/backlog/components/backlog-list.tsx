import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Box, Button, Flex, HStack, Skeleton, Text, VStack } from '@chakra-ui/react'
import { useBacklogItems } from '../hooks/use-backlog-items'
import { useDebouncedValue } from '../hooks/use-debounced-value'
import { tokenizeQuery } from '../utils/highlight'
import { BacklogItemCard } from './backlog-item-card'
import { BusinessUnitFilter } from './business-unit-filter'
import { KeywordSearch } from './keyword-search'
import { EmptyStateWithGuidance } from './empty-state-with-guidance'
import { SortControl } from './sort-control'
import type { SortField, SortDirection } from './sort-control'
import { ItemDetailModal } from './item-detail-modal'

/** Human-readable labels for sort fields (used in screen reader announcements). */
const SORT_LABELS: Record<SortField, string> = {
  priority: 'priority',
  dateCreated: 'date created',
  dateUpdated: 'date updated',
  status: 'status',
}

/**
 * Loading skeleton matching the BacklogItemCard layout.
 * Shows 5 skeleton cards during data fetching.
 */
function BacklogListSkeleton() {
  return (
    <VStack gap="4" align="stretch">
      {Array.from({ length: 5 }).map((_, i) => (
        <HStack key={i} p="4" borderWidth="1px" borderRadius="md" gap="4">
          <Skeleton boxSize="8" borderRadius="full" />
          <VStack align="start" flex="1" gap="2">
            <Skeleton height="5" width="60%" />
            <Skeleton height="4" width="40%" />
          </VStack>
        </HStack>
      ))}
    </VStack>
  )
}

/**
 * Empty state displayed when no backlog items exist.
 */
function BacklogEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      p="12"
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      textAlign="center"
    >
      <Text fontSize="2xl" mb="2">
        🔍
      </Text>
      <Text fontWeight="bold" fontSize="lg" mb="2">
        No backlog items found
      </Text>
      <Text color="gray.500" mb="4">
        Data may not have been synced yet. Contact your admin to trigger a sync.
      </Text>
      <Button onClick={onRetry} variant="outline" size="sm">
        Retry
      </Button>
    </Flex>
  )
}

/**
 * Error state displayed when the API request fails.
 */
function BacklogErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      p="12"
      borderWidth="1px"
      borderRadius="md"
      borderColor="red.200"
      bg="red.50"
      textAlign="center"
      role="alert"
    >
      <Text fontSize="2xl" mb="2">
        ⚠️
      </Text>
      <Text fontWeight="bold" fontSize="lg" mb="2" color="red.600">
        Failed to load backlog items
      </Text>
      <Text color="gray.600" mb="4">
        {message}
      </Text>
      <Button onClick={onRetry} variant="outline" size="sm">
        Try Again
      </Button>
    </Flex>
  )
}

/**
 * Main backlog list component.
 *
 * Composes BacklogItemCard with loading, error, and empty states.
 * Displays a results count and sorts items by priority (pre-sorted by backend).
 */
export function BacklogList() {
  const { data, isLoading, isError, error, refetch } = useBacklogItems()
  const [showNewOnly, setShowNewOnly] = useState(false)
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string | null>(null)
  const [keywordQuery, setKeywordQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastClickedCardRef = useRef<HTMLDivElement | null>(null)
  const lastClickedItemId = useRef<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  // Debounce the keyword query so filtering doesn't run on every keystroke
  const debouncedQuery = useDebouncedValue(keywordQuery, 300)
  const searchTokens = useMemo(() => {
    const tokens = tokenizeQuery(debouncedQuery)
      .map((t) => t.toLowerCase())
      .filter(Boolean)
    return Array.from(new Set(tokens))
  }, [debouncedQuery])

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // Client-side chained filters + sort — O(n log n), instant re-render, no API call
  // Chain: business unit → "New only" → keyword search → sort
  const displayedItems = useMemo(() => {
    let filtered = items
    if (selectedBusinessUnit) {
      filtered = filtered.filter((item) => item.teamName === selectedBusinessUnit)
    }
    if (showNewOnly) {
      filtered = filtered.filter((item) => item.isNew)
    }
    if (searchTokens.length > 0) {
      filtered = filtered.filter((item) => {
        const searchable = [
          item.title,
          item.description ?? '',
          item.teamName,
          item.status,
          item.identifier,
          ...item.labels.map((l) => l.name),
        ]
          .join(' ')
          .toLowerCase()
        return searchTokens.every((token) => searchable.includes(token))
      })
    }

    // Sort after filtering (immutable — spread before sort)
    const sorted = [...filtered].sort((a, b) => {
      // Special-case priority so "None" (0) always stays last, even when descending.
      if (sortBy === 'priority') {
        const aIsNone = a.priority === 0
        const bIsNone = b.priority === 0
        if (aIsNone !== bIsNone) {
          return aIsNone ? 1 : -1
        }
        const base = a.priority - b.priority
        if (base !== 0) return sortDirection === 'asc' ? base : -base
        // Tiebreaker: preserve Linear's stack-rank order within same priority
        return a.prioritySortOrder - b.prioritySortOrder
      }

      let cmp = 0
      switch (sortBy) {
        case 'dateCreated':
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
        case 'dateUpdated':
          cmp = a.updatedAt.localeCompare(b.updatedAt)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [items, selectedBusinessUnit, showNewOnly, searchTokens, sortBy, sortDirection])

  // Virtual scrolling — only renders visible items in the DOM
  const virtualizer = useVirtualizer({
    count: displayedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  })

  // Keep refs to stable values for use in callbacks without extra deps
  const displayedItemsRef = useRef(displayedItems)
  displayedItemsRef.current = displayedItems

  // Reset scroll position when displayed items change (filter/sort)
  const prevDisplayedItemsRef = useRef(displayedItems)
  useEffect(() => {
    if (prevDisplayedItemsRef.current !== displayedItems) {
      prevDisplayedItemsRef.current = displayedItems
      virtualizer.scrollToOffset(0)
    }
  }, [displayedItems, virtualizer])

  // Live region announcement for filter/sort result changes (AC #5)
  // Only announce after initial data load is complete — skip loading → first render.
  const hasDataLoaded = useRef(false)
  const prevCountRef = useRef(0)
  const prevSortByRef = useRef(sortBy)
  const prevSortDirRef = useRef(sortDirection)
  useEffect(() => {
    const el = liveRegionRef.current
    if (!el) return

    // Record baseline once after the live region exists (skip initial render announcement).
    if (!hasDataLoaded.current) {
      hasDataLoaded.current = true
      prevCountRef.current = displayedItems.length
      prevSortByRef.current = sortBy
      prevSortDirRef.current = sortDirection
      return
    }

    // Check if sort changed
    if (prevSortByRef.current !== sortBy || prevSortDirRef.current !== sortDirection) {
      const sortLabel = SORT_LABELS[sortBy] ?? sortBy
      const dirLabel = sortDirection === 'asc' ? 'ascending' : 'descending'
      el.textContent = `Items sorted by ${sortLabel}, ${dirLabel}`
      prevSortByRef.current = sortBy
      prevSortDirRef.current = sortDirection
      prevCountRef.current = displayedItems.length
      return
    }

    // Otherwise announce count change from filters
    if (prevCountRef.current !== displayedItems.length) {
      el.textContent = `Showing ${displayedItems.length} ${displayedItems.length === 1 ? 'item' : 'items'}`
      prevCountRef.current = displayedItems.length
    }
  }, [displayedItems.length, sortBy, sortDirection])

  // Stabilize callback handlers with useCallback to maintain referential stability
  // for memoized child components (React.memo). State setters are stable references.
  const handleClearKeyword = useCallback(() => setKeywordQuery(''), [])
  const handleClearBusinessUnit = useCallback(() => setSelectedBusinessUnit(null), [])
  const handleClearNewOnly = useCallback(() => setShowNewOnly(false), [])
  const handleClearAll = useCallback(() => {
    setKeywordQuery('')
    setSelectedBusinessUnit(null)
    setShowNewOnly(false)
  }, [])
  const handleToggleNewOnly = useCallback(() => setShowNewOnly((prev) => !prev), [])
  // Note: Each card still gets a per-item inline closure in the .map() below
  // (to capture item.id). This means BacklogItemCard's onClick prop changes on
  // every parent render, partially defeating React.memo for that prop. This is
  // acceptable — the item/highlightTokens props remain stable, and the closure
  // cost for typical backlog sizes (< 500 items) is negligible.
  const handleItemClick = useCallback((itemId: string) => {
    lastClickedCardRef.current = cardRefs.current[itemId] ?? null
    lastClickedItemId.current = itemId
    setSelectedItemId(itemId)
  }, [])
  /**
   * Focus a BacklogItemCard at a given index, scrolling the virtualizer if needed.
   * After scrolling, waits for the next render frame to ensure the card DOM node
   * exists before calling .focus().
   */
  const focusCardAtIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= displayedItemsRef.current.length) return
      virtualizer.scrollToIndex(index, { align: 'auto' })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const item = displayedItemsRef.current[index]
          if (item) {
            const cardEl = cardRefs.current[item.id]
            if (cardEl) cardEl.focus()
          }
        })
      })
    },
    [virtualizer],
  )

  /**
   * Arrow key navigation handler for the backlog list (AC #8).
   * ArrowDown/Up: move focus between items. Home/End: jump to first/last item.
   * Works with virtual scrolling by scrolling the target into view first.
   */
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = displayedItemsRef.current
      if (items.length === 0) return

      // Determine which card currently has focus
      const activeEl = document.activeElement as HTMLElement | null
      let currentIndex = -1
      if (activeEl) {
        for (let i = 0; i < items.length; i++) {
          if (cardRefs.current[items[i].id] === activeEl) {
            currentIndex = i
            break
          }
        }
      }

      let targetIndex: number | null = null

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          targetIndex = currentIndex < items.length - 1 ? currentIndex + 1 : null
          break
        case 'ArrowUp':
          e.preventDefault()
          targetIndex = currentIndex > 0 ? currentIndex - 1 : null
          break
        case 'Home':
          e.preventDefault()
          targetIndex = 0
          break
        case 'End':
          e.preventDefault()
          targetIndex = items.length - 1
          break
      }

      if (targetIndex !== null) {
        focusCardAtIndex(targetIndex)
      }
    },
    [focusCardAtIndex],
  )

  const handleCloseDetail = useCallback(() => {
    // Scroll the previously clicked card into view before closing the modal
    // so that it is rendered in the DOM for focus restoration.
    if (lastClickedItemId.current) {
      const idx = displayedItemsRef.current.findIndex(
        (item) => item.id === lastClickedItemId.current,
      )
      if (idx >= 0) {
        virtualizer.scrollToIndex(idx, { align: 'center' })
      }
    }
    setSelectedItemId(null)
    // After scroll + render, manually focus the card as a reliable fallback
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (lastClickedItemId.current) {
          const cardEl = cardRefs.current[lastClickedItemId.current]
          if (cardEl) {
            lastClickedCardRef.current = cardEl
            cardEl.focus()
          }
        }
      })
    })
  }, [virtualizer])

  if (isLoading) {
    return (
      <Box data-testid="backlog-list-loading" role="status" aria-live="polite" aria-label="Loading backlog items">
        <Skeleton height="5" width="120px" mb="4" />
        <BacklogListSkeleton />
      </Box>
    )
  }

  if (isError && (!data || data.items.length === 0)) {
    return (
      <BacklogErrorState
        message={error?.message ?? 'Please try again or contact your admin.'}
        onRetry={() => void refetch()}
      />
    )
  }
  // When isError && data.items.length > 0: fall through to normal rendering.
  // The SyncStatusIndicator in BacklogPage already warns "Data shown may be outdated".

  if (items.length === 0) {
    return <BacklogEmptyState onRetry={() => void refetch()} />
  }

  // Used to decide whether to render the "New only" toggle at all.
  // We keep this based on the full dataset so users can still discover
  // "no new items for <BU>" scenarios when combined with BU filtering.
  const newItemCount = items.filter((item) => item.isNew).length

  // Used for display only. When a business unit is selected, show a BU-scoped
  // count to avoid implying that the new-item count applies to the current BU
  // when it doesn't.
  const scopedNewItemCount = (selectedBusinessUnit
    ? items.filter((item) => item.teamName === selectedBusinessUnit)
    : items
  ).filter((item) => item.isNew).length

  /** Build a descriptive results count reflecting active filters. */
  const getResultCountText = () => {
    const count = displayedItems.length
    const total = items.length
    const isFiltered = count !== total
    const parts: string[] = []
    if (showNewOnly) parts.push('new')
    // When showing "X of Y", Y >= 2 so always plural; otherwise pluralize on count
    const itemWord = isFiltered ? 'items' : count === 1 ? 'item' : 'items'
    const filterParts = parts.length > 0 ? `${parts.join(' ')} ` : ''
    const ofTotal = isFiltered ? ` of ${total}` : ''
    const matchPart = debouncedQuery.trim() ? ` matching "${debouncedQuery.trim()}"` : ''
    const buPart = selectedBusinessUnit ? ` for ${selectedBusinessUnit}` : ''
    return `Showing ${count}${ofTotal} ${filterParts}${itemWord}${matchPart}${buPart}`
  }

  /** Whether any filter is active (used for empty-state detection). */
  const hasActiveFilters = showNewOnly || !!selectedBusinessUnit || debouncedQuery.trim().length > 0

  return (
    <Box>
      {/* Screen reader live region for dynamic announcements (AC #5) */}
      <Box
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        position="absolute"
        width="1px"
        height="1px"
        overflow="hidden"
        clipPath="inset(50%)"
        whiteSpace="nowrap"
      />

      {/* Filter bar: business unit dropdown, sort, "New only" toggle, search, results count */}
      {/* Tab order: BusinessUnitFilter → SortControl → "New only" toggle → KeywordSearch (AC #6) */}
      <Flex alignItems="center" mb="4" flexWrap="wrap" gap="3" role="search" aria-label="Filter and sort backlog items">
        <BusinessUnitFilter
          items={items}
          value={selectedBusinessUnit}
          onChange={setSelectedBusinessUnit}
        />
        <SortControl
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortByChange={setSortBy}
          onSortDirectionChange={setSortDirection}
        />
        {newItemCount > 0 && (
          <Button
            size="sm"
            variant={showNewOnly ? 'solid' : 'outline'}
            onClick={handleToggleNewOnly}
            aria-pressed={showNewOnly}
            aria-label={showNewOnly ? 'Show only new items, currently on' : 'Show only new items, currently off'}
          >
            {showNewOnly
              ? 'Show all'
              : `New only (${selectedBusinessUnit ? scopedNewItemCount : newItemCount})`}
          </Button>
        )}
        <KeywordSearch
          value={keywordQuery}
          onChange={setKeywordQuery}
          onClear={handleClearKeyword}
        />
        <Text fontSize="sm" color="gray.500" ml="auto">
          {getResultCountText()}
        </Text>
      </Flex>

      {/* Filtered items or empty filter state */}
      {displayedItems.length === 0 && hasActiveFilters ? (
        <EmptyStateWithGuidance
          keyword={debouncedQuery}
          businessUnit={selectedBusinessUnit}
          showNewOnly={showNewOnly}
          onClearKeyword={handleClearKeyword}
          onClearBusinessUnit={handleClearBusinessUnit}
          onClearNewOnly={handleClearNewOnly}
          onClearAll={handleClearAll}
        />
      ) : (
        <>
          <Box
            ref={parentRef}
            height="calc(100vh - 220px)"
            overflowY="auto"
            px="1"
            mx="-1"
            role="list"
            aria-label="Backlog items"
            onKeyDown={handleListKeyDown}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = displayedItems[virtualItem.index]
                return (
                  <div
                    key={item.id}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <Box pb="4">
                      <BacklogItemCard
                        ref={(el: HTMLDivElement | null) => {
                          cardRefs.current[item.id] = el
                        }}
                        item={item}
                        highlightTokens={searchTokens}
                        onClick={() => handleItemClick(item.id)}
                      />
                    </Box>
                  </div>
                )
              })}
            </div>
          </Box>
          <ItemDetailModal
            isOpen={!!selectedItemId}
            itemId={selectedItemId}
            onClose={handleCloseDetail}
            triggerRef={lastClickedCardRef}
          />
        </>
      )}
    </Box>
  )
}
