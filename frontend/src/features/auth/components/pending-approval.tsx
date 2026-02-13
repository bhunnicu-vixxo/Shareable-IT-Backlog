import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { Clock } from 'lucide-react'

interface PendingApprovalProps {
  onCheckStatus: () => void
  email?: string
}

/**
 * Full-page "Pending Approval" display shown to identified but unapproved users.
 * Provides a "Check Status" button to re-check approval status.
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
      bg="bg"
    >
      <VStack gap={6} maxW="480px" textAlign="center" p={8}>
        <Box color="fg.muted">
          <Clock size={64} aria-hidden="true" />
        </Box>

        <Heading as="h1" size="xl">
          Access Pending Approval
        </Heading>

        <VStack gap={2}>
          <Text color="fg.muted" fontSize="md">
            Your account has been submitted for admin review.
            You&apos;ll gain access once an administrator approves your request.
          </Text>
          {email && (
            <Text color="fg.muted" fontSize="sm">
              Signed in as <strong>{email}</strong>
            </Text>
          )}
        </VStack>

        <Button
          onClick={onCheckStatus}
          colorPalette="blue"
          variant="outline"
        >
          Check Status
        </Button>
      </VStack>
    </Box>
  )
}
