import { describe, it, expect } from 'vitest'
import { render } from '@/utils/test-utils'
import { StackRankBadge } from './stack-rank-badge'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

describe('StackRankBadge accessibility', () => {
  it('should have no axe violations with solid variant', async () => {
    const results = await checkAccessibility(
      <StackRankBadge priority={1} priorityLabel="Urgent" variant="solid" />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with outline variant', async () => {
    const results = await checkAccessibility(
      <StackRankBadge priority={2} priorityLabel="High" variant="outline" />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with subtle variant', async () => {
    const results = await checkAccessibility(
      <StackRankBadge priority={3} priorityLabel="Normal" variant="subtle" />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations for None priority', async () => {
    const results = await checkAccessibility(
      <StackRankBadge priority={0} priorityLabel="None" variant="solid" />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations for Low priority', async () => {
    const results = await checkAccessibility(
      <StackRankBadge priority={4} priorityLabel="Low" variant="solid" />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have aria-label with priority information', () => {
    // Accessibility shape verification (not an axe audit)
    const { container } = render(<StackRankBadge priority={1} priorityLabel="Urgent" />)

    const badge = container.querySelector('[role="img"]')
    expect(badge).toHaveAttribute('aria-label', 'Priority Urgent')
  })
})
