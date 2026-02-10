import { Box, IconButton, Input } from '@chakra-ui/react'

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
 * Accessible keyword search input with a clear button.
 *
 * - Uses `role="searchbox"` for screen-reader discoverability.
 * - Visually-hidden label "Search backlog items".
 * - Clear button appears only when the input has a value.
 * - Focus indicator uses Vixxo Green (`brand.green`).
 */
export function KeywordSearch({
  value,
  onChange,
  onClear,
  placeholder = 'Search…',
}: KeywordSearchProps) {
  return (
    <Box position="relative" minW="180px">
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
        pr={value ? '8' : undefined}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'brand.green',
          outlineOffset: '2px',
          borderColor: 'brand.green',
        }}
      />
      {value && (
        <IconButton
          aria-label="Clear search"
          size="xs"
          variant="ghost"
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
