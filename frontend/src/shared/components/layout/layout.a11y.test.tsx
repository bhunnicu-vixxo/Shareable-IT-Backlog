import { describe, it, vi } from 'vitest'
import { AppLayout } from './app-layout'
import { SkipLink } from './skip-link'
import { AppHeader } from './app-header'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

// Mock auth hook for AppHeader
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { email: 'test@vixxo.com', id: '1', isAdmin: true, status: 'approved' },
    isAdmin: true,
    logout: vi.fn(),
    isLoggingOut: false,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

describe('Layout components accessibility', () => {
  describe('AppLayout', () => {
    it('should have no axe violations with page content', async () => {
      const results = await checkAccessibility(
        <AppLayout>
          <h2>Test Page Content</h2>
          <p>Some test content for the page.</p>
        </AppLayout>,
        { wrapInMain: false }
      )
      expectNoCriticalOrSeriousViolations(results)
    })
  })

  describe('SkipLink', () => {
    it('should have no axe violations', async () => {
      const results = await checkAccessibility(
        <>
          <SkipLink />
          <main id="main-content" tabIndex={-1}>
            <p>Main content</p>
          </main>
        </>,
        { wrapInMain: false }
      )
      expectNoCriticalOrSeriousViolations(results)
    })
  })

  describe('AppHeader', () => {
    it('should have no axe violations', async () => {
      const results = await checkAccessibility(<AppHeader />, { wrapInMain: true })
      expectNoCriticalOrSeriousViolations(results)
    })
  })
})
