import { memo, useEffect, useMemo, useRef } from 'react'
import { Box, Select, Text, createListCollection } from '@chakra-ui/react'
import type { BacklogItem } from '../types/backlog.types'

export interface BusinessUnitFilterProps {
  /** Full (unfiltered) list of backlog items to extract unique business units from */
  items: BacklogItem[]
  /** Currently selected business unit name, or null for "all" */
  value: string | null
  /** Called when user changes the filter. null = show all items */
  onChange: (value: string | null) => void
  /** Optional count of filtered results to display beside the trigger */
  resultCount?: number
  /** When true, renders a compact variant with reduced sizing for tight layouts */
  compact?: boolean
}

const ALL_VALUE = '__all__'

/**
 * Filter dropdown that extracts unique business units (teamName) from
 * the provided items and allows filtering by a single business unit.
 *
 * Uses Chakra UI v3 Select with a list collection.
 * Vixxo Green active state indicates when a filter is applied.
 * Includes ARIA live region for screen reader announcements.
 */
export const BusinessUnitFilter = memo(function BusinessUnitFilter({
  items,
  value,
  onChange,
  resultCount,
  compact = false,
}: BusinessUnitFilterProps) {
  const businessUnits = useMemo(() => {
    const uniqueTeams = [...new Set(items.map((item) => item.teamName))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
    return [
      { label: 'All Business Units', value: ALL_VALUE },
      ...uniqueTeams.map((team) => ({ label: team, value: team })),
    ]
  }, [items])

  const collection = useMemo(
    () => createListCollection({ items: businessUnits }),
    [businessUnits],
  )

  // ARIA live region announcement (Task 3)
  // - No announcement on initial mount
  // - When value changes, write directly to the live region (no setState-in-effect)
  const isInitialMount = useRef(true)
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const text = value ? `Filtered to ${value}` : 'Filter cleared, showing all business units'
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = text
    }
  }, [value])

  // Determine sizing based on compact prop (Task 5)
  const triggerMinW = compact ? '140px' : '200px'
  const selectSize = compact ? 'xs' : 'sm'

  return (
    <Box position="relative" display="inline-flex" alignItems="center" gap="2">
      <Select.Root
        collection={collection}
        value={value ? [value] : []}
        onValueChange={(details) => {
          const selected = details.value[0]
          const nextValue = selected === ALL_VALUE || !selected ? null : selected
          onChange(nextValue)
        }}
        size={selectSize}
        data-testid="business-unit-filter"
        data-compact={compact || undefined}
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
          Filter by business unit
        </Select.Label>
        <Select.Control>
          <Select.Trigger
            borderColor={value ? 'brand.green' : undefined}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.green',
              outlineOffset: '2px',
              borderColor: 'brand.green',
            }}
            outline={value ? '1px solid' : undefined}
            outlineColor={value ? 'brand.green' : undefined}
            borderWidth="1px"
            minW={triggerMinW}
            {...(value ? { 'data-active': '' } : {})}
          >
            <Select.ValueText placeholder="All Business Units" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.ClearTrigger />
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item) => (
              <Select.Item
                item={item}
                key={item.value}
                _highlighted={{ bg: 'brand.greenLight', color: 'brand.gray' }}
                _selected={{ bg: 'brand.greenLight', color: 'brand.greenAccessible' }}
                data-testid="business-unit-option"
              >
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>

      {/* Result count display (Task 4) - hidden in compact mode */}
      {resultCount !== undefined && !compact && (
        <Text
          fontSize="sm"
          color="brand.grayLight"
          data-testid="business-unit-result-count"
        >
          Showing {resultCount} {resultCount === 1 ? 'item' : 'items'}
        </Text>
      )}

      {/* ARIA live region for screen reader announcements (Task 3) */}
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
      >
      </Box>
    </Box>
  )
})
BusinessUnitFilter.displayName = 'BusinessUnitFilter'
