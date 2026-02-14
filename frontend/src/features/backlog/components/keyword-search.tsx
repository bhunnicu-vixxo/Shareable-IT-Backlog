import { Box, IconButton, Input } from '@chakra-ui/react'
import { Search } from 'lucide-react'

export interface KeywordSearchProps {
  /** Current search value (controlled) */
  value: string
  /** Called when the user types in the search box */
  onChange: (value: string) => void
  /** Called when the user clicks the clear button */
  onClear: () => void
  /** Placeholder text shown when input is empty */
  placeholder?: string
}

/**
 * Accessible keyword search input with search icon and clear button.
 *
 * - Uses `role="searchbox"` for screen-reader discoverability.
 * - Visually-hidden label "Search backlog items".
 * - Clear button appears only when the input has a value.
 * - Search icon provides visual affordance.
 * - Focus indicator uses Vixxo Green (`brand.green`).
 */
export function KeywordSearch({
  value,
  onChange,
  onClear,
  placeholder = 'Search items…',
}: KeywordSearchProps) {
  return (
    <Box position="relative" w="full">
      {/* Visually-hidden label for screen readers */}
      <label
        htmlFor="backlog-search-input"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        Search backlog items
      </label>
      {/* Search icon */}
      <Box
        position="absolute"
        left="2.5"
        top="50%"
        transform="translateY(-50%)"
        color="fg.brandMuted"
        pointerEvents="none"
        zIndex="1"
      >
        <Search size={14} />
      </Box>
      <Input
        id="backlog-search-input"
        role="searchbox"
        aria-label="Search backlog items"
        type="search"
        size="sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            onClear()
          }
        }}
        pl="8"
        pr={value ? '8' : undefined}
        borderRadius="lg"
        bg="surface.sunken"
        color="fg.brand"
        borderColor="border.subtle"
        _placeholder={{ color: 'fg.brandMuted' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'brand.green',
          outlineOffset: '2px',
          borderColor: 'brand.green',
          bg: 'surface.raised',
        }}
      />
      {value && (
        <IconButton
          aria-label="Clear search input"
          size="xs"
          variant="ghost"
          color="fg.brandMuted"
          position="absolute"
          right="1"
          top="50%"
          transform="translateY(-50%)"
          onClick={onClear}
          zIndex="1"
          minW="auto"
          h="auto"
          p="1"
        >
          ✕
        </IconButton>
      )}
    </Box>
  )
}
