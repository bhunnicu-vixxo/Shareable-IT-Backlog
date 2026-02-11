import { useState, useMemo, useRef } from 'react'
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

  if (isLoading) {
    return (
      <Box data-testid="backlog-list-loading">
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
    const parts: string[] = []
    if (showNewOnly) parts.push('new')
    const itemWord = count === 1 ? 'item' : 'items'
    const filterParts = parts.length > 0 ? `${parts.join(' ')} ` : ''
    const matchPart = debouncedQuery.trim() ? ` matching "${debouncedQuery.trim()}"` : ''
    const buPart = selectedBusinessUnit ? ` for ${selectedBusinessUnit}` : ''
    return `Showing ${count} ${filterParts}${itemWord}${matchPart}${buPart}`
  }

  /** Whether any filter is active (used for empty-state detection). */
  const hasActiveFilters = showNewOnly || !!selectedBusinessUnit || debouncedQuery.trim().length > 0

  return (
    <Box>
      {/* Filter bar: business unit dropdown, search input, "New only" toggle, results count */}
      <Flex alignItems="center" mb="4" flexWrap="wrap" gap="3">
        <BusinessUnitFilter
          items={items}
          value={selectedBusinessUnit}
          onChange={setSelectedBusinessUnit}
        />
        <KeywordSearch
          value={keywordQuery}
          onChange={setKeywordQuery}
          onClear={() => setKeywordQuery('')}
        />
        {newItemCount > 0 && (
          <Button
            size="sm"
            variant={showNewOnly ? 'solid' : 'outline'}
            onClick={() => setShowNewOnly(!showNewOnly)}
            aria-pressed={showNewOnly}
            aria-label={showNewOnly ? 'Show all items' : 'Show only new items'}
          >
            {showNewOnly
              ? 'Show all'
              : `New only (${selectedBusinessUnit ? scopedNewItemCount : newItemCount})`}
          </Button>
        )}
        <SortControl
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortByChange={setSortBy}
          onSortDirectionChange={setSortDirection}
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
          onClearKeyword={() => setKeywordQuery('')}
          onClearBusinessUnit={() => setSelectedBusinessUnit(null)}
          onClearNewOnly={() => setShowNewOnly(false)}
          onClearAll={() => {
            setKeywordQuery('')
            setSelectedBusinessUnit(null)
            setShowNewOnly(false)
          }}
        />
      ) : (
        <>
          <VStack gap="4" align="stretch">
            {displayedItems.map((item) => (
              <Box
                key={item.id}
                ref={(el: HTMLDivElement | null) => {
                  cardRefs.current[item.id] = el
                }}
              >
                <BacklogItemCard
                  item={item}
                  highlightTokens={searchTokens}
                  onClick={() => {
                    lastClickedCardRef.current = cardRefs.current[item.id] ?? null
                    setSelectedItemId(item.id)
                  }}
                />
              </Box>
            ))}
          </VStack>
          <ItemDetailModal
            isOpen={!!selectedItemId}
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
            triggerRef={lastClickedCardRef}
          />
        </>
      )}
    </Box>
  )
}
