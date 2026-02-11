import { Routes, Route } from 'react-router'
import { BacklogPage } from '@/features/backlog/components/backlog-page'
import { AdminPage } from '@/features/admin/components/admin-page'
import { AccessDenied } from '@/features/auth/components/access-denied'
import { useNetworkAccess } from '@/features/auth/hooks/use-network-access'

function App() {
  const { isChecking, isNetworkDenied, retry } = useNetworkAccess()

  // While checking network access, show nothing (brief flash)
  if (isChecking) {
    return null
  }

  // If network access is denied, show the Access Denied page
  if (isNetworkDenied) {
    return <AccessDenied onRetry={retry} />
  }

  return (
    <Routes>
      <Route path="/" element={<BacklogPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
