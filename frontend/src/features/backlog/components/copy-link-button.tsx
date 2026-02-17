import { useCallback } from 'react'
import { Box, Button, IconButton } from '@chakra-ui/react'
import { Link } from 'lucide-react'
import { toaster } from '@/components/ui/toaster'
import { buildItemLink, copyToClipboard } from '../utils/clipboard'

export interface CopyLinkButtonProps {
  /** The Linear identifier (e.g. "VIX-338") used to build the shareable URL. */
  identifier: string
  /** Display variant: "icon" for compact list use, "button" for modal header. */
  variant?: 'icon' | 'button'
}

/**
 * Copies a deep-link URL for a specific backlog item to the clipboard.
 *
 * Builds a URL like `https://app.example.com/?item=VIX-338` that, when
 * opened, auto-opens the detail modal for that item.
 */
export function CopyLinkButton({ identifier, variant = 'icon' }: CopyLinkButtonProps) {
  const handleCopy = useCallback(async () => {
    const url = buildItemLink(identifier)
    const ok = await copyToClipboard(url)
    if (ok) {
      toaster.create({
        title: 'Link copied!',
        type: 'success',
        duration: 2000,
      })
    } else {
      toaster.create({
        title: 'Could not copy link',
        description: 'Your browser may not support clipboard access.',
        type: 'error',
        duration: 3000,
      })
    }
  }, [identifier])

  const ariaLabel = `Copy link to ${identifier}`

  if (variant === 'button') {
    return (
      <Button
        aria-label={ariaLabel}
        size="sm"
        variant="outline"
        color="fg.brand"
        borderColor="border.subtle"
        _hover={{ color: 'brand.greenAccessible', bg: 'brand.tealLight' }}
        onClick={handleCopy}
        data-testid="copy-link-button"
        gap="2"
      >
        <Link size={16} />
        <Box as="span">Copy link</Box>
      </Button>
    )
  }

  return (
    <IconButton
      aria-label={ariaLabel}
      size="xs"
      variant="ghost"
      color="fg.brandMuted"
      _hover={{ color: 'brand.greenAccessible', bg: 'brand.tealLight' }}
      onClick={handleCopy}
      data-testid="copy-link-button"
    >
      <Link size={14} />
    </IconButton>
  )
}
