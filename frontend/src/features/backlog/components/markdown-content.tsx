import { Box, Link, Text } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

export interface MarkdownContentProps {
  content: string
}

/**
 * Shared markdown renderer for item descriptions and comments.
 *
 * Extracted to avoid circular imports between comment/thread and modal components.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <Box fontSize="sm" color="gray.700">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => (
            <Text as="p" mb="2" whiteSpace="pre-wrap">
              {children}
            </Text>
          ),
          strong: ({ children }) => (
            <Text as="strong" fontWeight="600">
              {children}
            </Text>
          ),
          a: ({ href, children }) => (
            <Link
              href={href ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              color="brand.green"
              textDecoration="underline"
              _hover={{ textDecoration: 'none' }}
            >
              {children}
            </Link>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}

