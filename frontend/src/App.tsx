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
import { ErrorBoundary } from '@/shared/components/error-boundary'
import { ErrorFallback } from '@/shared/components/error-fallback'
import { ServiceUnavailable } from '@/shared/components/service-unavailable'
import { useServiceHealth } from '@/shared/hooks/use-service-health'

function AppContent() {
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
    logout,
  } = useAuth()
  const { isServiceUnavailable, retry: retryService } = useServiceHealth()

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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="100vh"
        bg="#FAFAF7"
      >
        <VStack gap={4} className="animate-fade-in">
          <Spinner size="xl" color="#8E992E" />
          <Text color="#718096" fontFamily="heading" fontWeight="500">Loading...</Text>
        </VStack>
      </Box>
    )
  }

  // 2. Service unavailable — API is completely unreachable
  // Check this before auth flow so unauthenticated users see the error page during outages
  if (isServiceUnavailable) {
    return <ServiceUnavailable onRetry={retryService} />
  }

  // 3. Not identified — show identify form
  if (!isIdentified) {
    return (
      <IdentifyForm
        onIdentify={identify}
        isIdentifying={isIdentifying}
        error={identifyError}
      />
    )
  }

  // 4. Identified but not approved — show pending approval page
  if (!isApproved) {
    return (
      <PendingApproval
        onCheckStatus={() => checkSession()}
        onSignOut={() => logout()}
        email={user?.email}
      />
    )
  }

  // 5. Authenticated + approved — show app routes with shared header
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
                <VStack gap={4} className="animate-fade-in">
                  <Heading size="lg" fontFamily="heading" letterSpacing="-0.02em" color="brand.gray">Access Denied</Heading>
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

function App() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} resetError={resetErrorBoundary} />
      )}
    >
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
