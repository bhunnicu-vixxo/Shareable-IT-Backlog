import { Routes, Route } from 'react-router'
import { BacklogPage } from '@/features/backlog/components/backlog-page'
import { AdminPage } from '@/features/admin/components/admin-page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<BacklogPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
