import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { TriageQueue } from './triage-queue'

const mockUseTriageQueue = vi.fn()
const mockUseApproveRequest = vi.fn()
const mockUseRejectRequest = vi.fn()

vi.mock('../hooks/use-requests', () => ({
  useTriageQueue: () => mockUseTriageQueue(),
  useApproveRequest: () => mockUseApproveRequest(),
  useRejectRequest: () => mockUseRejectRequest(),
}))

describe('TriageQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApproveRequest.mockReturnValue({
      approveRequest: vi.fn(),
      isApproving: false,
      error: null,
    })
    mockUseRejectRequest.mockReturnValue({
      rejectRequest: vi.fn(),
      isRejecting: false,
      error: null,
    })
  })

  it('renders loading state', () => {
    mockUseTriageQueue.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<TriageQueue />)

    expect(screen.getByText('Request Triage Queue')).toBeInTheDocument()
  })

  it('renders empty state when no requests', () => {
    mockUseTriageQueue.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    render(<TriageQueue />)

    expect(screen.getByText('No requests have been submitted yet.')).toBeInTheDocument()
  })

  it('renders pending requests with approve/reject buttons', () => {
    mockUseTriageQueue.mockReturnValue({
      data: [
        {
          id: 'uuid-1',
          userId: 1,
          title: 'Need database upgrade',
          description: 'We need to upgrade the production database to handle increased traffic',
          businessImpact: 'high',
          category: 'Infrastructure',
          urgency: 'this_quarter',
          status: 'submitted',
          adminNotes: null,
          rejectionReason: null,
          reviewedBy: null,
          linearIssueId: null,
          submitterEmail: 'user@vixxo.com',
          submitterName: 'Test User',
          createdAt: '2026-02-17T10:00:00Z',
          updatedAt: '2026-02-17T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    })

    render(<TriageQueue />)

    expect(screen.getByText('Need database upgrade')).toBeInTheDocument()
    expect(screen.getByText('Pending Review (1)')).toBeInTheDocument()
    expect(screen.getByText('Approve & Create Issue')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('separates pending and processed requests', () => {
    mockUseTriageQueue.mockReturnValue({
      data: [
        {
          id: 'uuid-1',
          userId: 1,
          title: 'Pending request',
          description: 'Pending',
          businessImpact: 'medium',
          status: 'submitted',
          createdAt: '2026-02-17T10:00:00Z',
          updatedAt: '2026-02-17T10:00:00Z',
          submitterEmail: 'user@vixxo.com',
        },
        {
          id: 'uuid-2',
          userId: 2,
          title: 'Approved request',
          description: 'Already approved',
          businessImpact: 'low',
          status: 'approved',
          linearIssueId: 'lin-123',
          createdAt: '2026-02-16T10:00:00Z',
          updatedAt: '2026-02-17T10:00:00Z',
          submitterEmail: 'user2@vixxo.com',
        },
      ],
      isLoading: false,
      error: null,
    })

    render(<TriageQueue />)

    expect(screen.getByText('Pending Review (1)')).toBeInTheDocument()
    expect(screen.getByText('Previously Processed (1)')).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockUseTriageQueue.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load triage queue'),
    })

    render(<TriageQueue />)

    expect(screen.getByText('Failed to load triage queue')).toBeInTheDocument()
  })
})
