import { Box, Flex } from '@chakra-ui/react'
import { AppHeader } from './app-header'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Main application layout wrapper.
 *
 * Renders the shared AppHeader at the top with page content below.
 * Used for all authenticated routes.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Flex direction="column" minH="100vh">
      <AppHeader />
      <Box as="main" flex="1">
        {children}
      </Box>
    </Flex>
  )
}
