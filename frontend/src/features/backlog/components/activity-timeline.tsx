import { Box, Flex, Text, VStack } from '@chakra-ui/react'
import { formatDateTime } from '@/utils/formatters'
import type { IssueActivity } from '../types/backlog.types'

export interface ActivityTimelineProps {
  /** Activity entries in reverse-chronological order (newest first). */
  activities: IssueActivity[]
}

/**
 * Displays issue activity history in a compact timeline layout.
 *
 * - Reverse-chronological order (newest first)
 * - Visually distinct from Comments section (lighter, smaller, timeline dots)
 * - Section header with left accent stripe
 * - Brand teal timeline connector line
 * - Uses theme tokens only — no hardcoded hex values
 * - Accessible: semantic HTML, screen-reader friendly text
 */
export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const items = activities ?? []
  return (
    <Box>
      <Text
        fontSize="sm"
        fontWeight="700"
        color="brand.gray"
        mb="2"
        className="section-accent"
        fontFamily="heading"
        letterSpacing="-0.01em"
      >
        Activity ({items.length})
      </Text>
      {items.length === 0 ? (
        <Text fontSize="sm" color="brand.grayLight">
          No activity recorded yet
        </Text>
      ) : (
        <VStack
          as="ul"
          listStyleType="none"
          align="stretch"
          gap="0"
          borderLeftWidth="2px"
          borderColor="brand.tealLight"
          pl="4"
          ml="1"
          role="list"
          aria-label="Activity timeline"
        >
          {items.map((activity) => (
            <ActivityEntry key={activity.id} activity={activity} />
          ))}
        </VStack>
      )}
    </Box>
  )
}

function ActivityEntry({ activity }: { activity: IssueActivity }) {
  return (
    <Flex
      as="li"
      direction="column"
      position="relative"
      py="1.5"
      _before={{
        content: '""',
        position: 'absolute',
        left: '-5',
        top: '3',
        width: '2',
        height: '2',
        borderRadius: 'full',
        bg: 'brand.teal',
      }}
    >
      <Flex gap="2" alignItems="baseline" flexWrap="wrap">
        <Text fontSize="xs" color="brand.grayLight" flexShrink={0}>
          {formatDateTime(activity.createdAt)}
        </Text>
        <Text fontSize="xs" color="brand.gray" fontWeight="600" flexShrink={0}>
          {activity.actorName}
        </Text>
      </Flex>
      <Text fontSize="sm" color="brand.gray">
        {activity.description}
      </Text>
    </Flex>
  )
}
