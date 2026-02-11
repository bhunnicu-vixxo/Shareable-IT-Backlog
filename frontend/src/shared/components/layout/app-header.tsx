import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/hooks/use-auth'

/**
 * Shared application header with navigation and user controls.
 *
 * Displays:
 * - App title (links to home/backlog)
 * - Navigation links: "Backlog" (always), "Admin" (admin-only)
 * - User email + "Sign Out" button
 */
export function AppHeader() {
  const { user, isAdmin, logout, isLoggingOut } = useAuth()
  const location = useLocation()

  return (
    <Box
      as="header"
      borderBottomWidth="1px"
      borderColor="border.muted"
      px={6}
      py={3}
    >
      <HStack
        justify="space-between"
        align={{ base: 'flex-start', md: 'center' }}
        flexDirection={{ base: 'column', md: 'row' }}
        gap={{ base: 3, md: 0 }}
        maxW="1280px"
        mx="auto"
      >
        {/* Left: App title + nav links */}
        <HStack gap={6} flexWrap={{ base: 'wrap', md: 'nowrap' }}>
          <Text fontWeight="bold" fontSize="lg">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              IT Backlog
            </Link>
          </Text>

          <HStack as="nav" gap={4} aria-label="Main navigation">
            <Link to="/">
              <Text
                fontSize="sm"
                fontWeight={location.pathname === '/' ? 'semibold' : 'normal'}
                color={location.pathname === '/' ? 'fg' : 'fg.muted'}
              >
                Backlog
              </Text>
            </Link>

            {isAdmin && (
              <Link to="/admin">
                <Text
                  fontSize="sm"
                  fontWeight={location.pathname === '/admin' ? 'semibold' : 'normal'}
                  color={location.pathname === '/admin' ? 'fg' : 'fg.muted'}
                >
                  Admin
                </Text>
              </Link>
            )}
          </HStack>
        </HStack>

        {/* Right: User info + sign out */}
        <HStack gap={3} alignSelf={{ base: 'stretch', md: 'auto' }} justify={{ base: 'space-between', md: 'flex-end' }}>
          <Text fontSize="sm" color="fg.muted" data-testid="user-email">
            {user?.email}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => logout()}
            loading={isLoggingOut}
            data-testid="sign-out-button"
          >
            Sign Out
          </Button>
        </HStack>
      </HStack>
    </Box>
  )
}
