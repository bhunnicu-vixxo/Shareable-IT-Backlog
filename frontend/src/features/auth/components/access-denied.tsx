import { Alert, Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { ShieldX } from 'lucide-react'

export interface AccessDeniedProps {
  /** Callback to re-check network access. */
  onRetry: () => void
}

/**
 * Full-page Access Denied component displayed when the user's IP is outside
 * the allowed Vixxo network ranges (HTTP 403 + NETWORK_ACCESS_DENIED).
 *
 * Shows a clear heading, explanation, VPN connection guidance, and a Retry button.
 * Uses Chakra UI with Vixxo brand styling (red/warning palette).
 */
export function AccessDenied({ onRetry }: AccessDeniedProps) {
  return (
    <VStack
      as="main"
      id="main-content"
      minH="100vh"
      justify="center"
      align="center"
      px="6"
      py="12"
      bg="gray.50"
    >
      <VStack
        gap="6"
        maxW="lg"
        textAlign="center"
        bg="white"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="red.200"
        p="10"
        shadow="md"
      >
        <Box color="red.500">
          <ShieldX size={64} aria-hidden="true" />
        </Box>

        <Heading as="h1" size="xl" color="red.600">
          Access Denied
        </Heading>

        <Alert.Root
          status="warning"
          variant="subtle"
          borderRadius="md"
          role="alert"
        >
          <Alert.Indicator />
          <Box>
            <Alert.Title fontWeight="semibold">
              Vixxo Network Required
            </Alert.Title>
            <Alert.Description mt="1" fontSize="sm">
              You must be connected to the Vixxo network or VPN to access this
              application.
            </Alert.Description>
          </Box>
        </Alert.Root>

        <VStack gap="2" color="gray.600" fontSize="sm">
          <Text>
            To access the Shareable IT Backlog, please connect to the Vixxo VPN
            using your company credentials and try again.
          </Text>
          <Text fontStyle="italic" color="gray.500">
            If you believe you are already on the Vixxo network and still see
            this message, please contact IT support.
          </Text>
        </VStack>

        <Button
          onClick={onRetry}
          colorPalette="red"
          variant="solid"
          size="lg"
          mt="2"
        >
          Retry Connection
        </Button>
      </VStack>
    </VStack>
  )
}
