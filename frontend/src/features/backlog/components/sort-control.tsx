import { useMemo } from 'react'
import { Flex, IconButton, Select, createListCollection } from '@chakra-ui/react'

export type SortField = 'priority' | 'dateCreated' | 'dateUpdated' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface SortControlProps {
  /** Currently active sort field */
  sortBy: SortField
  /** Current sort direction */
  sortDirection: SortDirection
  /** Called when the user selects a different sort field */
  onSortByChange: (field: SortField) => void
  /** Called when the user toggles sort direction */
  onSortDirectionChange: (dir: SortDirection) => void
}

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: 'Priority', value: 'priority' },
  { label: 'Date Created', value: 'dateCreated' },
  { label: 'Date Updated', value: 'dateUpdated' },
  { label: 'Status', value: 'status' },
]

/**
 * Sort control with a field selector dropdown and a direction toggle button.
 *
 * - Uses Chakra UI v3 Select with a list collection for sort field selection.
 * - Arrow button toggles ascending / descending.
 * - Visually-hidden label "Sort backlog items" for screen readers.
 * - Focus indicator uses Vixxo Green (`brand.green`).
 */
export function SortControl({
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionChange,
}: SortControlProps) {
  const collection = useMemo(
    () => createListCollection({ items: SORT_OPTIONS }),
    [],
  )

  return (
    <Flex alignItems="center" gap="1">
      <Select.Root
        collection={collection}
        value={[sortBy]}
        onValueChange={(details) => {
          const selected = details.value[0] as SortField | undefined
          if (selected && selected !== sortBy) {
            onSortByChange(selected)
          }
        }}
        size="sm"
        data-testid="sort-control"
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
          Sort backlog items
        </Select.Label>
        <Select.Control>
          <Select.Trigger
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.green',
              outlineOffset: '2px',
              borderColor: 'brand.green',
            }}
            borderWidth="1px"
            minW="160px"
          >
            <Select.ValueText placeholder="Sort by" />
          </Select.Trigger>
          <Select.IndicatorGroup>
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

      <IconButton
        aria-label={sortDirection === 'asc' ? 'Sort descending' : 'Sort ascending'}
        size="sm"
        variant="outline"
        onClick={() =>
          onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')
        }
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'brand.green',
          outlineOffset: '2px',
          borderColor: 'brand.green',
        }}
      >
        {sortDirection === 'asc' ? '↑' : '↓'}
      </IconButton>
    </Flex>
  )
}
