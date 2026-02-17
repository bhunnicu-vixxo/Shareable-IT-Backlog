import { Box, Button, HStack, IconButton, Text } from '@chakra-ui/react'
import { Link, useLocation } from 'react-router'
import { Moon, Sun, Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useColorMode } from '@/components/ui/color-mode'
import { UnseenBadge } from '@/shared/components/unseen-badge'

/**
 * Shared application header with navigation and user controls.
 *
 * Dark brand header with Vixxo identity. Displays:
 * - App title (links to home/backlog)
 * - Navigation links: "Backlog" (always), "Admin" (admin-only)
 * - User email + "Sign Out" button
 */
export function AppHeader() {
  const { user, isAdmin, logout, isLoggingOut } = useAuth()
  const location = useLocation()
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Box
      as="header"
      bg="surface.headerDark"
      boxShadow="0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)"
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
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <HStack gap={2.5}>
              {/* Brand mark — geometric accent */}
              <Box
                w="8px"
                h="28px"
                borderRadius="2px"
                bg="brand.green"
                flexShrink={0}
              />
              <Text
                fontWeight="800"
                fontSize="lg"
                color="white"
                letterSpacing="-0.03em"
                fontFamily="heading"
              >
                IT Backlog
              </Text>
            </HStack>
          </Link>

          <HStack as="nav" gap={1} aria-label="Main navigation">
            <Link to="/">
              <Box
                px={3}
                py={1.5}
                borderRadius="md"
                bg={location.pathname === '/' ? 'whiteAlpha.150' : 'transparent'}
                transition="background 0.15s"
                _hover={{ bg: 'whiteAlpha.100' }}
              >
                <Text
                  fontSize="sm"
                  fontWeight={location.pathname === '/' ? '600' : '400'}
                  color={location.pathname === '/' ? 'white' : 'whiteAlpha.700'}
                >
                  Backlog
                </Text>
              </Box>
            </Link>

            <Link to="/my-requests">
              <Box
                px={3}
                py={1.5}
                borderRadius="md"
                bg={location.pathname === '/my-requests' ? 'whiteAlpha.150' : 'transparent'}
                transition="background 0.15s"
                _hover={{ bg: 'whiteAlpha.100' }}
              >
                <Text
                  fontSize="sm"
                  fontWeight={location.pathname === '/my-requests' ? '600' : '400'}
                  color={location.pathname === '/my-requests' ? 'white' : 'whiteAlpha.700'}
                >
                  My Requests
                </Text>
              </Box>
            </Link>

            {isAdmin && (
              <Link to="/admin">
                <Box
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  bg={location.pathname === '/admin' ? 'whiteAlpha.150' : 'transparent'}
                  transition="background 0.15s"
                  _hover={{ bg: 'whiteAlpha.100' }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={location.pathname === '/admin' ? '600' : '400'}
                    color={location.pathname === '/admin' ? 'white' : 'whiteAlpha.700'}
                  >
                    Admin
                  </Text>
                </Box>
              </Link>
            )}
          </HStack>

          <UnseenBadge />

          <Link to="/submit-request">
            <Button
              size="xs"
              bg="brand.green"
              color="white"
              _hover={{ bg: 'brand.greenHover' }}
              borderRadius="md"
              fontWeight="600"
            >
              <Plus size={14} />
              Submit Request
            </Button>
          </Link>
        </HStack>

        {/* Right: User info + color mode + sign out */}
        <HStack gap={3} alignSelf={{ base: 'stretch', md: 'auto' }} justify={{ base: 'space-between', md: 'flex-end' }}>
          <Text fontSize="sm" color="whiteAlpha.600" data-testid="user-email">
            {user?.email}
          </Text>
          <IconButton
            aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            size="xs"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
            onClick={toggleColorMode}
            data-testid="color-mode-toggle"
          >
            {colorMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </IconButton>
          <Button
            size="xs"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
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
