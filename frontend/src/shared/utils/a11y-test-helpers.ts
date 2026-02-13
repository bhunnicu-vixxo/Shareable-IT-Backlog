/**
 * Shared accessibility test utilities for axe-core integration.
 *
 * Provides consistent axe configuration and helper functions for
 * running accessibility audits across all component tests.
 *
 * @see https://github.com/dequelabs/axe-core
 * @see https://github.com/chaance/vitest-axe
 */
import { createElement, type ReactElement } from 'react'
import { render } from '@/utils/test-utils'
import { axe } from 'vitest-axe'
import type AxeCore from 'axe-core'
import { expect } from 'vitest'

/**
 * Axe runner options for WCAG 2.1 Level A checks.
 *
 * Note: axe-core does not have a single "WCAG A only" switch; it uses rule tags.
 * We scope runs to the WCAG 2.0 A + WCAG 2.1 A tagged rules.
 */
export const AXE_RUN_OPTIONS_WCAG_A: AxeCore.RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag21a'],
  },
}

/**
 * Axe runner options for WCAG 2.1 Level AA checks (includes A + AA tags).
 */
export const AXE_RUN_OPTIONS_WCAG_AA: AxeCore.RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'],
  },
}

/**
 * Full axe runner options (no tag scoping). Use sparingly.
 */
export const AXE_RUN_OPTIONS_FULL: AxeCore.RunOptions = {}

const DEFAULT_IMPACTS: ReadonlyArray<NonNullable<AxeCore.Result['impact']>> = [
  'critical',
  'serious',
]

/** Options for the checkAccessibility helper */
interface CheckAccessibilityOptions {
  /**
   * Axe runner options preset to use. Defaults to WCAG 2.1 Level A tags.
   *
   * If you pass a custom value, prefer to keep `runOnly` tag scoping.
   */
  axeOptions?: AxeCore.RunOptions

  /**
   * Specific axe rule IDs to disable for this check.
   * Each entry should include justification in the test description.
   */
  disabledRules?: string[]

  /**
   * Wrap the UI under a `<main>` landmark before running axe.
   *
   * This makes the `region`/landmark checks meaningful even for component tests
   * that otherwise render outside the app's layout.
   */
  wrapInMain?: boolean
}

/**
 * Renders a component and runs axe accessibility checks on it.
 *
 * Uses the project's standard `renderWithProviders` wrapper to ensure
 * components are rendered with all required context (Router, QueryClient,
 * ChakraProvider, etc.).
 *
 * @example
 * ```ts
 * it('should have no accessibility violations', async () => {
 *   const results = await checkAccessibility(<MyComponent />)
 *   expect(results).toHaveNoViolations()
 * })
 * ```
 *
 * @example
 * ```ts
 * // With custom config and disabled rules
 * it('should pass with region rule disabled (component renders outside landmark)', async () => {
 *   const results = await checkAccessibility(<StandaloneWidget />, {
 *     disabledRules: ['region'],
 *   })
 *   expect(results).toHaveNoViolations()
 * })
 * ```
 */
export async function checkAccessibility(
  ui: ReactElement,
  options: CheckAccessibilityOptions = {}
) {
  const {
    axeOptions = AXE_RUN_OPTIONS_WCAG_A,
    disabledRules = [],
    wrapInMain = true,
  } = options

  const wrappedUi = wrapInMain ? createElement('main', null, ui) : ui
  const { container } = render(wrappedUi)

  // Merge disabled rules into the axe config
  const mergedConfig: AxeCore.RunOptions = { ...axeOptions }
  if (disabledRules.length > 0) {
    mergedConfig.rules = { ...(mergedConfig.rules ?? {}) }
    for (const ruleId of disabledRules) {
      mergedConfig.rules[ruleId] = { enabled: false }
    }
  }

  const results = await axe(container, mergedConfig)
  return results
}

/**
 * Assert there are no axe violations at critical/serious impacts.
 *
 * This matches the story acceptance criteria language ("zero critical or serious violations"),
 * while still running the scanner across WCAG-tagged rules via `AXE_RUN_OPTIONS_*`.
 */
export function expectNoCriticalOrSeriousViolations(results: AxeCore.AxeResults) {
  const scoped = results.violations.filter((v) =>
    DEFAULT_IMPACTS.includes((v.impact ?? 'minor') as NonNullable<AxeCore.Result['impact']>)
  )

  // Reuse vitest-axe reporter formatting while scoping to the impacts we care about.
  expect({ ...results, violations: scoped }).toHaveNoViolations()
}
