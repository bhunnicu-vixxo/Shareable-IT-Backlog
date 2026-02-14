import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'

export interface ServiceUnavailableProps {
  /** Callback to trigger a manual retry. */
  onRetry: () => void
  /** Optional custom message override. */
  message?: string
}

/**
 * Full-page component displayed when the backend API is completely unreachable.
 *
 * Shows when consecutive 503 responses or network errors indicate a full outage.
 * Uses Vixxo brand colors: Teal for retry button per brand guidelines.
 */
export function ServiceUnavailable({
  onRetry,
  message = 'The service is temporarily unavailable. This is usually resolved quickly. Please try again in a moment.',
}: ServiceUnavailableProps) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="60vh"
      px={6}
      role="alert"
      aria-live="assertive"
      data-testid="service-unavailable"
    >
      <VStack gap={5} maxW="md" textAlign="center">
        <Text fontSize="5xl" aria-hidden="true">
          🔌
        </Text>
        <Heading
          size="lg"
          color="brand.gray"
          data-testid="service-unavailable-title"
        >
          Service Temporarily Unavailable
        </Heading>
        <Text
          color="fg.muted"
          fontSize="md"
          data-testid="service-unavailable-message"
        >
          {message}
        </Text>
        <Button
          onClick={onRetry}
          colorPalette="teal"
          size="lg"
          data-testid="service-unavailable-retry"
        >
          Retry
        </Button>
      </VStack>
    </Box>
  )
}
