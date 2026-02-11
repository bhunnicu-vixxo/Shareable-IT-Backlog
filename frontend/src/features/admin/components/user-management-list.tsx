import { useEffect, useRef, useState } from 'react'
import { Box, Badge, Button, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useAllUsers, type ManagedUser } from '../hooks/use-all-users'
import { useToggleUserStatus } from '../hooks/use-toggle-user-status'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatRelativeTime, formatDateOnly } from '@/utils/formatters'

function getStatusBadge(user: ManagedUser) {
  if (user.isDisabled) return <Badge colorPalette="red">Disabled</Badge>
  if (user.isApproved) return <Badge colorPalette="green">Approved</Badge>
  return <Badge colorPalette="orange">Pending</Badge>
}

function getRoleBadge(user: ManagedUser) {
  return user.isAdmin ? (
    <Badge colorPalette="blue">Admin</Badge>
  ) : (
    <Badge colorPalette="gray">User</Badge>
  )
}

/**
 * Admin component showing a list of ALL users with search, status badges,
 * and disable/enable actions. Coexists with UserApprovalList in the Users tab.
 */
export function UserManagementList() {
  const { users, isLoading, error } = useAllUsers()
  const { toggleStatus, isToggling } = useToggleUserStatus()
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
          <Heading size="md">All Users</Heading>
          <Badge colorPalette="blue">{users.length} total</Badge>
        </HStack>

        <Input
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
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

        {isLoading && <Text color="fg.muted">Loading users...</Text>}

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

              {/* Show Disable for approved (non-disabled) users, except current admin */}
              {user.isApproved && !user.isDisabled && user.id !== currentUser?.id && (
                <Button
                  size="sm"
                  colorPalette="red"
                  variant="outline"
                  onClick={() => handleToggle(user.id, user.email, 'disable')}
                  disabled={isToggling}
                  aria-label={`Disable ${user.email}`}
                >
                  {isToggling && togglingId === user.id ? 'Disabling...' : 'Disable'}
                </Button>
              )}

              {/* Show Enable for disabled users */}
              {user.isDisabled && (
                <Button
                  size="sm"
                  colorPalette="green"
                  variant="outline"
                  onClick={() => handleToggle(user.id, user.email, 'enable')}
                  disabled={isToggling}
                  aria-label={`Enable ${user.email}`}
                >
                  {isToggling && togglingId === user.id ? 'Enabling...' : 'Enable'}
                </Button>
              )}

              {/* No action button for pending users - managed via UserApprovalList */}
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
