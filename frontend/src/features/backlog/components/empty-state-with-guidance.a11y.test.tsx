import { describe, it, expect, vi } from 'vitest'
import { render } from '@/utils/test-utils'
import { EmptyStateWithGuidance } from './empty-state-with-guidance'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

const defaultProps = {
  keyword: '',
  selectedLabels: [] as string[],
  showNewOnly: false,
  onClearKeyword: vi.fn(),
  onClearLabels: vi.fn(),
  onClearNewOnly: vi.fn(),
  onClearAll: vi.fn(),
}

describe('EmptyStateWithGuidance accessibility', () => {
  it('should have no axe violations with keyword search active', async () => {
    const results = await checkAccessibility(
      <EmptyStateWithGuidance
        {...defaultProps}
        keyword="missing-item"
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with label filter active', async () => {
    const results = await checkAccessibility(
      <EmptyStateWithGuidance
        {...defaultProps}
        selectedLabels={['Siebel']}
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with showNewOnly active', async () => {
    const results = await checkAccessibility(
      <EmptyStateWithGuidance
        {...defaultProps}
        showNewOnly={true}
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations with all filters active', async () => {
    const results = await checkAccessibility(
      <EmptyStateWithGuidance
        {...defaultProps}
        keyword="test"
        selectedLabels={['Siebel', 'Gateway']}
        showNewOnly={true}
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have no axe violations in compact mode', async () => {
    const results = await checkAccessibility(
      <EmptyStateWithGuidance
        {...defaultProps}
        keyword="search"
        compact
      />
    )
    expectNoCriticalOrSeriousViolations(results)
  })

  it('should have action buttons accessible', () => {
    const { container } = render(
      <EmptyStateWithGuidance
        {...defaultProps}
        keyword="search"
        selectedLabels={['Siebel']}
      />
    )

    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((button) => {
      // Every button should have accessible text content
      expect(button.textContent?.trim()).not.toBe('')
    })
  })
})
