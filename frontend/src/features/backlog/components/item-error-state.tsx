import { Alert, Box, Button, Flex, VStack } from '@chakra-ui/react'

export interface ItemErrorStateProps {
  /** Callback to retry fetching the item (TanStack Query refetch). */
  onRetry: () => void
  /** Callback to close the modal. */
  onClose: () => void
}

/**
 * Error display for non-404 errors (network failures, server errors, etc.).
 *
 * Shows a user-friendly message explaining a temporary problem,
 * with a "Try Again" primary button and a "Close" secondary button.
 *
 * Uses Chakra UI Alert with status="error" — this is a genuine failure,
 * not an expected condition.
 */
export function ItemErrorState({ onRetry, onClose }: ItemErrorStateProps) {
  return (
    <VStack gap="6" py="8" align="center">
      <Alert.Root
        status="error"
        variant="subtle"
        borderRadius="md"
        maxW="md"
        role="alert"
        aria-live="assertive"
      >
        <Alert.Indicator />
        <Box>
          <Alert.Title fontWeight="semibold">
            Unable to load this item
          </Alert.Title>
          <Alert.Description mt="1" fontSize="sm">
            A temporary problem prevented loading. Please try again.
          </Alert.Description>
        </Box>
      </Alert.Root>

      <Flex gap="3">
        <Button
          onClick={onRetry}
          colorPalette="red"
          variant="solid"
          size="md"
        >
          Try Again
        </Button>
        <Button
          onClick={onClose}
          colorPalette="gray"
          variant="outline"
          size="md"
        >
          Close
        </Button>
      </Flex>
    </VStack>
  )
}
