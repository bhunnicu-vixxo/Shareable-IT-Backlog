import {
  Badge,
  Box,
  Dialog,
  Flex,
  Link,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { StackRankBadge } from '@/shared/components/ui/stack-rank-badge'
import { SHOW_OPEN_IN_LINEAR } from '@/utils/constants'
import { formatDateTime, formatDateOnly } from '@/utils/formatters'
import { useBacklogItemDetail } from '../hooks/use-backlog-item-detail'
import { STATUS_COLORS, DEFAULT_STATUS_COLORS } from '../utils/status-colors'
import type { BacklogItem, BacklogItemComment } from '../types/backlog.types'

export interface ItemDetailModalProps {
  /** Whether the modal is open. */
  isOpen: boolean
  /** ID of the backlog item to display. When null, modal does not fetch. */
  itemId: string | null
  /** Callback when modal is closed. */
  onClose: () => void
  /** Optional ref for the element that triggered the modal (for focus return). */
  triggerRef?: React.RefObject<HTMLElement | null>
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Box fontSize="sm" color="gray.700">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => <Text as="p" mb="2" whiteSpace="pre-wrap">{children}</Text>,
          strong: ({ children }) => <Text as="strong" fontWeight="600">{children}</Text>,
          a: ({ href, children }) => (
            <Link
              href={href ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              color="brand.green"
              textDecoration="underline"
              _hover={{ textDecoration: 'none' }}
            >
              {children}
            </Link>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}

function CommentBlock({ comment }: { comment: BacklogItemComment }) {
  return (
    <Box
      p="3"
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      bg="gray.50"
    >
      <Flex justifyContent="space-between" alignItems="center" mb="2">
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
          {comment.userName ?? 'Unknown'}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {formatDateTime(comment.createdAt)}
        </Text>
      </Flex>
      <MarkdownContent content={comment.body} />
    </Box>
  )
}

/**
 * Modal displaying full backlog item details and comments.
 *
 * - Uses Chakra UI Dialog with built-in focus trap, ESC to close, overlay click to close
 * - Fetches detail when itemId is set (lazy load)
 * - Handles loading and error (404) states
 */
export function ItemDetailModal({
  isOpen,
  itemId,
  onClose,
  triggerRef,
}: ItemDetailModalProps) {
  const { data, isLoading, isError, error } = useBacklogItemDetail(itemId)

  const handleOpenChange = (details: { open: boolean }) => {
    if (!details.open) onClose()
  }

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
        <Dialog.Content aria-label="Backlog item details">
          <Dialog.CloseTrigger
            position="absolute"
            top="2"
            right="2"
            aria-label="Close"
          />
          <Dialog.Header pt="6" pr="10" pb="2">
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
                  <Dialog.Title fontSize="lg" fontWeight="bold">
                    {data.item.title}
                  </Dialog.Title>
                  <Flex gap="2" mt="2" flexWrap="wrap" alignItems="center">
                    <Badge
                      fontSize="sm"
                      bg={(STATUS_COLORS[data.item.statusType] ?? DEFAULT_STATUS_COLORS).bg}
                      color={(STATUS_COLORS[data.item.statusType] ?? DEFAULT_STATUS_COLORS).color}
                      px="2"
                      py="0.5"
                      borderRadius="sm"
                    >
                      {data.item.status}
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      {data.item.identifier}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {data.item.teamName}
                    </Text>
                  </Flex>
                </Box>
              </Flex>
            )}
            {!isLoading && isError && (
              <Text fontSize="lg" fontWeight="bold" color="red.600">
                {error?.message ?? 'Failed to load item'}
              </Text>
            )}
          </Dialog.Header>

          <Dialog.Body pb="6">
            {isLoading && (
              <Stack gap="4">
                <Skeleton height="20" />
                <Skeleton height="32" />
              </Stack>
            )}

            {!isLoading && data && <ItemDetailContent item={data.item} comments={data.comments} />}

            {!isLoading && isError && (
              <Text color="gray.600">
                The item may have been deleted or you may not have access. Try closing and selecting another item.
              </Text>
            )}
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" pt="4">
            {SHOW_OPEN_IN_LINEAR && data?.item.url && (
              <Link
                href={data.item.url}
                target="_blank"
                rel="noopener noreferrer"
                fontWeight="semibold"
                color="brand.green"
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
}: {
  item: BacklogItem
  comments: BacklogItemComment[]
}) {
  return (
    <VStack align="stretch" gap="4">
      {/* Metadata grid */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
        gap="3"
      >
        <DetailField label="Priority" value={item.priorityLabel} />
        <DetailField label="Assignee" value={item.assigneeName} />
        <DetailField label="Due date" value={item.dueDate ? formatDateOnly(item.dueDate) : null} />
        <DetailField label="Created" value={formatDateOnly(item.createdAt)} />
        <DetailField label="Updated" value={formatDateOnly(item.updatedAt)} />
      </Box>

      {/* Labels */}
      {item.labels.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb="1">
            Labels
          </Text>
          <Flex gap="1" flexWrap="wrap">
            {item.labels.map((label) => (
              <Box
                key={label.id}
                px="2"
                py="0.5"
                borderRadius="sm"
                fontSize="xs"
                bg="gray.100"
                color="gray.700"
              >
                {label.name}
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {/* Description */}
      {item.description && (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb="1">
            Description
          </Text>
          <MarkdownContent content={item.description} />
        </Box>
      )}

      {/* Comments */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb="2">
          Comments ({comments.length})
        </Text>
        {comments.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            No comments yet.
          </Text>
        ) : (
          <VStack align="stretch" gap="2">
            {comments.map((comment) => (
              <CommentBlock key={comment.id} comment={comment} />
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
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
      <Text fontSize="xs" color="gray.500" fontWeight="medium">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800">
        {value ?? '—'}
      </Text>
    </Box>
  )
}
