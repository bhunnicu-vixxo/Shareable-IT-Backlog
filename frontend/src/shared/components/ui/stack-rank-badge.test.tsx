import { describe, it, expect } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { StackRankBadge, getBadgeDimensions } from './stack-rank-badge'

describe('StackRankBadge', () => {
  it('renders priority number 1 (Urgent)', () => {
    render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
    const badge = screen.getByRole('img', { name: 'Priority Urgent' })
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('1')
  })

  it('renders priority number 2 (High)', () => {
    render(<StackRankBadge priority={2} priorityLabel="High" />)
    const badge = screen.getByRole('img', { name: 'Priority High' })
    expect(badge).toHaveTextContent('2')
  })

  it('renders priority number 3 (Normal)', () => {
    render(<StackRankBadge priority={3} priorityLabel="Normal" />)
    const badge = screen.getByRole('img', { name: 'Priority Normal' })
    expect(badge).toHaveTextContent('3')
  })

  it('renders priority number 4 (Low)', () => {
    render(<StackRankBadge priority={4} priorityLabel="Low" />)
    const badge = screen.getByRole('img', { name: 'Priority Low' })
    expect(badge).toHaveTextContent('4')
  })

  it('renders a dash for priority 0 (None)', () => {
    render(<StackRankBadge priority={0} priorityLabel="None" />)
    const badge = screen.getByRole('img', { name: 'Priority None' })
    expect(badge).toHaveTextContent('–')
  })

  it('has accessible aria-label with priority label', () => {
    render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
    const badge = screen.getByRole('img', { name: 'Priority Urgent' })
    expect(badge).toHaveAttribute('aria-label', 'Priority Urgent')
  })

  // --- Size hierarchy tests (Story 3.2) ---

  describe('getBadgeDimensions', () => {
    it('returns 40px size and md fontSize for priority 1 (Urgent)', () => {
      const dims = getBadgeDimensions(1)
      expect(dims).toEqual({ size: '40px', fontSize: 'md' })
    })

    it('returns 36px size and md fontSize for priority 2 (High)', () => {
      const dims = getBadgeDimensions(2)
      expect(dims).toEqual({ size: '36px', fontSize: 'md' })
    })

    it('returns 32px size and sm fontSize for priority 3 (Normal)', () => {
      const dims = getBadgeDimensions(3)
      expect(dims).toEqual({ size: '32px', fontSize: 'sm' })
    })

    it('returns 28px size and xs fontSize for priority 4 (Low)', () => {
      const dims = getBadgeDimensions(4)
      expect(dims).toEqual({ size: '28px', fontSize: 'xs' })
    })

    it('returns 32px size and sm fontSize for priority 0 (None)', () => {
      const dims = getBadgeDimensions(0)
      expect(dims).toEqual({ size: '32px', fontSize: 'sm' })
    })

    it('returns default 32px size for unknown priority values', () => {
      const dims = getBadgeDimensions(99)
      expect(dims).toEqual({ size: '32px', fontSize: 'sm' })
    })

    it('returns default 32px size for negative or non-integer priority', () => {
      expect(getBadgeDimensions(-1)).toEqual({ size: '32px', fontSize: 'sm' })
      expect(getBadgeDimensions(2.5)).toEqual({ size: '32px', fontSize: 'sm' })
    })
  })

  describe('font size scaling', () => {
    it('applies fontSize from getBadgeDimensions to rendered badge', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveAttribute('data-font-size', 'md')
    })

    it('applies smaller fontSize for priority 4 (Low)', () => {
      render(<StackRankBadge priority={4} priorityLabel="Low" />)
      const badge = screen.getByRole('img', { name: 'Priority Low' })
      expect(badge).toHaveAttribute('data-font-size', 'xs')
    })
  })

  describe('size hierarchy rendering', () => {
    it('renders priority 1 badge at 40px', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveStyle({ width: '40px', height: '40px' })
    })

    it('renders priority 2 badge at 36px', () => {
      render(<StackRankBadge priority={2} priorityLabel="High" />)
      const badge = screen.getByRole('img', { name: 'Priority High' })
      expect(badge).toHaveStyle({ width: '36px', height: '36px' })
    })

    it('renders priority 3 badge at 32px', () => {
      render(<StackRankBadge priority={3} priorityLabel="Normal" />)
      const badge = screen.getByRole('img', { name: 'Priority Normal' })
      expect(badge).toHaveStyle({ width: '32px', height: '32px' })
    })

    it('renders priority 4 badge at 28px', () => {
      render(<StackRankBadge priority={4} priorityLabel="Low" />)
      const badge = screen.getByRole('img', { name: 'Priority Low' })
      expect(badge).toHaveStyle({ width: '28px', height: '28px' })
    })

    it('renders priority 0 badge at 32px (base size)', () => {
      render(<StackRankBadge priority={0} priorityLabel="None" />)
      const badge = screen.getByRole('img', { name: 'Priority None' })
      expect(badge).toHaveStyle({ width: '32px', height: '32px' })
    })

    it('uses Vixxo Green (brand.green) for priorities 1-4', () => {
      const { unmount } = render(
        <StackRankBadge priority={1} priorityLabel="Urgent" />
      )
      const badge1 = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge1).toHaveAttribute('data-bg', 'brand.green')
      unmount()

      render(<StackRankBadge priority={4} priorityLabel="Low" />)
      const badge4 = screen.getByRole('img', { name: 'Priority Low' })
      expect(badge4).toHaveAttribute('data-bg', 'brand.green')
    })

    it('uses gray color for priority 0 (None)', () => {
      render(<StackRankBadge priority={0} priorityLabel="None" />)
      const badge = screen.getByRole('img', { name: 'Priority None' })
      expect(badge).toHaveAttribute('data-bg', 'gray.400')
      expect(badge).toHaveTextContent('–')
    })
  })
})
