import type { ReactNode } from 'react'
import { Box } from '@chakra-ui/react'

/**
 * Escape special regex characters so user-provided tokens can be
 * used inside a RegExp safely (no injection).
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split `text` by matching `tokens` (case-insensitive) and wrap each
 * match in a `<mark>` element with a subtle highlight background.
 *
 * Returns the original text unchanged when `tokens` is empty.
 *
 * **Safety:** All tokens are regex-escaped before building the pattern.
 */
export function highlightText(text: string, tokens: string[]): ReactNode {
  if (tokens.length === 0 || text.length === 0) {
    return text
  }

  // Build a single alternation pattern for all tokens, longest first to
  // avoid partial matches shadowing longer ones.
  const sorted = [...tokens].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`(${sorted.map(escapeRegex).join('|')})`, 'gi')

  const parts = text.split(pattern)

  if (parts.length === 1) {
    // No matches found
    return text
  }

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = tokens.some(
          (token) => part.toLowerCase() === token.toLowerCase(),
        )
        if (isMatch) {
          return (
            <Box
              as="mark"
              key={index}
              bg="yellow.100"
              color="inherit"
              px="0.5"
              borderRadius="sm"
            >
              {part}
            </Box>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

/**
 * Tokenize a search query string into individual search terms.
 *
 * - Trims leading/trailing whitespace
 * - Splits on whitespace
 * - Filters out empty tokens
 */
export function tokenizeQuery(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean)
}
