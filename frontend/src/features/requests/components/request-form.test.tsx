import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils'
import { RequestForm } from './request-form'

// Mock hooks
vi.mock('../hooks/use-requests', () => ({
  useSubmitRequest: vi.fn(() => ({
    submitRequest: vi.fn(),
    isSubmitting: false,
    error: null,
  })),
  useSimilarItems: vi.fn(() => ({
    data: undefined,
  })),
}))

vi.mock('@/shared/hooks/use-visible-labels', () => ({
  useVisibleLabels: vi.fn(() => ({
    visibleLabels: ['Infrastructure', 'Security', 'UI/UX'],
    isLoading: false,
    error: null,
  })),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form with all fields', () => {
    render(<RequestForm />)

    expect(screen.getByText('Submit IT Request')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Brief summary/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Describe what you need/i)).toBeInTheDocument()
    expect(screen.getByText('Business Impact')).toBeInTheDocument()
    expect(screen.getByText('Submit Request')).toBeInTheDocument()
  })

  it('shows validation errors when form is submitted empty', async () => {
    render(<RequestForm />)

    const submitButton = screen.getByText('Submit Request')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Title must be at least 10 characters')).toBeInTheDocument()
    })
  })

  it('shows validation error for short description', async () => {
    render(<RequestForm />)

    const titleInput = screen.getByPlaceholderText(/Brief summary/i)
    fireEvent.change(titleInput, { target: { value: 'A valid title for testing' } })

    const descInput = screen.getByPlaceholderText(/Describe what you need/i)
    fireEvent.change(descInput, { target: { value: 'Too short' } })

    const submitButton = screen.getByText('Submit Request')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Description must be at least 50 characters')).toBeInTheDocument()
    })
  })

  it('shows business impact validation error', async () => {
    render(<RequestForm />)

    const titleInput = screen.getByPlaceholderText(/Brief summary/i)
    fireEvent.change(titleInput, { target: { value: 'A valid title for testing' } })

    const descInput = screen.getByPlaceholderText(/Describe what you need/i)
    fireEvent.change(descInput, { target: { value: 'A'.repeat(50) } })

    const submitButton = screen.getByText('Submit Request')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please select a business impact level')).toBeInTheDocument()
    })
  })

  it('shows character count for description', () => {
    render(<RequestForm />)

    expect(screen.getByText('0 / 50 min')).toBeInTheDocument()
  })

  it('has a cancel button that exists', () => {
    render(<RequestForm />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
