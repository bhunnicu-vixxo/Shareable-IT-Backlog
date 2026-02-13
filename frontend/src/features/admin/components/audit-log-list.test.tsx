import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/utils/test-utils'
import { AuditLogList } from './audit-log-list'

const mockUseAdminAuditLogs = vi.fn()

vi.mock('../hooks/use-audit-logs', () => ({
  useAdminAuditLogs: (...args: unknown[]) => mockUseAdminAuditLogs(...args),
}))

vi.mock('@/utils/formatters', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/formatters')>()
  return {
    ...original,
    formatRelativeTime: vi.fn((iso: string) => `relative(${iso})`),
    formatDateTime: vi.fn((iso: string) => `datetime(${iso})`),
  }
})

describe('AuditLogList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminAuditLogs.mockReturnValue({
      data: { logs: [], total: 0, page: 1, limit: 50 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renders heading and badge', () => {
    render(<AuditLogList />)
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
    expect(screen.getByText('Admin actions')).toBeInTheDocument()
  })

  it('renders empty state when no logs', () => {
    render(<AuditLogList />)
    expect(screen.getByText(/No admin action audit logs found/i)).toBeInTheDocument()
  })

  it('renders loading skeleton when loading', () => {
    mockUseAdminAuditLogs.mockReturnValue({
      data: { logs: [], total: 0, page: 1, limit: 50 },
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<AuditLogList />)
    expect(screen.getByTestId('audit-logs-loading')).toBeInTheDocument()
  })

  it('renders error state when hook errors', () => {
    mockUseAdminAuditLogs.mockReturnValue({
      data: { logs: [], total: 0, page: 1, limit: 50 },
      isLoading: false,
      error: new Error('Boom'),
      refetch: vi.fn(),
    })

    render(<AuditLogList />)
    expect(screen.getByText(/Failed to load audit logs/i)).toBeInTheDocument()
    expect(screen.getByText(/Boom/)).toBeInTheDocument()
  })

  it('applies filters only when Apply is clicked', () => {
    render(<AuditLogList />)

    // initial call: no filters
    expect(mockUseAdminAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ action: undefined, userId: undefined, page: 1, limit: 50 }),
    )

    fireEvent.change(screen.getByLabelText(/Filter by action/i), { target: { value: 'USER_APPROVED' } })
    fireEvent.change(screen.getByLabelText(/Filter by admin userId/i), { target: { value: '123' } })

    // still not applied yet
    expect(mockUseAdminAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: undefined, userId: undefined }),
    )

    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }))

    expect(mockUseAdminAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'USER_APPROVED', userId: 123 }),
    )
  })

  it('disables Prev button on first page and Next on last page', () => {
    mockUseAdminAuditLogs.mockReturnValue({
      data: {
        logs: [{ id: 1, userId: 1, action: 'TRIGGER_SYNC', resource: 'sync', resourceId: null, details: null, ipAddress: '10.0.0.1', isAdminAction: true, createdAt: '2026-02-12T10:00:00.000Z' }],
        total: 1,
        page: 1,
        limit: 50,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<AuditLogList />)

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
  })

  it('enables Next button when more pages exist and navigates on click', () => {
    // 120 total with limit 50 = 3 pages
    mockUseAdminAuditLogs.mockReturnValue({
      data: {
        logs: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1, userId: 1, action: 'TRIGGER_SYNC', resource: 'sync', resourceId: null,
          details: null, ipAddress: '10.0.0.1', isAdminAction: true, createdAt: '2026-02-12T10:00:00.000Z',
        })),
        total: 120,
        page: 1,
        limit: 50,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<AuditLogList />)

    const prevBtn = screen.getByRole('button', { name: /previous page/i })
    const nextBtn = screen.getByRole('button', { name: /next page/i })

    // Page 1: Prev disabled, Next enabled
    expect(prevBtn).toBeDisabled()
    expect(nextBtn).not.toBeDisabled()

    // Navigate to page 2
    fireEvent.click(nextBtn)

    // Hook should now be called with page=2
    expect(mockUseAdminAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    )
  })

  it('renders rows and toggles details', () => {
    mockUseAdminAuditLogs.mockReturnValue({
      data: {
        logs: [
          {
            id: 1,
            userId: 42,
            action: 'USER_APPROVED',
            resource: 'user',
            resourceId: '2',
            details: { before: {}, after: {} },
            ipAddress: '10.0.0.1',
            isAdminAction: true,
            createdAt: '2026-02-12T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<AuditLogList />)

    expect(screen.getByText('USER_APPROVED')).toBeInTheDocument()
    expect(screen.getByText(/relative\(2026-02-12T10:00:00.000Z\)/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show details/i }))
    expect(screen.getByText(/isAdminAction: true/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /hide details/i }))
    expect(screen.queryByText(/isAdminAction: true/i)).not.toBeInTheDocument()
  })
})

