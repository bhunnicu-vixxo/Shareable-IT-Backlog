import { Badge, Box } from '@chakra-ui/react'
import { useLocation, useNavigate } from 'react-router'
import { useUnseenCount } from '@/features/backlog/hooks/use-unseen-count'
import { useMarkSeen } from '@/features/backlog/hooks/use-mark-seen'

/**
 * Displays a count of unseen backlog items in the app header.
 *
 * - count > 0: shows a colored badge (e.g., "5 new")
 * - count = 0 or loading/error: hidden entirely
 * - Clicking navigates to the backlog page with `?unseen=1` to filter unseen items
 * - If already filtering unseen, clicking removes the filter
 * - Clicking also triggers mark-seen after a short delay (the user has acknowledged the new items)
 */
export function UnseenBadge() {
  const { data, isLoading } = useUnseenCount()
  const location = useLocation()
  const navigate = useNavigate()
  const { trigger: triggerMarkSeen } = useMarkSeen({ delayMs: 2000 })

  const count = data?.unseenCount ?? 0
  const params = new URLSearchParams(location.search)
  const isFilterActive = location.pathname === '/' && params.get('unseen') === '1'

  const handleClick = () => {
    if (isFilterActive) {
      params.delete('unseen')
      const search = params.toString()
      navigate({ pathname: '/', search: search ? `?${search}` : '' }, { replace: true })
    } else {
      // Preserve existing params (labels, q, sort, item deep-link, etc.) when enabling the filter.
      params.set('unseen', '1')
      const search = params.toString()
      navigate({ pathname: '/', search: search ? `?${search}` : '?unseen=1' })
      // Clicking the badge is a clear signal the user has seen the new items.
      triggerMarkSeen()
    }
  }

  if (isLoading || count === 0) return null

  return (
    <Box
      as="button"
      onClick={handleClick}
      aria-label={
        isFilterActive
          ? `Showing ${count} unseen items. Click to show all items.`
          : `${count} new items. Click to filter to unseen items only.`
      }
      aria-pressed={isFilterActive}
      cursor="pointer"
      _hover={{ opacity: 0.85 }}
      transition="opacity 0.15s"
      data-testid="unseen-badge"
    >
      <Badge
        colorPalette={isFilterActive ? 'green' : 'blue'}
        variant={isFilterActive ? 'solid' : 'subtle'}
        fontSize="xs"
        px={2}
        py={0.5}
        borderRadius="full"
      >
        {count} new
      </Badge>
    </Box>
  )
}
