/* eslint-disable react-refresh/only-export-components */
import { useState, type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from '@/components/ui/provider'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
    },
  })

interface AllProvidersProps {
  children: React.ReactNode
  initialEntries?: string[]
}

function AllProviders({ children, initialEntries }: AllProvidersProps) {
  const [queryClient] = useState(() => createTestQueryClient())
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL entries for the MemoryRouter (e.g., ['/admin']) */
  initialEntries?: string[]
}

/**
 * Custom render function that wraps components with all application providers.
 * Use this instead of `@testing-library/react`'s `render` in tests.
 *
 * Supports `initialEntries` for routing tests that need a specific URL path.
 */
function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { initialEntries, ...renderOptions } = options ?? {}
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
  )
  return render(ui, { wrapper, ...renderOptions })
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override the default render with our custom one
export { customRender as render }
