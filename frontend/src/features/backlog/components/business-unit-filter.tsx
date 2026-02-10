import { useMemo } from 'react'
import { Select, createListCollection } from '@chakra-ui/react'
import type { BacklogItem } from '../types/backlog.types'

export interface BusinessUnitFilterProps {
  /** Full (unfiltered) list of backlog items to extract unique business units from */
  items: BacklogItem[]
  /** Currently selected business unit name, or null for "all" */
  value: string | null
  /** Called when user changes the filter. null = show all items */
  onChange: (value: string | null) => void
}

const ALL_VALUE = '__all__'

/**
 * Filter dropdown that extracts unique business units (teamName) from
 * the provided items and allows filtering by a single business unit.
 *
 * Uses Chakra UI v3 Select with a list collection.
 * Vixxo Green active state indicates when a filter is applied.
 */
export function BusinessUnitFilter({ items, value, onChange }: BusinessUnitFilterProps) {
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

  return (
    <Select.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => {
        const selected = details.value[0]
        onChange(selected === ALL_VALUE || !selected ? null : selected)
      }}
      size="sm"
      data-testid="business-unit-filter"
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
          boxShadow={value ? '0 0 0 1px var(--chakra-colors-brand-green)' : undefined}
          borderWidth="1px"
          minW="200px"
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
            <Select.Item item={item} key={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
