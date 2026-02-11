import { vi } from 'vitest'
import { render, screen, waitFor } from '@/utils/test-utils'
import App from './App'

// Mock the network access hook to bypass the network check in App tests
vi.mock('@/features/auth/hooks/use-network-access', () => ({
  useNetworkAccess: () => ({
    isChecking: false,
    isNetworkDenied: false,
    retry: vi.fn(),
  }),
}))

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />)
    // The backlog page is the default route — check for the heading specifically
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /backlog/i })).toBeInTheDocument()
    })
  })
})
