import { useEffect, useRef, useState } from 'react'
import { Box, Badge, Button, Heading, HStack, Input, Skeleton, Text, VStack } from '@chakra-ui/react'
import { useAllUsers, type ManagedUser } from '../hooks/use-all-users'
import { useToggleUserStatus } from '../hooks/use-toggle-user-status'
import { useToggleITRole } from '../hooks/use-toggle-it-role'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatRelativeTime, formatDateOnly } from '@/utils/formatters'

function getStatusBadge(user: ManagedUser) {
  if (user.isDisabled) return <Badge colorPalette="red">Disabled</Badge>
  if (user.isApproved) return <Badge colorPalette="green">Approved</Badge>
  return <Badge colorPalette="orange">Pending</Badge>
}

function getRoleBadge(user: ManagedUser) {
  if (user.isAdmin) return <Badge colorPalette="blue">Admin</Badge>
  if (user.isIT) return <Badge colorPalette="purple">IT</Badge>
  return <Badge colorPalette="gray">User</Badge>
}

/**
 * Skeleton placeholder for the user management table.
 * Renders a header row with 6 column skeletons and 5 data row skeletons
 * matching the real table layout (name, email, role, status, last access, actions).
 */
export function UserManagementListSkeleton() {
  return (
    <VStack gap={3} align="stretch" data-testid="user-management-skeleton">
      {/* Data row skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Box key={i} p={4} borderWidth="1px" borderRadius="md" bg="bg.subtle">
          <HStack justify="space-between" align="center">
            <VStack gap={1} align="start" flex="1">
              <HStack gap={2}>
                <Skeleton height="5" width="40%" />
                <Skeleton height="5" width="60px" borderRadius="full" />
                <Skeleton height="5" width="50px" borderRadius="full" />
              </HStack>
              <Skeleton height="3" width="80%" />
            </VStack>
            <Skeleton height="8" width="70px" borderRadius="md" />
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}

/**
 * Admin component showing a list of ALL users with search, status badges,
 * and disable/enable actions. Coexists with UserApprovalList in the Users tab.
 */
export function UserManagementList() {
  const { users, isLoading, error } = useAllUsers()
  const { toggleStatus, isToggling } = useToggleUserStatus()
  const { toggleITRole, isToggling: isTogglingIT } = useToggleITRole()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const successTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current)
        successTimeoutRef.current = null
      }
    }
  }, [])

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.email.toLowerCase().includes(q) || (u.displayName?.toLowerCase().includes(q) ?? false)
  })

  const handleToggleIT = async (userId: number, email: string, currentIsIT: boolean) => {
    setTogglingId(userId)
    setSuccessMessage(null)
    setActionError(null)
    try {
      await toggleITRole({ userId, isIT: !currentIsIT })
      setSuccessMessage(`${email} IT role ${!currentIsIT ? 'granted' : 'revoked'}`)
      if (successTimeoutRef.current !== null) window.clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update IT role'
      setActionError(message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleToggle = async (userId: number, email: string, action: 'disable' | 'enable') => {
    setTogglingId(userId)
    setSuccessMessage(null)
    setActionError(null)
    try {
      await toggleStatus({ userId, action })
      setSuccessMessage(`${email} has been ${action}d`)
      if (successTimeoutRef.current !== null) window.clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} user`
      setActionError(message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <VStack gap={4} align="stretch">
        <HStack justify="space-between">
          <Heading as="h2" size="md">All Users</Heading>
          <Badge colorPalette="blue">{users.length} total</Badge>
        </HStack>

        <Input
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
          aria-label="Search users by email or name"
          data-testid="user-search-input"
        />

        {successMessage && (
          <Text color="fg.success" fontSize="sm" role="alert">
            ✓ {successMessage}
          </Text>
        )}

        {actionError && (
          <Text color="fg.error" fontSize="sm" role="alert">
            {actionError}
          </Text>
        )}

        {isLoading && <UserManagementListSkeleton />}

        {error && (
          <Text color="fg.error" fontSize="sm">
            Failed to load users: {error.message}
          </Text>
        )}

        {!isLoading && !error && filteredUsers.length === 0 && (
          <Text color="fg.muted" fontSize="sm">
            {searchQuery ? 'No users match your search' : 'No users found'}
          </Text>
        )}

        {filteredUsers.map((user) => (
          <Box
            key={user.id}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg="bg.subtle"
          >
            <HStack justify="space-between" align="center">
              <VStack gap={1} align="start">
                <HStack gap={2}>
                  <Text fontWeight="medium">{user.email}</Text>
                  {getRoleBadge(user)}
                  {getStatusBadge(user)}
                </HStack>
                <Text color="fg.muted" fontSize="xs">
                  {user.displayName && `${user.displayName} · `}
                  {user.approvedAt && `Approved ${formatDateOnly(user.approvedAt)} · `}
                  {user.lastAccessAt ? `Last access ${formatRelativeTime(user.lastAccessAt)}` : 'Never accessed'}
                </Text>
              </VStack>

              <HStack gap={2}>
                {/* IT role toggle for approved, non-admin users */}
                {user.isApproved && !user.isDisabled && !user.isAdmin && (
                  <Button
                    size="sm"
                    colorPalette="purple"
                    variant={user.isIT ? 'solid' : 'outline'}
                    onClick={() => handleToggleIT(user.id, user.email, user.isIT)}
                    loading={(isTogglingIT) && togglingId === user.id}
                    disabled={isToggling || isTogglingIT}
                    aria-label={user.isIT ? `Revoke IT role from ${user.email}` : `Grant IT role to ${user.email}`}
                  >
                    {user.isIT ? 'Revoke IT' : 'Grant IT'}
                  </Button>
                )}

                {/* Show Disable for approved (non-disabled) users, except current admin */}
                {user.isApproved && !user.isDisabled && user.id !== currentUser?.id && (
                  <Button
                    size="sm"
                    colorPalette="red"
                    variant="outline"
                    onClick={() => handleToggle(user.id, user.email, 'disable')}
                    loading={isToggling && togglingId === user.id}
                    disabled={isToggling || isTogglingIT}
                    aria-label={`Disable ${user.email}`}
                  >
                    Disable
                  </Button>
                )}

                {/* Show Enable for disabled users */}
                {user.isDisabled && (
                  <Button
                    size="sm"
                    colorPalette="green"
                    variant="outline"
                    onClick={() => handleToggle(user.id, user.email, 'enable')}
                    loading={isToggling && togglingId === user.id}
                    disabled={isToggling || isTogglingIT}
                    aria-label={`Enable ${user.email}`}
                  >
                    Enable
                  </Button>
                )}

                {/* No action button for pending users - managed via UserApprovalList */}
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
