import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { ErrorBoundary } from './error-boundary'

/** Component that always throws during render for testing. */
function ThrowingComponent({ message = 'Test render error' }: { message?: string }): never {
  throw new Error(message)
}

/** Component that renders normally. */
function GoodComponent() {
  return <div data-testid="good-child">Hello World</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error noise from React's error boundary logging
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('good-child')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('catches render errors and shows default fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    // Default fallback should NOT be rendered
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('resets error state when "Try Again" is clicked', () => {
    // Use a flag to control whether the component throws
    let shouldThrow = true

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('Conditional error')
      }
      return <div data-testid="recovered">Recovered!</div>
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    )

    // Should show error fallback
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Fix the component before retrying
    shouldThrow = false

    // Click "Try Again"
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    // Should now render the recovered content
    expect(screen.getByTestId('recovered')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('invokes onError callback when an error is caught', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent message="callback test error" />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'callback test error' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    )
  })

  it('renders fallbackRender with error and resetErrorBoundary props', () => {
    const fallbackRender = vi.fn(({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
      <div>
        <span data-testid="render-error-msg">{error.message}</span>
        <button onClick={resetErrorBoundary}>Reset</button>
      </div>
    ))

    render(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <ThrowingComponent message="fallbackRender test" />
      </ErrorBoundary>,
    )

    expect(fallbackRender).toHaveBeenCalled()
    expect(screen.getByTestId('render-error-msg')).toHaveTextContent('fallbackRender test')
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('fallbackRender takes precedence over static fallback', () => {
    render(
      <ErrorBoundary
        fallback={<div data-testid="static-fallback">Static</div>}
        fallbackRender={({ error }) => <div data-testid="render-fallback">{error.message}</div>}
      >
        <ThrowingComponent message="precedence test" />
      </ErrorBoundary>,
    )

    expect(screen.getByTestId('render-fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('static-fallback')).not.toBeInTheDocument()
  })

  it('logs error to console with component stack info', () => {
    const consoleSpy = vi.spyOn(console, 'error')

    render(
      <ErrorBoundary>
        <ThrowingComponent message="console log test" />
      </ErrorBoundary>,
    )

    // Our ErrorBoundary calls console.error with a specific format
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] Caught error:',
      expect.objectContaining({ message: 'console log test' }),
      expect.any(String), // componentStack
    )
  })
})
