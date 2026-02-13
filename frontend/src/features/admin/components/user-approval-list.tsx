import { Box, Button, Heading, Skeleton, Text, VStack, HStack, Badge } from '@chakra-ui/react'
import { usePendingUsers } from '../hooks/use-pending-users'
import { useApproveUser } from '../hooks/use-approve-user'
import { useState } from 'react'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Skeleton placeholder for the user approval list.
 * Renders 3 card skeletons matching the approval card layout:
 * name/email text + approve button area (no avatar — real cards have none).
 */
export function UserApprovalListSkeleton() {
  return (
    <VStack gap={3} align="stretch" data-testid="user-approval-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <Box key={i} p={4} borderWidth="1px" borderRadius="md" bg="bg.subtle">
          <HStack justify="space-between" align="center">
            <VStack gap={1} align="start" flex="1">
              <Skeleton height="5" width="50%" />
              <Skeleton height="4" width="65%" />
            </VStack>
            <Skeleton height="8" width="80px" borderRadius="md" />
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}

/**
 * Admin component showing a list of pending users with approve buttons.
 */
export function UserApprovalList() {
  const { pendingUsers, isLoading, error } = usePendingUsers()
  const { approveUser, isApproving } = useApproveUser()
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleApprove = async (userId: number, email: string) => {
    setApprovingId(userId)
    setSuccessMessage(null)
    try {
      await approveUser(userId)
      setSuccessMessage(`${email} has been approved`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <VStack gap={4} align="stretch">
        <HStack justify="space-between">
          <Heading as="h2" size="md">User Approval Requests</Heading>
          <Badge colorPalette={pendingUsers.length > 0 ? 'orange' : 'green'}>
            {pendingUsers.length} pending
          </Badge>
        </HStack>

        {successMessage && (
          <Text color="fg.success" fontSize="sm" role="alert">
            ✓ {successMessage}
          </Text>
        )}

        {isLoading && <UserApprovalListSkeleton />}

        {error && (
          <Text color="fg.error" fontSize="sm">
            Failed to load pending users: {error.message}
          </Text>
        )}

        {!isLoading && !error && pendingUsers.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            No pending approval requests
          </Text>
        )}

        {pendingUsers.map((user) => (
          <Box
            key={user.id}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg="bg.subtle"
          >
            <HStack justify="space-between" align="center">
              <VStack gap={1} align="start">
                <Text fontWeight="medium">{user.email}</Text>
                <Text color="fg.muted" fontSize="xs">
                  {user.displayName && `${user.displayName} · `}
                  Requested {formatDate(user.createdAt)}
                </Text>
              </VStack>
              <Button
                size="sm"
                colorPalette="green"
                onClick={() => handleApprove(user.id, user.email)}
                loading={isApproving && approvingId === user.id}
                disabled={isApproving}
                aria-label={`Approve ${user.email}`}
              >
                Approve
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
