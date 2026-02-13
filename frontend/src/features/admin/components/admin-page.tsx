import { Box, Heading, Tabs, Text, VisuallyHidden, VStack } from '@chakra-ui/react'
import { Settings } from 'lucide-react'
import { SyncControl } from './sync-control'
import { UserApprovalList } from './user-approval-list'
import { UserManagementList } from './user-management-list'
import { AuditLogList } from './audit-log-list'

/**
 * Admin dashboard with tabbed navigation.
 *
 * Sections:
 * - Users: Pending user approvals (Story 7.2), full user management (Story 7.4)
 * - Sync: Manual sync trigger + status (Stories 6.2, 6.4), sync history (Story 7.5)
 * - Settings: Placeholder for future system settings
 */
export function AdminPage() {
  return (
    <Box maxW="960px" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="xl">Administration</Heading>

        <VisuallyHidden>Admin dashboard. Use tabs to switch between Users, Sync, Audit Log, and Settings sections.</VisuallyHidden>

        <Tabs.Root defaultValue="users" variant="line">
          <Tabs.List flexWrap={{ base: 'wrap', md: 'nowrap' }} gap={{ base: 2, md: 0 }} aria-label="Admin sections">
            <Tabs.Trigger value="users" data-testid="tab-users">
              Users
            </Tabs.Trigger>
            <Tabs.Trigger value="sync" data-testid="tab-sync">
              Sync
            </Tabs.Trigger>
            <Tabs.Trigger value="audit" data-testid="tab-audit">
              Audit Logs
            </Tabs.Trigger>
            <Tabs.Trigger value="settings" data-testid="tab-settings">
              Settings
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="users">
            <Box pt={4}>
              <VStack gap={6} align="stretch">
                <UserApprovalList />
                <UserManagementList />
              </VStack>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="sync">
            <Box pt={4}>
              <SyncControl />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="audit">
            <Box pt={4}>
              <AuditLogList />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="settings">
            <Box pt={4}>
              <VStack gap={4} py={12} color="fg.muted" align="center">
                <Settings size={48} strokeWidth={1} aria-hidden="true" />
                <Text fontSize="lg" fontWeight="medium">
                  Settings
                </Text>
                <Text fontSize="sm" textAlign="center" maxW="400px">
                  System settings will be available in a future update.
                </Text>
              </VStack>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Box>
  )
}
