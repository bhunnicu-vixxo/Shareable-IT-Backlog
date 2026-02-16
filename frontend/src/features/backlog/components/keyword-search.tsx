import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Input, Kbd } from '@chakra-ui/react'
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

const FOCUSABLE_TAGS = new Set(['input', 'textarea', 'select'])
const OPEN_DIALOG_SELECTOR =
  '[data-scope="dialog"][data-state="open"],[data-scope="dialog"][data-part="backdrop"][data-state="open"],[data-scope="dialog"][data-part="content"][data-state="open"]'

/**
 * Accessible keyword search input with search icon and clear button.
 *
 * - Uses `role="searchbox"` for screen-reader discoverability.
 * - Visually-hidden label "Search backlog items".
 * - Clear button appears only when the input has a value.
 * - Search icon provides visual affordance.
 * - Focus indicator uses Vixxo Green (`brand.green`).
 * - Press `/` from anywhere on the page to focus the search input.
 * - Press `Escape` to blur the search input (and clear if value exists).
 */
export function KeywordSearch({
  value,
  onChange,
  onClear,
  placeholder = 'Search items…',
}: KeywordSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    function handleSlashShortcut(e: KeyboardEvent) {
      if (e.key !== '/') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.repeat) return

      const active = document.activeElement
      if (active instanceof HTMLElement) {
        // Guard against hijacking while user is typing in rich text / contenteditable regions.
        // Use both `isContentEditable` and attribute checks for robustness (jsdom + nested editable nodes).
        if (active.isContentEditable) return
        const contentEditableAttr = active.getAttribute('contenteditable')
        if (contentEditableAttr !== null && contentEditableAttr !== 'false') return
        if (active.closest('[contenteditable]:not([contenteditable="false"])')) return
      }
      const tag = active?.tagName?.toLowerCase() ?? ''
      if (FOCUSABLE_TAGS.has(tag)) return

      if (document.querySelector(OPEN_DIALOG_SELECTOR)) return

      e.preventDefault()
      inputRef.current?.focus()
    }

    document.addEventListener('keydown', handleSlashShortcut)
    return () => document.removeEventListener('keydown', handleSlashShortcut)
  }, [])

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
        ref={inputRef}
        id="backlog-search-input"
        role="searchbox"
        aria-label="Search backlog items"
        type="search"
        size="sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            if (value) onClear()
            inputRef.current?.blur()
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        pl="8"
        pr={value ? '8' : '7'}
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
      {/* Shortcut hint — hidden when focused or when value present */}
      {!isFocused && !value && (
        <Box
          position="absolute"
          right="2"
          top="50%"
          transform="translateY(-50%)"
          pointerEvents="none"
          zIndex="1"
          aria-hidden="true"
        >
          <Kbd
            fontSize="2xs"
            px="1.5"
            py="0"
            borderRadius="sm"
            bg="surface.sunken"
            color="fg.brandMuted"
            borderWidth="1px"
            borderColor="border.subtle"
            opacity={0.6}
          >
            /
          </Kbd>
        </Box>
      )}
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
