import { Alert, Box, Button, VStack } from '@chakra-ui/react'

export interface ItemNotFoundStateProps {
  /** Callback to close the modal and return to the backlog list. */
  onClose: () => void
}

/**
 * Error display for 404 / deleted / missing items.
 *
 * Shows a user-friendly warning explaining the item is no longer available,
 * with a prominent "Close" button to dismiss the modal.
 *
 * Uses Chakra UI Alert with status="warning" — deletion is an expected
 * condition, not a system failure.
 */
export function ItemNotFoundState({ onClose }: ItemNotFoundStateProps) {
  return (
    <VStack gap="6" py="8" align="center">
      <Alert.Root
        status="warning"
        variant="subtle"
        borderRadius="md"
        maxW="md"
        role="status"
        aria-live="polite"
      >
        <Alert.Indicator />
        <Box>
          <Alert.Title fontWeight="semibold">
            This item is no longer available
          </Alert.Title>
          <Alert.Description mt="1" fontSize="sm">
            It may have been removed from the backlog or deleted in Linear.
          </Alert.Description>
        </Box>
      </Alert.Root>

      <Button
        onClick={onClose}
        colorPalette="gray"
        variant="solid"
        size="md"
      >
        Close
      </Button>
    </VStack>
  )
}
