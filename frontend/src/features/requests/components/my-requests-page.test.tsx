import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { MyRequestsPage } from './my-requests-page'

const mockUseMyRequests = vi.fn()

vi.mock('../hooks/use-requests', () => ({
  useMyRequests: () => mockUseMyRequests(),
}))

describe('MyRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    mockUseMyRequests.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<MyRequestsPage />)

    expect(screen.getByText('My Requests')).toBeInTheDocument()
  })

  it('renders empty state when no requests', () => {
    mockUseMyRequests.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    render(<MyRequestsPage />)

    expect(screen.getByText('No requests yet')).toBeInTheDocument()
    expect(screen.getByText('Submit Request')).toBeInTheDocument()
  })

  it('renders request cards with status badges', () => {
    mockUseMyRequests.mockReturnValue({
      data: [
        {
          id: 'uuid-1',
          title: 'Need new VPN access',
          description: 'I need VPN access for remote work',
          businessImpact: 'medium',
          category: null,
          urgency: null,
          status: 'submitted',
          adminNotes: null,
          rejectionReason: null,
          linearIssueId: null,
          createdAt: '2026-02-17T10:00:00Z',
          updatedAt: '2026-02-17T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    })

    render(<MyRequestsPage />)

    expect(screen.getByText('Need new VPN access')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('renders rejection reason when request is rejected', () => {
    mockUseMyRequests.mockReturnValue({
      data: [
        {
          id: 'uuid-2',
          title: 'Rejected request',
          description: 'This was rejected',
          businessImpact: 'low',
          category: null,
          urgency: null,
          status: 'rejected',
          adminNotes: null,
          rejectionReason: 'Duplicate of existing item',
          linearIssueId: null,
          createdAt: '2026-02-17T10:00:00Z',
          updatedAt: '2026-02-17T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    })

    render(<MyRequestsPage />)

    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Duplicate of existing item')).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockUseMyRequests.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load requests'),
    })

    render(<MyRequestsPage />)

    expect(screen.getByText('Failed to load requests')).toBeInTheDocument()
  })
})
