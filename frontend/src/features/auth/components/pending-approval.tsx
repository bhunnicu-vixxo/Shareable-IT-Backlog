import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { Clock } from 'lucide-react'

interface PendingApprovalProps {
  onCheckStatus: () => void
  email?: string
}

/**
 * Full-page "Pending Approval" display shown to identified but unapproved users.
 * Provides a "Check Status" button to re-check approval status.
 * Features branded dark background with centered white card layout.
 */
export function PendingApproval({ onCheckStatus, email }: PendingApprovalProps) {
  return (
    <Box
      as="main"
      id="main-content"
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
      className="bg-grain"
      bg="linear-gradient(135deg, #2D3331 0%, #3E4543 40%, #4a5553 100%)"
    >
      <VStack
        gap={6}
        maxW="480px"
        textAlign="center"
        p={10}
        bg="white"
        borderRadius="2xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1)"
        mx="4"
        className="animate-scale-in"
      >
        <Flex
          alignItems="center"
          justifyContent="center"
          w="16"
          h="16"
          borderRadius="full"
          bg="#E6F6F7"
        >
          <Box color="#2C7B80">
            <Clock size={32} aria-hidden="true" />
          </Box>
        </Flex>

        <Heading as="h1" size="xl" fontFamily="heading" letterSpacing="-0.02em" color="#3E4543">
          Access Pending Approval
        </Heading>

        <VStack gap={2}>
          <Text color="#718096" fontSize="md">
            Your account has been submitted for admin review.
            You&apos;ll gain access once an administrator approves your request.
          </Text>
          {email && (
            <Text color="#718096" fontSize="sm">
              Signed in as <strong>{email}</strong>
            </Text>
          )}
        </VStack>

        <Button
          onClick={onCheckStatus}
          variant="outline"
          size="lg"
          borderRadius="xl"
        >
          Check Status
        </Button>
      </VStack>
    </Box>
  )
}
