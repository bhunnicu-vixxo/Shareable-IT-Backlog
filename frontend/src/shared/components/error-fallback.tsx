import { useState } from 'react'
import { Box, Button, Code, Heading, Text, VStack } from '@chakra-ui/react'

export interface ErrorFallbackProps {
  /** The caught error (optional — shown in collapsible technical details). */
  error?: Error | null
  /** Callback to reset the error boundary and retry rendering. */
  resetError: () => void
  /** Custom heading text. */
  title?: string
  /** Custom description text. */
  message?: string
}

/**
 * Reusable fallback component for ErrorBoundary.
 *
 * Vixxo branded: Gray (#3E4543) heading, Teal (#2C7B80) button.
 * Provides a user-friendly error display with a "Try Again" action.
 * Optionally shows technical error details in a collapsible section.
 */
export function ErrorFallback({
  error,
  resetError,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again, or contact support if the problem persists.',
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Box
      role="alert"
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="60vh"
      px={6}
    >
      <VStack gap={5} maxW="md" textAlign="center">
        <Text fontSize="4xl" aria-hidden="true">
          ⚠️
        </Text>
        <Heading
          size="lg"
          color="brand.gray"
          data-testid="error-fallback-title"
        >
          {title}
        </Heading>
        <Text color="fg.muted" fontSize="md" data-testid="error-fallback-message">
          {message}
        </Text>
        <Button
          onClick={resetError}
          colorPalette="teal"
          size="lg"
          data-testid="error-fallback-retry"
        >
          Try Again
        </Button>
        {error && (
          <Box textAlign="left" w="full">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowDetails((v) => !v)}
              data-testid="error-fallback-toggle-details"
            >
              {showDetails ? 'Hide' : 'Show'} technical details
            </Button>
            {showDetails && (
              <Code
                display="block"
                whiteSpace="pre-wrap"
                p={3}
                mt={2}
                fontSize="xs"
                borderRadius="md"
                data-testid="error-fallback-details"
              >
                {error.message}
              </Code>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  )
}
