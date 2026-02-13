import { describe, it, vi } from 'vitest'
import { IdentifyForm } from './identify-form'
import { PendingApproval } from './pending-approval'
import { AccessDenied } from './access-denied'
import {
  checkAccessibility,
  expectNoCriticalOrSeriousViolations,
} from '@/shared/utils/a11y-test-helpers'

describe('Auth pages accessibility', () => {
  describe('IdentifyForm', () => {
    it('should have no axe violations in default state', async () => {
      const results = await checkAccessibility(
        <IdentifyForm onIdentify={vi.fn().mockResolvedValue(undefined)} isIdentifying={false} error={null} />,
        { wrapInMain: false }
      )
      expectNoCriticalOrSeriousViolations(results)
    })

    it('should have no axe violations with validation error displayed', async () => {
      const results = await checkAccessibility(
        <IdentifyForm
          onIdentify={vi.fn().mockResolvedValue(undefined)}
          isIdentifying={false}
          error="Invalid email address. Please check and try again."
        />,
        { wrapInMain: false }
      )
      expectNoCriticalOrSeriousViolations(results)
    })

    it('should have no axe violations while identifying', async () => {
      const results = await checkAccessibility(
        <IdentifyForm onIdentify={vi.fn().mockResolvedValue(undefined)} isIdentifying={true} error={null} />,
        { wrapInMain: false }
      )
      expectNoCriticalOrSeriousViolations(results)
    })
  })

  describe('PendingApproval', () => {
    it('should have no axe violations', async () => {
      const results = await checkAccessibility(
        <PendingApproval onCheckStatus={vi.fn()} email="user@vixxo.com" />,
        { wrapInMain: false }
      )
      expectNoCriticalOrSeriousViolations(results)
    })

    it('should have no axe violations without email', async () => {
      const results = await checkAccessibility(<PendingApproval onCheckStatus={vi.fn()} />, {
        wrapInMain: false,
      })
      expectNoCriticalOrSeriousViolations(results)
    })
  })

  describe('AccessDenied', () => {
    it('should have no axe violations', async () => {
      const results = await checkAccessibility(<AccessDenied onRetry={vi.fn()} />, {
        wrapInMain: false,
      })
      expectNoCriticalOrSeriousViolations(results)
    })
  })
})
