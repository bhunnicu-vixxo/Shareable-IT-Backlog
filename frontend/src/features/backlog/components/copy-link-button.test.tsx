import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { toaster } from '@/components/ui/toaster'
import { CopyLinkButton } from './copy-link-button'
import { buildItemLink } from '../utils/clipboard'

// Mock the clipboard utility module
vi.mock('../utils/clipboard', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/clipboard')>()
  return {
    ...original,
    copyToClipboard: vi.fn(),
  }
})

import { copyToClipboard } from '../utils/clipboard'

const copyToClipboardMock = vi.mocked(copyToClipboard)

let toasterCreateSpy: ReturnType<typeof vi.spyOn>

describe('CopyLinkButton', () => {
  beforeEach(() => {
    copyToClipboardMock.mockResolvedValue(true)
    toasterCreateSpy = vi.spyOn(toaster, 'create')
  })

  afterEach(() => {
    toasterCreateSpy.mockRestore()
  })

  it('renders a link icon button', () => {
    render(<CopyLinkButton identifier="VIX-338" />)
    const button = screen.getByTestId('copy-link-button')
    expect(button).toBeInTheDocument()
  })

  it('has correct ARIA label', () => {
    render(<CopyLinkButton identifier="VIX-338" />)
    expect(
      screen.getByRole('button', { name: 'Copy link to VIX-338' }),
    ).toBeInTheDocument()
  })

  it('calls copyToClipboard with correct URL on click', async () => {
    const user = userEvent.setup()
    render(<CopyLinkButton identifier="VIX-338" />)

    await user.click(screen.getByTestId('copy-link-button'))

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledWith(
        `${window.location.origin}/?item=VIX-338`,
      )
    })
  })

  it('shows success toast on clipboard write', async () => {
    copyToClipboardMock.mockResolvedValue(true)
    const user = userEvent.setup()
    render(<CopyLinkButton identifier="VIX-338" />)

    await user.click(screen.getByTestId('copy-link-button'))

    await waitFor(() => {
      expect(toasterCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Link copied!', type: 'success' }),
      )
    })
  })

  it('shows error toast on clipboard failure', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    const user = userEvent.setup()
    render(<CopyLinkButton identifier="VIX-338" />)

    await user.click(screen.getByTestId('copy-link-button'))

    await waitFor(() => {
      expect(toasterCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Could not copy link', type: 'error' }),
      )
    })
  })

  it('is keyboard accessible (activatable with Enter)', async () => {
    const user = userEvent.setup()
    render(<CopyLinkButton identifier="VIX-100" />)

    const button = screen.getByTestId('copy-link-button')
    button.focus()
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledWith(
        `${window.location.origin}/?item=VIX-100`,
      )
    })
  })

  it('is keyboard accessible (activatable with Space)', async () => {
    const user = userEvent.setup()
    render(<CopyLinkButton identifier="VIX-100" />)

    const button = screen.getByTestId('copy-link-button')
    button.focus()
    await user.keyboard(' ')

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledWith(
        `${window.location.origin}/?item=VIX-100`,
      )
    })
  })
})

describe('buildItemLink', () => {
  it('builds correct URL with identifier', () => {
    const url = buildItemLink('VIX-338')
    expect(url).toBe(`${window.location.origin}/?item=VIX-338`)
  })

  it('URL-encodes the identifier', () => {
    const url = buildItemLink('VIX-338')
    expect(url).toContain('item=VIX-338')
  })
})
