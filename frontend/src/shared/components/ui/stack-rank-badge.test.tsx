import { describe, it, expect } from 'vitest'
import { render, screen } from '@/utils/test-utils'
import { StackRankBadge } from './stack-rank-badge'
import { getBadgeDimensions, getExplicitSizeDimensions, getVariantStyles } from './stack-rank-badge.utils'

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
    it('returns 40px size and xl fontSize for priority 1 (Urgent)', () => {
      const dims = getBadgeDimensions(1)
      expect(dims).toEqual({ size: '40px', fontSize: 'xl' })
    })

    it('returns 36px size and xl fontSize for priority 2 (High)', () => {
      const dims = getBadgeDimensions(2)
      expect(dims).toEqual({ size: '36px', fontSize: 'xl' })
    })

    it('returns 32px size and lg fontSize for priority 3 (Normal)', () => {
      const dims = getBadgeDimensions(3)
      expect(dims).toEqual({ size: '32px', fontSize: 'lg' })
    })

    it('returns 28px size and lg fontSize for priority 4 (Low)', () => {
      const dims = getBadgeDimensions(4)
      expect(dims).toEqual({ size: '28px', fontSize: 'lg' })
    })

    it('returns 32px size and lg fontSize for priority 0 (None)', () => {
      const dims = getBadgeDimensions(0)
      expect(dims).toEqual({ size: '32px', fontSize: 'lg' })
    })

    it('returns default 32px size for unknown priority values', () => {
      const dims = getBadgeDimensions(99)
      expect(dims).toEqual({ size: '32px', fontSize: 'lg' })
    })

    it('returns default 32px size for negative or non-integer priority', () => {
      expect(getBadgeDimensions(-1)).toEqual({ size: '32px', fontSize: 'lg' })
      expect(getBadgeDimensions(2.5)).toEqual({ size: '32px', fontSize: 'lg' })
    })
  })

  describe('font size scaling', () => {
    it('applies fontSize from getBadgeDimensions to rendered badge', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveAttribute('data-font-size', 'xl')
    })

    it('applies fontSize for priority 4 (Low)', () => {
      render(<StackRankBadge priority={4} priorityLabel="Low" />)
      const badge = screen.getByRole('img', { name: 'Priority Low' })
      expect(badge).toHaveAttribute('data-font-size', 'lg')
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
      expect(badge).toHaveAttribute('data-bg', 'gray.600')
      expect(badge).toHaveTextContent('–')
    })
  })

  // --- Task 1: Props interface and type exports (Story 8.2) ---

  describe('props interface backward compatibility', () => {
    it('renders correctly with only required props (no size, no variant)', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('1')
    })

    it('accepts optional size prop without breaking', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="md" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toBeInTheDocument()
    })

    it('accepts optional variant prop without breaking', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" variant="outline" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toBeInTheDocument()
    })

    it('accepts both size and variant props together', () => {
      render(<StackRankBadge priority={2} priorityLabel="High" size="lg" variant="subtle" />)
      const badge = screen.getByRole('img', { name: 'Priority High' })
      expect(badge).toBeInTheDocument()
    })
  })

  // --- Task 2: Size prop logic (Story 8.2) ---

  describe('explicit size prop', () => {
    it('renders sm size at 24px', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="sm" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveStyle({ width: '24px', height: '24px' })
      expect(badge).toHaveAttribute('data-size', 'sm')
    })

    it('renders md size at 32px', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="md" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveStyle({ width: '32px', height: '32px' })
      expect(badge).toHaveAttribute('data-size', 'md')
    })

    it('renders lg size at 40px', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="lg" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveStyle({ width: '40px', height: '40px' })
      expect(badge).toHaveAttribute('data-size', 'lg')
    })

    it('sm size uses lg fontSize', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="sm" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveAttribute('data-font-size', 'lg')
    })

    it('md size uses lg fontSize', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="md" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveAttribute('data-font-size', 'lg')
    })

    it('lg size uses xl fontSize', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="lg" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveAttribute('data-font-size', 'xl')
    })

    it('explicit size overrides priority-based auto-sizing', () => {
      // Priority 1 normally gets 40px; sm should override to 24px
      render(<StackRankBadge priority={1} priorityLabel="Urgent" size="sm" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveStyle({ width: '24px', height: '24px' })
    })

    it('default (no size prop) uses priority-based auto-sizing', () => {
      render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
      const badge = screen.getByRole('img', { name: 'Priority Urgent' })
      expect(badge).toHaveStyle({ width: '40px', height: '40px' })
      expect(badge).toHaveAttribute('data-size', 'auto')
    })
  })

  describe('getExplicitSizeDimensions', () => {
    it('returns 24px and lg for sm', () => {
      expect(getExplicitSizeDimensions('sm')).toEqual({ size: '24px', fontSize: 'lg' })
    })

    it('returns 32px and lg for md', () => {
      expect(getExplicitSizeDimensions('md')).toEqual({ size: '32px', fontSize: 'lg' })
    })

    it('returns 40px and xl for lg', () => {
      expect(getExplicitSizeDimensions('lg')).toEqual({ size: '40px', fontSize: 'xl' })
    })
  })

  // --- Task 3: Variant prop logic (Story 8.2) ---

  describe('variant prop', () => {
    describe('solid variant (default)', () => {
      it('applies solid styles for priorities 1-4', () => {
        render(<StackRankBadge priority={1} priorityLabel="Urgent" variant="solid" />)
        const badge = screen.getByRole('img', { name: 'Priority Urgent' })
        expect(badge).toHaveAttribute('data-variant', 'solid')
        expect(badge).toHaveAttribute('data-bg', 'brand.green')
      })

      it('is the default variant when none specified', () => {
        render(<StackRankBadge priority={1} priorityLabel="Urgent" />)
        const badge = screen.getByRole('img', { name: 'Priority Urgent' })
        expect(badge).toHaveAttribute('data-variant', 'solid')
      })

      it('applies gray solid for priority 0', () => {
        render(<StackRankBadge priority={0} priorityLabel="None" variant="solid" />)
        const badge = screen.getByRole('img', { name: 'Priority None' })
        expect(badge).toHaveAttribute('data-bg', 'gray.600')
      })
    })

    describe('outline variant', () => {
      it('applies outline styles for priorities 1-4', () => {
        render(<StackRankBadge priority={1} priorityLabel="Urgent" variant="outline" />)
        const badge = screen.getByRole('img', { name: 'Priority Urgent' })
        expect(badge).toHaveAttribute('data-variant', 'outline')
        expect(badge).toHaveAttribute('data-bg', 'transparent')
      })

      it('applies gray outline for priority 0', () => {
        render(<StackRankBadge priority={0} priorityLabel="None" variant="outline" />)
        const badge = screen.getByRole('img', { name: 'Priority None' })
        expect(badge).toHaveAttribute('data-variant', 'outline')
        expect(badge).toHaveAttribute('data-bg', 'transparent')
      })
    })

    describe('subtle variant', () => {
      it('applies subtle styles for priorities 1-4', () => {
        render(<StackRankBadge priority={1} priorityLabel="Urgent" variant="subtle" />)
        const badge = screen.getByRole('img', { name: 'Priority Urgent' })
        expect(badge).toHaveAttribute('data-variant', 'subtle')
        expect(badge).toHaveAttribute('data-bg', 'brand.greenLight')
      })

      it('applies gray subtle for priority 0', () => {
        render(<StackRankBadge priority={0} priorityLabel="None" variant="subtle" />)
        const badge = screen.getByRole('img', { name: 'Priority None' })
        expect(badge).toHaveAttribute('data-variant', 'subtle')
        expect(badge).toHaveAttribute('data-bg', 'gray.100')
      })
    })

    describe('combined size + variant', () => {
      it('applies both size and variant together', () => {
        render(<StackRankBadge priority={2} priorityLabel="High" size="lg" variant="outline" />)
        const badge = screen.getByRole('img', { name: 'Priority High' })
        expect(badge).toHaveStyle({ width: '40px', height: '40px' })
        expect(badge).toHaveAttribute('data-variant', 'outline')
        expect(badge).toHaveAttribute('data-size', 'lg')
        expect(badge).toHaveAttribute('data-bg', 'transparent')
      })

      it('applies sm size with subtle variant', () => {
        render(<StackRankBadge priority={3} priorityLabel="Normal" size="sm" variant="subtle" />)
        const badge = screen.getByRole('img', { name: 'Priority Normal' })
        expect(badge).toHaveStyle({ width: '24px', height: '24px' })
        expect(badge).toHaveAttribute('data-variant', 'subtle')
        expect(badge).toHaveAttribute('data-bg', 'brand.greenLight')
      })
    })
  })

  describe('getVariantStyles', () => {
    it('returns solid styles for priority 1-4', () => {
      const styles = getVariantStyles('solid', false)
      expect(styles.bg).toBe('brand.green')
      expect(styles.color).toBe('white')
      expect(styles.borderWidth).toBe('0')
    })

    it('returns outline styles for priority 1-4', () => {
      const styles = getVariantStyles('outline', false)
      expect(styles.bg).toBe('transparent')
      expect(styles.color).toBe('brand.greenAccessible')
      expect(styles.borderWidth).toBe('2px')
      expect(styles.borderColor).toBe('brand.greenAccessible')
    })

    it('returns subtle styles for priority 1-4', () => {
      const styles = getVariantStyles('subtle', false)
      expect(styles.bg).toBe('brand.greenLight')
      expect(styles.color).toBe('brand.greenAccessible')
      expect(styles.borderWidth).toBe('0')
    })

    it('returns gray solid styles for priority 0', () => {
      const styles = getVariantStyles('solid', true)
      expect(styles.bg).toBe('gray.600')
      expect(styles.color).toBe('white')
    })

    it('returns gray outline styles for priority 0', () => {
      const styles = getVariantStyles('outline', true)
      expect(styles.bg).toBe('transparent')
      expect(styles.color).toBe('gray.600')
      expect(styles.borderColor).toBe('gray.600')
    })

    it('returns gray subtle styles for priority 0', () => {
      const styles = getVariantStyles('subtle', true)
      expect(styles.bg).toBe('gray.100')
      expect(styles.color).toBe('gray.600')
    })
  })

  // --- ARIA accessibility for all variants/sizes ---

  describe('ARIA accessibility across variants and sizes', () => {
    it('has role="img" for all variants', () => {
      const variants = ['solid', 'outline', 'subtle'] as const
      for (const variant of variants) {
        const { unmount } = render(
          <StackRankBadge priority={1} priorityLabel="Urgent" variant={variant} />
        )
        const badge = screen.getByRole('img', { name: 'Priority Urgent' })
        expect(badge).toHaveAttribute('role', 'img')
        unmount()
      }
    })

    it('has correct aria-label for all sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      for (const size of sizes) {
        const { unmount } = render(
          <StackRankBadge priority={2} priorityLabel="High" size={size} />
        )
        const badge = screen.getByRole('img', { name: 'Priority High' })
        expect(badge).toHaveAttribute('aria-label', 'Priority High')
        unmount()
      }
    })
  })
})
