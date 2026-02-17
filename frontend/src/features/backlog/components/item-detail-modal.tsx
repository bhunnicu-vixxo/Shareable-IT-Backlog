import {
  Badge,
  Box,
  Dialog,
  Flex,
  HStack,
  Link,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { usePermissions } from '@/features/auth/hooks/use-permissions'
import { StackRankBadge } from '@/shared/components/ui/stack-rank-badge'
import { ApiError } from '@/utils/api-error'
import { formatDateOnly } from '@/utils/formatters'
import { useBacklogItemDetail } from '../hooks/use-backlog-item-detail'
import { getStatusColor } from '../utils/status-colors'
import { getLabelColor } from '../utils/label-colors'
import { CopyLinkButton } from './copy-link-button'
import { ActivityTimeline } from './activity-timeline'
import { CommentThread } from './comment-thread'
import { ItemErrorState } from './item-error-state'
import { ItemNotFoundState } from './item-not-found-state'
import { MarkdownContent } from './markdown-content'
import type { BacklogItem, BacklogItemComment, IssueActivity } from '../types/backlog.types'

/** Maps priority number to a top-border color for the modal header accent. */
const PRIORITY_ACCENT_COLORS: Record<number, string> = {
  1: '#E53E3E',   // Urgent — red
  2: '#956125',   // High — copper
  3: '#2C7B80',   // Normal — teal
  4: '#395389',   // Low — blue
  0: '#CBD5E0',   // None — light gray
}

/**
 * Layout-accurate skeleton for the item detail modal body.
 * Shows description lines, comment card placeholders, and activity timeline placeholders.
 */
export function ItemDetailBodySkeleton() {
  return (
    <VStack align="stretch" gap="4" data-testid="item-detail-body-skeleton">
      {/* Description section */}
      <Box>
        <Skeleton height="5" width="100px" mb="2" />
        <VStack align="stretch" gap="2">
          <Skeleton height="4" width="100%" />
          <Skeleton height="4" width="95%" />
          <Skeleton height="4" width="80%" />
          <Skeleton height="4" width="60%" />
        </VStack>
      </Box>

      {/* Comments section */}
      <Box>
        <Skeleton height="5" width="100px" mb="3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <HStack key={i} gap="3" align="start" mb="3">
            <Skeleton boxSize="8" borderRadius="full" flexShrink={0} />
            <VStack align="stretch" gap="1" flex="1">
              <HStack gap="2">
                <Skeleton height="4" width="80px" />
                <Skeleton height="3" width="60px" />
              </HStack>
              <Skeleton height="4" width="90%" />
              <Skeleton height="4" width="70%" />
            </VStack>
          </HStack>
        ))}
      </Box>

      {/* Activity section */}
      <Box>
        <Skeleton height="5" width="80px" mb="3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <HStack key={i} gap="2" mb="2">
            <Skeleton boxSize="3" borderRadius="full" flexShrink={0} />
            <Skeleton height="4" width="70%" />
          </HStack>
        ))}
      </Box>
    </VStack>
  )
}

export interface ItemDetailModalProps {
  /** Whether the modal is open. */
  isOpen: boolean
  /** ID of the backlog item to display. When null, modal does not fetch. */
  itemId: string | null
  /** Callback when modal is closed. */
  onClose: () => void
  /** Optional ref for the element that triggered the modal (for focus return). */
  triggerRef?: React.RefObject<HTMLElement | null>
  /**
   * When provided, labels are filtered to only those names included in the set.
   * Used to hide non-visible labels for non-privileged users.
   */
  visibleLabelNames?: ReadonlySet<string>
}

/**
 * Modal displaying full backlog item details and comments.
 *
 * Features:
 * - Priority accent color on top border
 * - Section headers with left-accent decorators
 * - Refined metadata grid with clear label/value hierarchy
 * - Scale-in entrance animation
 */
export function ItemDetailModal({
  isOpen,
  itemId,
  onClose,
  triggerRef,
  visibleLabelNames,
}: ItemDetailModalProps) {
  const { canViewLinearLinks } = usePermissions()
  const { data, isLoading, isError, error, refetch } = useBacklogItemDetail(itemId)

  const isNotFoundError =
    isError && error instanceof ApiError && error.isNotFound

  const statusColor = data?.item ? getStatusColor(data.item.statusType) : null

  const handleOpenChange = (details: { open: boolean }) => {
    if (!details.open) onClose()
  }

  // Priority accent for top border
  const accentColor = data?.item
    ? PRIORITY_ACCENT_COLORS[data.item.priority] ?? PRIORITY_ACCENT_COLORS[0]
    : undefined

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      size="xl"
      placement="center"
      scrollBehavior="inside"
      restoreFocus
      finalFocusEl={triggerRef ? () => triggerRef.current : undefined}
      trapFocus
      closeOnEscape
      closeOnInteractOutside
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          aria-label="Backlog item details"
          borderRadius="xl"
          overflow="hidden"
          borderTopWidth={accentColor ? '3px' : undefined}
          borderTopColor={accentColor}
        >
          {!isError && (
            <Dialog.CloseTrigger
              position="absolute"
              top="2"
              right="2"
              aria-label="Close"
            />
          )}
          <Dialog.Header pt="6" pr="10" pb="2" bg="surface.raised">
            {isLoading && (
              <Flex gap="4" alignItems="flex-start">
                <Skeleton boxSize="10" borderRadius="full" flexShrink={0} />
                <VStack align="stretch" flex="1" gap="2">
                  <Skeleton height="6" width="80%" />
                  <Skeleton height="4" width="40%" />
                </VStack>
              </Flex>
            )}
            {!isLoading && data && (
              <Flex gap="4" alignItems="flex-start">
                <StackRankBadge
                  priority={data.item.priority}
                  priorityLabel={data.item.priorityLabel}
                />
                <Box flex="1" minWidth="0">
                  <Dialog.Title
                    fontSize="lg"
                    fontWeight="bold"
                    fontFamily="heading"
                    letterSpacing="-0.02em"
                    color="fg.brand"
                  >
                    {data.item.title}
                  </Dialog.Title>
                  <Flex gap="2" mt="2" flexWrap="wrap" alignItems="center">
                    <Badge
                      fontSize="sm"
                      bg={statusColor?.bg}
                      color={statusColor?.color}
                      px="2"
                      py="0.5"
                      borderRadius="full"
                    >
                      {data.item.status}
                    </Badge>
                    {canViewLinearLinks && data.item.url ? (
                      <Link
                        href={data.item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        fontSize="sm"
                        color="fg.brandMuted"
                        className="mono-id"
                        textDecoration="none"
                        _hover={{ textDecoration: 'underline', color: 'brand.greenAccessible' }}
                      >
                        {data.item.identifier}
                      </Link>
                    ) : (
                      <Text fontSize="sm" color="fg.brandMuted" className="mono-id">
                        {data.item.identifier}
                      </Text>
                    )}
                    <CopyLinkButton identifier={data.item.identifier} variant="button" />
                  </Flex>
                </Box>
              </Flex>
            )}
            {!isLoading && isError && (
              <Dialog.Title fontSize="lg" fontWeight="bold" color="fg.brand" fontFamily="heading">
                Item Unavailable
              </Dialog.Title>
            )}
          </Dialog.Header>

          <Dialog.Body pb="6" bg="surface.raised">
            {isLoading && <ItemDetailBodySkeleton />}

            {!isLoading && data && (
              <ItemDetailContent
                item={data.item}
                comments={data.comments}
                activities={data.activities}
                visibleLabelNames={visibleLabelNames}
              />
            )}

            {!isLoading && isError && isNotFoundError && (
              <ItemNotFoundState onClose={onClose} />
            )}

            {!isLoading && isError && !isNotFoundError && (
              <ItemErrorState
                onRetry={() => refetch()}
                onClose={onClose}
              />
            )}
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle" pt="4" bg="surface.raised">
            {canViewLinearLinks && data?.item.url && (
              <Link
                href={data.item.url}
                target="_blank"
                rel="noopener noreferrer"
                fontWeight="semibold"
                color="brand.greenAccessible"
                _hover={{ textDecoration: 'underline' }}
              >
                Open in Linear →
              </Link>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

function ItemDetailContent({
  item,
  comments,
  activities,
  visibleLabelNames,
}: {
  item: BacklogItem
  comments: BacklogItemComment[]
  activities: IssueActivity[]
  visibleLabelNames?: ReadonlySet<string>
}) {
  const labelsToRender = visibleLabelNames
    ? item.labels.filter((l) => visibleLabelNames.has(l.name))
    : item.labels
  return (
    <VStack align="stretch" gap="5">
      {/* Metadata grid — refined label/value hierarchy */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
        gap="4"
        p="4"
        bg="surface.sunken"
        borderRadius="lg"
      >
        <DetailField label="Priority" value={item.priorityLabel} />
        <DetailField label="Business Unit" value={item.teamName} />
        <DetailField label="Assignee" value={item.assigneeName} />
        <DetailField label="Due date" value={item.dueDate ? formatDateOnly(item.dueDate) : null} />
        <DetailField label="Created" value={formatDateOnly(item.createdAt)} />
        <DetailField label="Updated" value={formatDateOnly(item.updatedAt)} />
      </Box>

      {/* Labels */}
      {labelsToRender.length > 0 && (
        <Box>
          <SectionHeading>Labels</SectionHeading>
          <Flex gap="1.5" flexWrap="wrap">
            {labelsToRender.map((label) => {
              const labelColor = getLabelColor(label.name)
              return (
                <HStack
                  key={label.id}
                  gap="1.5"
                  px="2.5"
                  py="1"
                  borderRadius="full"
                  fontSize="xs"
                  bg={labelColor.bg}
                  color={labelColor.color}
                  fontWeight="600"
                >
                  <Box
                    w="7px"
                    h="7px"
                    borderRadius="full"
                    bg={labelColor.dot}
                    flexShrink={0}
                  />
                  {label.name}
                </HStack>
              )
            })}
          </Flex>
        </Box>
      )}

      {/* Description */}
      {item.description && (
        <Box>
          <SectionHeading>Description</SectionHeading>
          <MarkdownContent content={item.description} />
        </Box>
      )}

      {/* Activity */}
      <ActivityTimeline activities={activities} />

      {/* Comments */}
      <Box>
        <SectionHeading>Comments ({comments.length})</SectionHeading>
        <CommentThread comments={comments} />
      </Box>
    </VStack>
  )
}

/** Section heading with left accent stripe for visual hierarchy. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="sm"
      fontWeight="700"
      color="fg.brand"
      mb="2"
      className="section-accent"
      fontFamily="heading"
      letterSpacing="-0.01em"
    >
      {children}
    </Text>
  )
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.brandMuted" fontWeight="500" textTransform="uppercase" letterSpacing="0.04em">
        {label}
      </Text>
      <Text fontSize="sm" color="fg.brand" fontWeight="600" mt="0.5">
        {value ?? '—'}
      </Text>
    </Box>
  )
}
