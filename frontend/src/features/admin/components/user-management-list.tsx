import { useState } from 'react'
import { Box, Badge, Button, Heading, HStack, Input, Skeleton, Text, VStack } from '@chakra-ui/react'
import { useAllUsers, type ManagedUser } from '../hooks/use-all-users'
import { useToggleUserStatus } from '../hooks/use-toggle-user-status'
import { useToggleITRole } from '../hooks/use-toggle-it-role'
import { useRemoveUser } from '../hooks/use-remove-user'
import { useToggleAdminRole } from '../hooks/use-toggle-admin-role'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog'
import { toaster } from '@/components/ui/toaster'
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

type ConfirmAction =
  | { type: 'disable'; userId: number; email: string }
  | { type: 'enable'; userId: number; email: string }
  | { type: 'remove'; userId: number; email: string }
  | { type: 'promote'; userId: number; email: string }
  | { type: 'demote'; userId: number; email: string }

function getConfirmDialogProps(action: ConfirmAction) {
  switch (action.type) {
    case 'disable':
      return {
        title: 'Disable User',
        body: `Are you sure you want to disable ${action.email}? They will no longer be able to access the application.`,
        confirmLabel: 'Disable',
        confirmColorPalette: 'red',
      }
    case 'enable':
      return {
        title: 'Enable User',
        body: `Are you sure you want to re-enable ${action.email}? They will regain access to the application.`,
        confirmLabel: 'Enable',
        confirmColorPalette: 'green',
      }
    case 'remove':
      return {
        title: 'Permanently Remove User',
        body: `Permanently remove ${action.email}? This action cannot be undone. All user data will be deleted.`,
        confirmLabel: 'Remove Permanently',
        confirmColorPalette: 'red',
      }
    case 'promote':
      return {
        title: 'Promote to Admin',
        body: `Are you sure you want to promote ${action.email} to admin? They will gain full administrative privileges including user management and system configuration.`,
        confirmLabel: 'Promote to Admin',
        confirmColorPalette: 'blue',
      }
    case 'demote':
      return {
        title: 'Demote from Admin',
        body: `Are you sure you want to demote ${action.email} from admin? They will lose all administrative privileges.`,
        confirmLabel: 'Demote from Admin',
        confirmColorPalette: 'red',
      }
  }
}

/**
 * Skeleton placeholder for the user management table.
 */
export function UserManagementListSkeleton() {
  return (
    <VStack gap={3} align="stretch" data-testid="user-management-skeleton">
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
 * disable/enable, remove, and promote/demote admin actions with confirmation dialogs.
 */
export function UserManagementList() {
  const { users, isLoading, error } = useAllUsers()
  const { toggleStatus, isToggling } = useToggleUserStatus()
  const { toggleITRole, isToggling: isTogglingIT } = useToggleITRole()
  const { removeUser, isRemoving } = useRemoveUser()
  const { toggleAdminRole, isToggling: isTogglingAdmin } = useToggleAdminRole()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const isMutating = isToggling || isTogglingIT || isRemoving || isTogglingAdmin

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return u.email.toLowerCase().includes(q) || (u.displayName?.toLowerCase().includes(q) ?? false)
  })

  const showSuccess = (title: string, description: string) => {
    toaster.create({ title, description, type: 'success', duration: 3000 })
  }

  const showError = (title: string, description: string) => {
    toaster.create({ title, description, type: 'error', duration: null })
  }

  const handleToggleIT = async (userId: number, email: string, currentIsIT: boolean) => {
    setTogglingId(userId)
    try {
      await toggleITRole({ userId, isIT: !currentIsIT })
      showSuccess(
        'IT role updated',
        `${email} IT role ${!currentIsIT ? 'granted' : 'revoked'}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update IT role'
      showError('IT role update failed', message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirm = async () => {
    if (!confirmAction) return
    setTogglingId(confirmAction.userId)
    try {
      switch (confirmAction.type) {
        case 'disable':
          await toggleStatus({ userId: confirmAction.userId, action: 'disable' })
          showSuccess('User disabled', `${confirmAction.email} has been disabled`)
          break
        case 'enable':
          await toggleStatus({ userId: confirmAction.userId, action: 'enable' })
          showSuccess('User enabled', `${confirmAction.email} has been enabled`)
          break
        case 'remove':
          await removeUser(confirmAction.userId)
          showSuccess('User removed', `${confirmAction.email} has been permanently removed`)
          break
        case 'promote':
          await toggleAdminRole({ userId: confirmAction.userId, isAdmin: true })
          showSuccess('Admin role updated', `${confirmAction.email} has been promoted to admin`)
          break
        case 'demote':
          await toggleAdminRole({ userId: confirmAction.userId, isAdmin: false })
          showSuccess('Admin role updated', `${confirmAction.email} has been demoted from admin`)
          break
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${confirmAction.type} user`
      showError('Action failed', message)
    } finally {
      setTogglingId(null)
      setConfirmAction(null)
    }
  }

  const isConfirmLoading = confirmAction !== null && (
    (confirmAction.type === 'disable' || confirmAction.type === 'enable') ? isToggling :
    confirmAction.type === 'remove' ? isRemoving :
    isTogglingAdmin
  )

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
                {/* IT role toggle for approved, non-disabled, non-admin users */}
                {user.isApproved && !user.isDisabled && !user.isAdmin && (
                  <Button
                    size="sm"
                    colorPalette="purple"
                    variant={user.isIT ? 'solid' : 'outline'}
                    onClick={() => handleToggleIT(user.id, user.email, user.isIT)}
                    loading={(isTogglingIT) && togglingId === user.id}
                    disabled={isMutating}
                    aria-label={user.isIT ? `Revoke IT role from ${user.email}` : `Grant IT role to ${user.email}`}
                  >
                    {user.isIT ? 'Revoke IT' : 'Grant IT'}
                  </Button>
                )}

                {/* Promote/Demote Admin for approved, non-disabled users (not visible for self) */}
                {user.isApproved && !user.isDisabled && user.id !== currentUser?.id && (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant={user.isAdmin ? 'solid' : 'outline'}
                    onClick={() => setConfirmAction({
                      type: user.isAdmin ? 'demote' : 'promote',
                      userId: user.id,
                      email: user.email,
                    })}
                    loading={isTogglingAdmin && togglingId === user.id}
                    disabled={isMutating}
                    aria-label={user.isAdmin ? `Demote ${user.email} from admin` : `Promote ${user.email} to admin`}
                  >
                    {user.isAdmin ? 'Demote Admin' : 'Make Admin'}
                  </Button>
                )}

                {/* Disable for approved (non-disabled) users, except current admin */}
                {user.isApproved && !user.isDisabled && user.id !== currentUser?.id && (
                  <Button
                    size="sm"
                    colorPalette="red"
                    variant="outline"
                    onClick={() => setConfirmAction({
                      type: 'disable',
                      userId: user.id,
                      email: user.email,
                    })}
                    loading={isToggling && togglingId === user.id}
                    disabled={isMutating}
                    aria-label={`Disable ${user.email}`}
                  >
                    Disable
                  </Button>
                )}

                {/* Enable for disabled users */}
                {user.isDisabled && (
                  <Button
                    size="sm"
                    colorPalette="green"
                    variant="outline"
                    onClick={() => setConfirmAction({
                      type: 'enable',
                      userId: user.id,
                      email: user.email,
                    })}
                    loading={isToggling && togglingId === user.id}
                    disabled={isMutating}
                    aria-label={`Enable ${user.email}`}
                  >
                    Enable
                  </Button>
                )}

                {/* Remove for disabled users (permanent deletion) */}
                {user.isDisabled && user.id !== currentUser?.id && (
                  <Button
                    size="sm"
                    colorPalette="red"
                    onClick={() => setConfirmAction({
                      type: 'remove',
                      userId: user.id,
                      email: user.email,
                    })}
                    loading={isRemoving && togglingId === user.id}
                    disabled={isMutating}
                    aria-label={`Remove ${user.email}`}
                  >
                    Remove
                  </Button>
                )}
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>

      {confirmAction && (
        <ConfirmationDialog
          {...getConfirmDialogProps(confirmAction)}
          isOpen={true}
          isLoading={isConfirmLoading}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </Box>
  )
}
