import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the hooks
const mockUseLabelVisibility = vi.fn()
const mockUseLabelVisibilityMutation = vi.fn()

vi.mock('../hooks/use-label-visibility', () => ({
  useLabelVisibility: () => mockUseLabelVisibility(),
  useLabelVisibilityMutation: () => mockUseLabelVisibilityMutation(),
}))

// Mock label colors
vi.mock('@/features/backlog/utils/label-colors', () => ({
  getLabelColor: () => ({ bg: '#eee', color: '#333', dot: '#999' }),
}))

import { LabelVisibilityManager } from './label-visibility-manager'

const mockLabels = [
  {
    labelName: 'Bug',
    isVisible: true,
    showOnCards: true,
    firstSeenAt: '2026-02-14T10:00:00.000Z',
    reviewedAt: '2026-02-14T12:00:00.000Z',
    updatedAt: '2026-02-14T12:00:00.000Z',
    updatedBy: 1,
    itemCount: 10,
  },
  {
    labelName: 'Feature',
    isVisible: false,
    showOnCards: true,
    firstSeenAt: '2026-02-14T10:00:00.000Z',
    reviewedAt: '2026-02-14T12:00:00.000Z',
    updatedAt: '2026-02-14T10:00:00.000Z',
    updatedBy: null,
    itemCount: 5,
  },
  {
    labelName: 'Tech Debt',
    isVisible: false,
    showOnCards: true,
    firstSeenAt: '2026-02-14T10:00:00.000Z',
    reviewedAt: null,
    updatedAt: '2026-02-14T10:00:00.000Z',
    updatedBy: null,
    itemCount: 3,
  },
]

const defaultMutationReturn = {
  updateLabel: vi.fn(),
  bulkUpdateLabels: vi.fn(),
  isPending: false,
  error: null,
}

describe('LabelVisibilityManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLabelVisibilityMutation.mockReturnValue(defaultMutationReturn)
  })

  it('should show loading state', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: [],
      unreviewedCount: 0,
      isLoading: true,
      error: null,
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByTestId('label-visibility-loading')).toBeInTheDocument()
  })

  it('should show error state', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: [],
      unreviewedCount: 0,
      isLoading: false,
      error: new Error('Server error'),
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByTestId('label-visibility-error')).toBeInTheDocument()
    expect(screen.getByText(/Server error/)).toBeInTheDocument()
  })

  it('should show empty state when no labels', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: [],
      unreviewedCount: 0,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByTestId('label-visibility-empty')).toBeInTheDocument()
    expect(screen.getByText('No Labels Found')).toBeInTheDocument()
  })

  it('should render labels with toggle switches', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByTestId('label-visibility-manager')).toBeInTheDocument()
    expect(screen.getByTestId('label-row-Bug')).toBeInTheDocument()
    expect(screen.getByTestId('label-row-Feature')).toBeInTheDocument()
    expect(screen.getByTestId('label-row-Tech Debt')).toBeInTheDocument()
  })

  it('should show unreviewed labels with New badge', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByText('Unreviewed Labels')).toBeInTheDocument()
    expect(screen.getByTestId('unreviewed-badge')).toBeInTheDocument()
    expect(screen.getByTestId('new-badge')).toBeInTheDocument()
  })

  it('should show item count for each label', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByText('10 items')).toBeInTheDocument()
    expect(screen.getByText('5 items')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('should filter labels by search input', async () => {
    const user = userEvent.setup()
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    const searchInput = screen.getByTestId('label-search-input')
    await user.type(searchInput, 'Bug')

    await waitFor(() => {
      expect(screen.getByTestId('label-row-Bug')).toBeInTheDocument()
      expect(screen.queryByTestId('label-row-Feature')).not.toBeInTheDocument()
      expect(screen.queryByTestId('label-row-Tech Debt')).not.toBeInTheDocument()
    })
  })

  it('should call updateLabel when toggle is clicked', async () => {
    const mockUpdateLabel = vi.fn()
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })
    mockUseLabelVisibilityMutation.mockReturnValue({
      ...defaultMutationReturn,
      updateLabel: mockUpdateLabel,
    })

    render(<LabelVisibilityManager />)

    // Click the Bug toggle (which is currently visible=true, so should toggle to false)
    const bugToggle = screen.getByTestId('toggle-Bug')
    // The Switch.Root renders a button that we need to click
    const button = bugToggle.querySelector('button') ?? bugToggle
    await userEvent.click(button)

    expect(mockUpdateLabel).toHaveBeenCalledWith({
      labelName: 'Bug',
      isVisible: false,
    })
  })

  it('should have accessible switch labels', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    // Check that Switch.Root has proper aria-label
    const bugToggle = screen.getByTestId('toggle-Bug')
    expect(bugToggle).toHaveAttribute('aria-label', 'Show Bug in filter')
  })

  it('should show Enable All and Disable All buttons', () => {
    mockUseLabelVisibility.mockReturnValue({
      labels: mockLabels,
      unreviewedCount: 1,
      isLoading: false,
      error: null,
    })

    render(<LabelVisibilityManager />)

    expect(screen.getByTestId('bulk-enable-btn')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-disable-btn')).toBeInTheDocument()
  })
})
