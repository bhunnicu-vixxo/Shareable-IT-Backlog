import { useState } from 'react'
import { Avatar, Box, Button, Flex, Text, VStack } from '@chakra-ui/react'
import { formatDateTime } from '@/utils/formatters'
import { MarkdownContent } from './markdown-content'
import type { BacklogItemComment } from '../types/backlog.types'

/** A top-level comment with its nested replies. */
interface ThreadedComment {
  comment: BacklogItemComment
  replies: BacklogItemComment[]
}

/** When a parent has more replies than this threshold, collapse extras. */
const VISIBLE_REPLIES_THRESHOLD = 3
/** How many replies to show before the "Show more" toggle. */
const INITIALLY_VISIBLE = 2

/**
 * Build a thread tree from a flat array of comments.
 *
 * Top-level comments (parentId === null) become roots.
 * Replies are grouped under their parent. Linear only supports
 * one level of threading, so we never deeply nest.
 */
function buildThreadTree(comments: BacklogItemComment[]): ThreadedComment[] {
  const idSet = new Set(comments.map((c) => c.id))
  const topLevel: BacklogItemComment[] = []
  const repliesMap = new Map<string, BacklogItemComment[]>()

  for (const comment of comments) {
    // Treat orphan replies (missing parent) as top-level so they aren't dropped.
    const isOrphanReply = !!comment.parentId && !idSet.has(comment.parentId)
    if (!comment.parentId || isOrphanReply) {
      topLevel.push(comment)
    } else {
      const existing = repliesMap.get(comment.parentId) ?? []
      existing.push(comment)
      repliesMap.set(comment.parentId, existing)
    }
  }

  // Ensure deterministic ordering regardless of backend sort assumptions.
  topLevel.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  for (const list of repliesMap.values()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  return topLevel.map((comment) => ({
    comment,
    replies: repliesMap.get(comment.id) ?? [],
  }))
}

/**
 * Extract initials from a name string.
 * "Jane Dev" → "JD", "Bob" → "B", null/empty → "?"
 */
function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]![0]!.toUpperCase()}${parts[parts.length - 1]![0]!.toUpperCase()}`
  }
  return name.charAt(0).toUpperCase()
}

export interface CommentThreadProps {
  /** Flat array of comments (already sorted chronologically by backend). */
  comments: BacklogItemComment[]
}

/**
 * Threaded comment display component.
 *
 * Groups comments by parentId into thread trees. Top-level comments
 * render at full width; replies are indented with teal left border.
 * Long reply chains (>3 replies) show a "Show N more replies" toggle.
 *
 * Accessible: uses role="list", aria-label, and semantic HTML.
 */
export function CommentThread({ comments }: CommentThreadProps) {
  const items = comments ?? []

  if (items.length === 0) {
    return (
      <Text fontSize="sm" color="brand.grayLight">
        No comments yet.
      </Text>
    )
  }

  const threads = buildThreadTree(items)

  return (
    <VStack
      as="ul"
      listStyleType="none"
      align="stretch"
      gap="3"
      role="list"
      aria-label="Comments"
    >
      {threads.map((thread) => (
        <Box as="li" key={thread.comment.id}>
          <CommentCard comment={thread.comment} isReply={false} />
          {thread.replies.length > 0 && (
            <ThreadReplies replies={thread.replies} />
          )}
        </Box>
      ))}
    </VStack>
  )
}

/** Renders the nested replies for a single thread, with collapse/expand. */
function ThreadReplies({ replies }: { replies: BacklogItemComment[] }) {
  const [expanded, setExpanded] = useState(false)
  const showToggle = replies.length > VISIBLE_REPLIES_THRESHOLD
  const visibleReplies = showToggle && !expanded
    ? replies.slice(0, INITIALLY_VISIBLE)
    : replies
  const hiddenCount = replies.length - INITIALLY_VISIBLE

  return (
    <VStack
      as="ul"
      listStyleType="none"
      align="stretch"
      gap="2"
      ml="8"
      mt="2"
      role="list"
      aria-label="Replies"
    >
      {visibleReplies.map((reply) => (
        <Box as="li" key={reply.id}>
          <CommentCard comment={reply} isReply />
        </Box>
      ))}
      {showToggle && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          color="brand.greenAccessible"
          fontWeight="medium"
          aria-label={`Show ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
        >
          Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
        </Button>
      )}
    </VStack>
  )
}

/** A single comment card with avatar, author, timestamp, and body. */
function CommentCard({
  comment,
  isReply,
}: {
  comment: BacklogItemComment
  isReply: boolean
}) {
  return (
    <Box
      p="3"
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.100"
      bg={isReply ? 'surface.raised' : 'surface.sunken'}
      borderLeftWidth={isReply ? '2px' : '1px'}
      borderLeftColor={isReply ? 'brand.teal' : 'gray.100'}
    >
      <Flex gap="3" alignItems="flex-start">
        <Avatar.Root size="sm" flexShrink={0}>
          {comment.userAvatarUrl && (
            <Avatar.Image src={comment.userAvatarUrl} alt={comment.userName ?? 'Unknown'} />
          )}
          <Avatar.Fallback name={comment.userName ?? 'Unknown'}>
            {getInitials(comment.userName)}
          </Avatar.Fallback>
        </Avatar.Root>
        <Box flex="1" minWidth="0">
          <Flex justifyContent="space-between" alignItems="center" mb="1">
            <Text fontSize="sm" fontWeight="600" color="brand.gray">
              {comment.userName ?? 'Unknown'}
            </Text>
            <Text fontSize="xs" color="brand.grayLight" flexShrink={0}>
              {formatDateTime(comment.createdAt)}
            </Text>
          </Flex>
          <MarkdownContent content={comment.body} />
        </Box>
      </Flex>
    </Box>
  )
}
