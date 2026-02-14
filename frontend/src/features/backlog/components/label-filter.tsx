import { memo, useEffect, useMemo, useRef } from 'react'
import {
  Badge,
  Box,
  Flex,
  Select,
  createListCollection,
} from '@chakra-ui/react'
import { getLabelColor } from '../utils/label-colors'
import type { BacklogItem } from '../types/backlog.types'
import { useVisibleLabels } from '@/shared/hooks/use-visible-labels'

export interface LabelFilterProps {
  /** Full (unfiltered) list of backlog items to extract unique labels from */
  items: BacklogItem[]
  /** Currently selected label names (empty array = show all) */
  value: string[]
  /** Called when user changes the filter. Empty array = show all items */
  onChange: (value: string[]) => void
  /** When true, renders a compact variant with reduced sizing for tight layouts */
  compact?: boolean
}

/**
 * Multi-select label filter that extracts unique labels from
 * the provided backlog items and allows filtering by one or more labels.
 *
 * Replaces the old single-select Business Unit filter with a more
 * useful label-based filter since there is only one business unit.
 *
 * Features:
 * - Multi-select with checkmarks for selected labels
 * - Colored dot next to each label name matching the card pills
 * - Trigger shows count of selected labels or "All Labels"
 * - ARIA live region for screen reader announcements
 */
export const LabelFilter = memo(function LabelFilter({
  items,
  value,
  onChange,
  compact = false,
}: LabelFilterProps) {
  const { visibleLabels, isLoading: isVisibleLabelsLoading } = useVisibleLabels()

  // Extract unique label names sorted alphabetically, with item counts
  const allLabelOptions = useMemo(() => {
    const labelCounts = new Map<string, number>()
    for (const item of items) {
      for (const label of item.labels) {
        labelCounts.set(label.name, (labelCounts.get(label.name) ?? 0) + 1)
      }
    }
    return [...labelCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(([name, count]) => ({
        label: name,
        value: name,
        count,
      }))
  }, [items])

  // Filter to only show admin-approved visible labels (AC #3, #4, #6)
  const labelOptions = useMemo(() => {
    if (visibleLabels.length === 0) return []
    const visibleSet = new Set(visibleLabels)
    return allLabelOptions.filter((opt) => visibleSet.has(opt.value))
  }, [allLabelOptions, visibleLabels])

  const collection = useMemo(
    () => createListCollection({ items: labelOptions }),
    [labelOptions],
  )

  // ARIA live region announcement
  const isInitialMount = useRef(true)
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const text =
      value.length > 0
        ? `Filtered to ${value.length} ${value.length === 1 ? 'label' : 'labels'}: ${value.join(', ')}`
        : 'Label filter cleared, showing all items'
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = text
    }
  }, [value])

  // AC #6: If zero labels are enabled, hide the label filter entirely
  // BUT: avoid UI flicker while visible labels are still loading (do not leak labels).
  if (isVisibleLabelsLoading) {
    return (
      <Box
        minW={compact ? '140px' : '160px'}
        height={compact ? '28px' : '32px'}
        borderRadius="md"
        bg="surface.sunken"
        borderWidth="1px"
        borderColor="border.subtle"
        data-testid="label-filter-loading"
        role="status"
        aria-label="Loading label filter"
      />
    )
  }

  if (labelOptions.length === 0) {
    return null
  }

  // Determine sizing based on compact prop
  const selectSize = compact ? 'xs' : 'sm'
  const triggerMinW = compact ? '140px' : '160px'
  const triggerWidth = compact
    ? ({ base: '100%', sm: '140px' } as const)
    : ({ base: '100%', sm: '160px' } as const)

  return (
    <Box
      position="relative"
      display="flex"
      alignItems="center"
      gap="2"
      flex={{ base: '1 1 100%', sm: '0 0 auto' }}
      minW={{ base: '100%', sm: 'auto' }}
    >
      <Select.Root
        collection={collection}
        value={value}
        onValueChange={(details) => {
          onChange(details.value)
        }}
        multiple
        size={selectSize}
        data-testid="label-filter"
      >
        <Select.HiddenSelect />
        <Select.Label
          position="absolute"
          width="1px"
          height="1px"
          overflow="hidden"
          clipPath="inset(50%)"
          whiteSpace="nowrap"
        >
          Filter by label
        </Select.Label>
        <Select.Control minW={0} maxW="100%" w={triggerWidth}>
          <Select.Trigger
            borderColor={value.length > 0 ? 'brand.green' : undefined}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.green',
              outlineOffset: '2px',
              borderColor: 'brand.green',
            }}
            outline={value.length > 0 ? '1px solid' : undefined}
            outlineColor={value.length > 0 ? 'brand.green' : undefined}
            borderWidth="1px"
            w="100%"
            minW={0}
            color="fg.brand"
            {...(value.length > 0 ? { 'data-active': '' } : {})}
          >
            {value.length > 0 ? (
              <Flex alignItems="center" gap="1.5" minW={0} maxW="100%">
                <Box
                  as="span"
                  fontSize="sm"
                  minW={0}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title={value.length === 1 ? value[0] : undefined}
                >
                  {value.length === 1 ? value[0] : `${value.length} Labels`}
                </Box>
                <Badge
                  size="sm"
                  variant="solid"
                  bg="brand.green"
                  color="white"
                  borderRadius="full"
                  px="1.5"
                  fontSize="2xs"
                  lineHeight="1"
                  minH="auto"
                  flexShrink={0}
                >
                  {value.length}
                </Badge>
              </Flex>
            ) : (
              <Select.ValueText placeholder="All Labels" />
            )}
          </Select.Trigger>
          <Select.IndicatorGroup>
            {value.length > 0 && <Select.ClearTrigger />}
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content
            maxH="320px"
            overflowY="auto"
            bg="surface.raised"
            borderColor="border.subtle"
          >
            {collection.items.map((item) => {
              const labelColor = getLabelColor(item.value)
              return (
                <Select.Item
                  item={item}
                  key={item.value}
                  _highlighted={{ bg: 'brand.greenLight', color: 'brand.gray' }}
                  _selected={{ bg: 'brand.greenLight', color: 'brand.greenAccessible' }}
                  data-testid="label-filter-option"
                >
                  <Flex alignItems="center" gap="2" width="100%">
                    <Box
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg={labelColor.dot}
                      flexShrink={0}
                    />
                    <Box as="span" flex="1">
                      {item.label}
                    </Box>
                    <Box as="span" fontSize="xs" color="fg.brandMuted">
                      {item.count}
                    </Box>
                  </Flex>
                  <Select.ItemIndicator />
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>

      {/* ARIA live region for screen reader announcements */}
      <Box
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        position="absolute"
        width="1px"
        height="1px"
        overflow="hidden"
        clipPath="inset(50%)"
        whiteSpace="nowrap"
      />
    </Box>
  )
})
LabelFilter.displayName = 'LabelFilter'
