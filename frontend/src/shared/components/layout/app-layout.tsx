import { Box, Flex } from '@chakra-ui/react'
import { AppHeader } from './app-header'
import { SkipLink } from './skip-link'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Main application layout wrapper.
 *
 * Renders a skip navigation link (for keyboard users), the shared
 * AppHeader at the top, and page content below.
 * Used for all authenticated routes.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Flex direction="column" minH="100vh">
      <SkipLink />
      <AppHeader />
      <Box as="main" flex="1" id="main-content" tabIndex={-1}>
        {children}
      </Box>
    </Flex>
  )
}
