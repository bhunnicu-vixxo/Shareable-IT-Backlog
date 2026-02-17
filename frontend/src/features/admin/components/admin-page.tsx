import { Badge, Box, Heading, HStack, Tabs, Text, VisuallyHidden, VStack } from '@chakra-ui/react'
import { SyncControl } from './sync-control'
import { UserApprovalList } from './user-approval-list'
import { UserManagementList } from './user-management-list'
import { AuditLogList } from './audit-log-list'
import { LabelVisibilityManager } from './label-visibility-manager'
import { TriageQueue } from '@/features/requests/components/triage-queue'
import { useLabelVisibility } from '../hooks/use-label-visibility'
import { useTriageQueue } from '@/features/requests/hooks/use-requests'

/**
 * Admin dashboard with tabbed navigation.
 *
 * Features refined tab styling with brand accent indicators,
 * section-specific background tints, and consistent card layouts.
 *
 * Sections:
 * - Users: Pending user approvals (Story 7.2), full user management (Story 7.4)
 * - Sync: Manual sync trigger + status (Stories 6.2, 6.4), sync history (Story 7.5)
 * - Settings: Placeholder for future system settings
 */
export function AdminPage() {
  const { unreviewedCount } = useLabelVisibility()
  const { data: triageRequests } = useTriageQueue()
  const pendingRequestCount = triageRequests?.filter(
    (r) => r.status === 'submitted' || r.status === 'reviewing',
  ).length ?? 0

  return (
    <Box maxW="960px" mx="auto" p={{ base: '4', md: '6' }}>
      <VStack gap={6} align="stretch">
        <Heading
          as="h1"
          size="xl"
          fontFamily="heading"
          letterSpacing="-0.03em"
          fontWeight="800"
          color="brand.gray"
        >
          Administration
        </Heading>

        <VisuallyHidden>Admin dashboard. Use tabs to switch between Users, Sync, Audit Log, and Settings sections.</VisuallyHidden>

        <Tabs.Root defaultValue="users" variant="line">
          <Tabs.List
            flexWrap={{ base: 'wrap', md: 'nowrap' }}
            gap={{ base: 2, md: 0 }}
            aria-label="Admin sections"
            bg="surface.raised"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="gray.100"
            p="1"
            boxShadow="0 1px 2px rgba(62,69,67,0.04)"
          >
            <Tabs.Trigger
              value="users"
              data-testid="tab-users"
              borderRadius="md"
              fontWeight="600"
              fontSize="sm"
              _selected={{ bg: 'brand.greenLight', color: 'brand.greenAccessible' }}
            >
              Users
            </Tabs.Trigger>
            <Tabs.Trigger
              value="triage"
              data-testid="tab-triage"
              borderRadius="md"
              fontWeight="600"
              fontSize="sm"
              _selected={{ bg: 'orange.50', color: 'orange.700' }}
            >
              <HStack gap={1.5}>
                <Text>Triage</Text>
                {pendingRequestCount > 0 && (
                  <Badge
                    colorPalette="orange"
                    size="sm"
                    data-testid="triage-pending-badge"
                  >
                    {pendingRequestCount}
                  </Badge>
                )}
              </HStack>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="sync"
              data-testid="tab-sync"
              borderRadius="md"
              fontWeight="600"
              fontSize="sm"
              _selected={{ bg: 'brand.tealLight', color: 'brand.teal' }}
            >
              Sync
            </Tabs.Trigger>
            <Tabs.Trigger
              value="audit"
              data-testid="tab-audit"
              borderRadius="md"
              fontWeight="600"
              fontSize="sm"
              _selected={{ bg: 'surface.sunken', color: 'brand.gray' }}
            >
              Audit Logs
            </Tabs.Trigger>
            <Tabs.Trigger
              value="settings"
              data-testid="tab-settings"
              borderRadius="md"
              fontWeight="600"
              fontSize="sm"
              _selected={{ bg: 'surface.sunken', color: 'brand.gray' }}
            >
              <HStack gap={1.5}>
                <Text>Settings</Text>
                {unreviewedCount > 0 && (
                  <Badge
                    colorPalette="orange"
                    size="sm"
                    data-testid="settings-unreviewed-badge"
                  >
                    {unreviewedCount}
                  </Badge>
                )}
              </HStack>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="users">
            <Box pt={5}>
              <VStack gap={6} align="stretch">
                <UserApprovalList />
                <UserManagementList />
              </VStack>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="triage">
            <Box pt={5}>
              <TriageQueue />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="sync">
            <Box pt={5}>
              <SyncControl />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="audit">
            <Box pt={5}>
              <AuditLogList />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="settings">
            <Box pt={5}>
              <LabelVisibilityManager />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Box>
  )
}
