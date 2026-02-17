import { memo, forwardRef } from 'react'
import { Badge, Box, Flex, HStack, Link, Skeleton, Text, Tooltip, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { usePermissions } from '@/features/auth/hooks/use-permissions'
import { StackRankBadge } from '@/shared/components/ui/stack-rank-badge'
import { CopyLinkButton } from './copy-link-button'
import { getStatusColor } from '../utils/status-colors'
import { getLabelColor } from '../utils/label-colors'
import { highlightText } from '../utils/highlight'
import type { BacklogItem } from '../types/backlog.types'

function descriptionPreviewFromMarkdown(input: string, maxChars: number): string {
  // Convert common markdown patterns into a readable plain-text preview.
  // This intentionally avoids a full markdown parse to keep the card lightweight.
  const withoutImages = input.replace(/!\[[^\]]*?\]\([^)]+?\)/g, '')
  const withoutLinks = withoutImages.replace(/\[([^\]]+?)\]\([^)]+?\)/g, '$1')
  const withoutInlineCode = withoutLinks.replace(/`([^`]+?)`/g, '$1')
  const withoutBold = withoutInlineCode.replace(/\*\*(.*?)\*\*/g, '$1')
  const withoutItalics = withoutBold.replace(/\*(.*?)\*/g, '$1')
  const withoutHeadings = withoutItalics.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  const withoutListMarkers = withoutHeadings.replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '')
  const normalizedWhitespace = withoutListMarkers.replace(/\s+/g, ' ').trim()

  if (normalizedWhitespace.length <= maxChars) return normalizedWhitespace

  const hard = normalizedWhitespace.slice(0, maxChars)
  const lastSpace = hard.lastIndexOf(' ')
  const clipped = lastSpace > Math.floor(maxChars * 0.7) ? hard.slice(0, lastSpace) : hard
  return `${clipped}…`
}

export interface BacklogItemCardProps {
  item: BacklogItem
  /** Optional click handler. When provided, card is clickable (cursor pointer, keyboard activatable). */
  onClick?: () => void
  /** Search tokens to highlight in the title (and other visible text). Empty array = no highlights. */
  highlightTokens?: string[]
  /** Card layout variant. "default" = full layout; "compact" = condensed without description/labels. */
  variant?: 'default' | 'compact'
  /** Sequential stack rank position (1-based). Shown in badge instead of priority number. */
  stackRank?: number
  /**
   * When provided, labels are filtered to only those names included in the set.
   * Used to hide non-visible labels for non-privileged users.
   */
  visibleLabelNames?: ReadonlySet<string>
}

/**
 * Displays a single backlog item in a scannable card format.
 *
 * Features priority color stripe on left edge, elevated shadow on hover,
 * and smooth translateX interaction for a polished feel.
 *
 * Layout:
 *  [Priority Badge]  Title
 *                    Description preview (2 lines)
 *                    Status | Team | Identifier
 *                    Labels: [Label1] [Label2]
 */
export const BacklogItemCard = memo(
  forwardRef<HTMLDivElement, BacklogItemCardProps>(function BacklogItemCard(
    {
      item,
      onClick,
      highlightTokens = [],
      variant,
      stackRank,
      visibleLabelNames,
    }: BacklogItemCardProps,
    ref,
  ) {
    const { canViewLinearLinks } = usePermissions()
    const isClickable = !!onClick
    const hasExplicitVariant = variant !== undefined
    const effectiveVariant = variant ?? 'default'
    const isCompact = effectiveVariant === 'compact'
    const descriptionPreview = item.description
      ? descriptionPreviewFromMarkdown(item.description, 240)
      : null
    const labelsToRender = visibleLabelNames
      ? item.labels.filter((l) => visibleLabelNames.has(l.name))
      : item.labels

    const statusColor = getStatusColor(item.statusType)

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isClickable) return
      if (e.currentTarget !== e.target) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    }

    return (
      <Box
        position="relative"
        className="card-wrapper"
        _hover={{ '& .copy-link-reveal': { opacity: 1 } }}
        // Keyboard: when the card itself is focused, reveal the copy-link affordance
        // (AC: hover OR focus should show the button).
        _focusWithin={{ '& .copy-link-reveal': { opacity: 1 } }}
      >
        <Tooltip.Root openDelay={400} closeDelay={100}>
          <Flex
            ref={ref}
            className={isClickable ? 'card-interactive' : undefined}
            p={hasExplicitVariant ? (isCompact ? '2' : '4') : { base: '2', md: '4' }}
            bg="surface.raised"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="lg"
            borderLeftWidth="4px"
            borderLeftColor={statusColor.borderColor}
            boxShadow="0 1px 2px rgba(62,69,67,0.04)"
            gap="4"
            alignItems="flex-start"
            _hover={{ bg: 'surface.hover' }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'brand.green',
              outlineOffset: '2px',
              borderColor: 'brand.green',
            }}
            aria-label={`${stackRank != null ? `Rank ${stackRank}, ` : ''}${item.title}, Priority ${item.priorityLabel}, Status: ${item.status}, Business Unit: ${item.teamName}${item.isNew ? ', New item' : ''}`}
            role={isClickable ? 'button' : 'article'}
            tabIndex={isClickable ? 0 : undefined}
            cursor={isClickable ? 'pointer' : undefined}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            data-variant={effectiveVariant}
            data-status-type={item.statusType}
            data-status-border-color={statusColor.borderColor}
            position="relative"
          >
            {/* Tooltip trigger only over the indicator area (left border). */}
            <Tooltip.Trigger asChild>
              <Box
                position="absolute"
                left="0"
                top="0"
                bottom="0"
                w="10px"
                data-testid="status-indicator"
              />
            </Tooltip.Trigger>
            {/* Left: Stack rank badge */}
            <StackRankBadge
              priority={item.priority}
              priorityLabel={item.priorityLabel}
              stackRank={stackRank}
              {...(isCompact ? { size: 'sm' } : {})}
            />

            {/* Center: Content */}
            <Box flex="1" minWidth="0">
              {/* Title */}
              <Text fontWeight="bold" fontSize="md" truncate color="fg.brand" letterSpacing="-0.01em">
                {highlightTokens.length > 0 ? highlightText(item.title, highlightTokens) : item.title}
              </Text>

              {/* Description (truncated to 2 lines) — hidden in compact mode / mobile when no variant set */}
              {descriptionPreview && (
                <Text
                  fontSize="sm"
                  color="fg.brandMuted"
                  lineClamp={2}
                  data-testid="card-description"
                  mt="0.5"
                  lineHeight="1.5"
                  display={
                    hasExplicitVariant
                      ? isCompact
                        ? 'none'
                        : 'block'
                      : { base: 'none', md: 'block' }
                  }
                >
                  {highlightTokens.length > 0
                    ? highlightText(descriptionPreview, highlightTokens)
                    : descriptionPreview}
                </Text>
              )}

              {/* Metadata row */}
              <HStack gap="2" mt="1.5" flexWrap="wrap">
                <StatusBadge status={item.status} statusType={item.statusType} />
                {item.isNew && <NewItemBadge />}
                <Text fontSize="xs" color="fg.brandMuted">
                  {item.teamName}
                </Text>
                {canViewLinearLinks && item.url ? (
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    fontSize="sm"
                    color="fg.brandMuted"
                    className="mono-id"
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline', color: 'brand.greenAccessible' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.identifier}
                  </Link>
                ) : (
                  <Text fontSize="sm" color="fg.brandMuted" className="mono-id">
                    {item.identifier}
                  </Text>
                )}
                <Text fontSize="xs" color="fg.brandMuted">
                  {item.updatedAt === item.createdAt
                    ? `Created ${formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}`
                    : `Updated ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}`}
                </Text>
              </HStack>

              {/* Labels row — hidden in compact mode / mobile when no variant set */}
              {labelsToRender.length > 0 && (
                <HStack
                  gap="1"
                  mt="1.5"
                  flexWrap="wrap"
                  display={
                    hasExplicitVariant ? (isCompact ? 'none' : 'flex') : { base: 'none', md: 'flex' }
                  }
                >
                  {labelsToRender.map((label) => {
                    const labelColor = getLabelColor(label.name)
                    return (
                      <HStack
                        key={label.id}
                        gap="1.5"
                        px="2"
                        py="0.5"
                        borderRadius="full"
                        fontSize="xs"
                        bg={labelColor.bg}
                        color={labelColor.color}
                        fontWeight="600"
                      >
                        <Box w="6px" h="6px" borderRadius="full" bg={labelColor.dot} flexShrink={0} />
                        {label.name}
                      </HStack>
                    )
                  })}
                </HStack>
              )}
            </Box>
          </Flex>
          <Tooltip.Positioner>
            <Tooltip.Content px="3" py="1.5" fontSize="xs" borderRadius="md">
              Status: {statusColor.label}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>

        {/* Copy link button — positioned outside the role="button" card to avoid nested-interactive a11y violation */}
        <Box
          className="copy-link-reveal"
          position="absolute"
          top="2"
          right="2"
          opacity={0}
          transition="opacity 0.15s ease"
          _focusWithin={{ opacity: 1 }}
          zIndex={1}
        >
          <CopyLinkButton identifier={item.identifier} variant="icon" />
        </Box>
      </Box>
    )
  }),
)
BacklogItemCard.displayName = 'BacklogItemCard'

/**
 * "New" badge for items recently added to the backlog.
 * Uses Vixxo Yellow (brand.yellow) as background with dark text for WCAG AA contrast.
 * Includes text label so colour is not the sole indicator (accessibility).
 */
function NewItemBadge() {
  return (
    <Badge
      fontSize="xs"
      bg="brand.yellow"
      color="brand.gray"
      px="2"
      py="0.5"
      borderRadius="full"
      fontWeight="semibold"
      aria-label="New item"
    >
      New
    </Badge>
  )
}

/** Status badge component with color coding based on workflow state type. */
function StatusBadge({ status, statusType }: { status: string; statusType: string }) {
  const colors = getStatusColor(statusType)

  return (
    <Badge
      fontSize="sm"
      bg={colors.bg}
      color={colors.color}
      px="2"
      py="0.5"
      borderRadius="full"
      fontWeight="semibold"
      aria-label={`Status: ${status}`}
    >
      {status}
    </Badge>
  )
}

/**
 * Loading skeleton matching the BacklogItemCard layout.
 * Renders a placeholder with priority badge skeleton, title skeleton, and metadata skeleton.
 */
export function BacklogItemCardSkeleton({ variant }: { variant?: 'default' | 'compact' } = {}) {
  const effectiveVariant = variant ?? 'default'
  const isCompact = effectiveVariant === 'compact'

  return (
    <Flex
      p={isCompact ? '2' : '4'}
      borderWidth="1px"
      borderColor="gray.100"
      borderRadius="lg"
      gap="4"
      alignItems="flex-start"
      bg="surface.raised"
      boxShadow="0 1px 2px rgba(62,69,67,0.04)"
      data-testid="backlog-item-card-skeleton"
      data-variant={effectiveVariant}
    >
      {/* Priority badge skeleton */}
      <Skeleton boxSize={isCompact ? '6' : '8'} borderRadius="full" />

      {/* Content skeleton */}
      <VStack flex="1" gap="2" align="stretch">
        {/* Title skeleton */}
        <Skeleton height="5" width="60%" />
        {/* Description skeleton (default only) */}
        {!isCompact && <Skeleton height="4" width="80%" />}
        {/* Metadata skeleton */}
        <Skeleton height="4" width="40%" />
      </VStack>
    </Flex>
  )
}
