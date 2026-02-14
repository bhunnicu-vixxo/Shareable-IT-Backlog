import { Alert, Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react'
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
 * Features branded dark background with elevated white card layout.
 * Uses explicit colors for reliable contrast against the dark page.
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
      className="bg-grain"
      bg="linear-gradient(135deg, #2D3331 0%, #3E4543 40%, #4a5553 100%)"
    >
      <VStack
        gap="6"
        maxW="lg"
        textAlign="center"
        bg="white"
        borderRadius="2xl"
        borderWidth="1px"
        borderColor="#FED7D7"
        p="10"
        boxShadow="0 20px 60px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1)"
        className="animate-scale-in"
      >
        <Flex
          alignItems="center"
          justifyContent="center"
          w="16"
          h="16"
          borderRadius="full"
          bg="#FFF5F5"
          boxShadow="0 0 0 6px rgba(229,62,62,0.08)"
        >
          <Box color="#E53E3E">
            <ShieldX size={32} aria-hidden="true" />
          </Box>
        </Flex>

        <Heading as="h1" size="xl" color="#C53030" fontFamily="heading" letterSpacing="-0.02em">
          Access Denied
        </Heading>

        <Alert.Root
          status="warning"
          variant="subtle"
          borderRadius="lg"
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

        <VStack gap="2" color="#718096" fontSize="sm">
          <Text>
            To access the Shareable IT Backlog, please connect to the Vixxo VPN
            using your company credentials and try again.
          </Text>
          <Text fontStyle="italic" color="#A0AEC0">
            If you believe you are already on the Vixxo network and still see
            this message, please contact IT support.
          </Text>
        </VStack>

        <Button
          onClick={onRetry}
          variant="solid"
          colorPalette="red"
          size="lg"
          borderRadius="xl"
          mt="2"
        >
          Retry Connection
        </Button>
      </VStack>
    </VStack>
  )
}
