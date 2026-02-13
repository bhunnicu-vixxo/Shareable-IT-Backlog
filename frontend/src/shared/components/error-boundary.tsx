import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Props passed to a fallbackRender function for full error context access. */
export interface FallbackRenderProps {
  error: Error
  resetErrorBoundary: () => void
}

export interface ErrorBoundaryProps {
  /** Content to render when no error has occurred. */
  children: ReactNode
  /** Optional static fallback UI to render on error (no error/reset access). */
  fallback?: ReactNode
  /**
   * Optional render function for fallback UI that receives the caught error
   * and a resetErrorBoundary callback. Takes precedence over `fallback`.
   */
  fallbackRender?: (props: FallbackRenderProps) => ReactNode
  /** Optional callback invoked when an error is caught. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary that catches uncaught render errors in its subtree.
 *
 * Displays a fallback UI when an error is caught, with a "Try Again" button
 * that resets the error state. Optionally accepts a custom `fallback` element
 * and an `onError` callback for logging or analytics.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the caught error with component stack info for troubleshooting
    console.error('[ErrorBoundary] Caught error:', error, errorInfo.componentStack)

    // Invoke optional callback for external error handling (e.g., logging service)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use fallbackRender for full error/reset access (preferred pattern)
      if (this.props.fallbackRender && this.state.error) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        })
      }

      // Use static fallback if provided (no error/reset access)
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default minimal fallback — the ErrorFallback component should be used
      // for richer UI, but this ensures a basic fallback always works
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2C7B80',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
