import { Routes, Route } from 'react-router'
import { Box, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { BacklogPage } from '@/features/backlog/components/backlog-page'
import { AdminPage } from '@/features/admin/components/admin-page'
import { AccessDenied } from '@/features/auth/components/access-denied'
import { useNetworkAccess } from '@/features/auth/hooks/use-network-access'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { IdentifyForm } from '@/features/auth/components/identify-form'
import { PendingApproval } from '@/features/auth/components/pending-approval'
import { AppLayout } from '@/shared/components/layout/app-layout'

function App() {
  const { isChecking, isNetworkDenied, retry } = useNetworkAccess()
  const {
    user,
    isLoading,
    isIdentified,
    isApproved,
    isAdmin,
    identify,
    isIdentifying,
    identifyError,
    checkSession,
  } = useAuth()

  // 0. While checking network access, show nothing (brief flash)
  if (isChecking) {
    return null
  }

  // 0b. If network access is denied, show the Access Denied page
  if (isNetworkDenied) {
    return <AccessDenied onRetry={retry} />
  }

  // 1. Loading state — checking session
  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading...</Text>
        </VStack>
      </Box>
    )
  }

  // 2. Not identified — show identify form
  if (!isIdentified) {
    return (
      <IdentifyForm
        onIdentify={identify}
        isIdentifying={isIdentifying}
        error={identifyError}
      />
    )
  }

  // 3. Identified but not approved — show pending approval page
  if (!isApproved) {
    return (
      <PendingApproval
        onCheckStatus={() => checkSession()}
        email={user?.email}
      />
    )
  }

  // 4. Authenticated + approved — show app routes with shared header
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<BacklogPage />} />
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <AdminPage />
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" minH="80vh">
                <VStack gap={4}>
                  <Heading size="lg">Access Denied</Heading>
                  <Text color="fg.muted">You do not have admin privileges to view this page.</Text>
                </VStack>
              </Box>
            )
          }
        />
      </Routes>
    </AppLayout>
  )
}

export default App
