import { useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useLabelVisibility, useLabelVisibilityMutation } from '../hooks/use-label-visibility'
import type { LabelVisibilityEntry } from '../types/admin.types'
import { getLabelColor } from '@/features/backlog/utils/label-colors'

/**
 * Admin component for managing label visibility settings.
 *
 * Features:
 * - Lists all labels with toggle switches for visibility
 * - Unreviewed labels shown at top with "New" badge
 * - Search/filter input for finding labels by name
 * - Bulk "Enable All" / "Disable All" actions
 * - Colored dot per label (consistent with backlog filter)
 */
export function LabelVisibilityManager() {
  const { labels, unreviewedCount, isLoading, error } = useLabelVisibility()
  const { updateLabel, bulkUpdateLabels, isPending } = useLabelVisibilityMutation()
  const [search, setSearch] = useState('')

  const filteredLabels = useMemo(() => {
    if (!search.trim()) return labels
    const lower = search.toLowerCase()
    return labels.filter((l) => l.labelName.toLowerCase().includes(lower))
  }, [labels, search])

  const unreviewedLabels = useMemo(
    () => filteredLabels.filter((l) => l.reviewedAt === null),
    [filteredLabels],
  )

  const reviewedLabels = useMemo(
    () => filteredLabels.filter((l) => l.reviewedAt !== null),
    [filteredLabels],
  )

  async function handleToggle(label: LabelVisibilityEntry) {
    try {
      await updateLabel({ labelName: label.labelName, isVisible: !label.isVisible })
    } catch {
      // Error state is exposed via the mutation hook
    }
  }

  async function handleBulkEnable() {
    const updates = filteredLabels
      .filter((l) => !l.isVisible)
      .map((l) => ({ labelName: l.labelName, isVisible: true }))
    if (updates.length === 0) return
    try {
      await bulkUpdateLabels(updates)
    } catch {
      // Error state is exposed via the mutation hook
    }
  }

  async function handleBulkDisable() {
    const updates = filteredLabels
      .filter((l) => l.isVisible)
      .map((l) => ({ labelName: l.labelName, isVisible: false }))
    if (updates.length === 0) return
    try {
      await bulkUpdateLabels(updates)
    } catch {
      // Error state is exposed via the mutation hook
    }
  }

  if (isLoading) {
    return (
      <Flex
        justify="center"
        align="center"
        py={16}
        data-testid="label-visibility-loading"
      >
        <Spinner size="lg" color="brand.teal" />
      </Flex>
    )
  }

  if (error) {
    return (
      <Box
        p={6}
        bg="red.50"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="red.200"
        data-testid="label-visibility-error"
      >
        <Text color="red.700" fontWeight="600">
          Failed to load labels: {error.message}
        </Text>
      </Box>
    )
  }

  if (labels.length === 0) {
    return (
      <VStack
        gap={4}
        py={12}
        color="fg.brandMuted"
        align="center"
        bg="surface.raised"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="border.subtle"
        boxShadow="0 1px 2px rgba(62,69,67,0.04)"
        data-testid="label-visibility-empty"
      >
        <Text fontSize="lg" fontWeight="600" fontFamily="heading" color="fg.brand">
          No Labels Found
        </Text>
        <Text fontSize="sm" textAlign="center" maxW="400px">
          Labels will appear here after the first sync with Linear discovers them.
        </Text>
      </VStack>
    )
  }

  return (
    <VStack gap={4} align="stretch" data-testid="label-visibility-manager">
      {/* Header with search and bulk actions */}
      <Flex
        gap={3}
        direction={{ base: 'column', sm: 'row' }}
        align={{ base: 'stretch', sm: 'center' }}
        justify="space-between"
      >
        <Input
          placeholder="Search labels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW={{ sm: '280px' }}
          size="sm"
          borderRadius="md"
          data-testid="label-search-input"
          aria-label="Search labels by name"
        />
        <HStack gap={2} flexShrink={0}>
          <Button
            size="xs"
            variant="outline"
            onClick={handleBulkEnable}
            disabled={isPending}
            data-testid="bulk-enable-btn"
          >
            Enable All
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={handleBulkDisable}
            disabled={isPending}
            data-testid="bulk-disable-btn"
          >
            Disable All
          </Button>
        </HStack>
      </Flex>

      {/* Unreviewed labels section */}
      {unreviewedLabels.length > 0 && (
        <Box
          bg="surface.raised"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="border.subtle"
          boxShadow="0 1px 2px rgba(62,69,67,0.04)"
          overflow="hidden"
        >
          <Box px={4} py={3} bg="surface.sunken" borderBottomWidth="1px" borderColor="border.subtle">
            <HStack gap={2}>
              <Text fontSize="sm" fontWeight="700" color="fg.brand">
                Unreviewed Labels
              </Text>
              <Badge colorPalette="orange" size="sm" data-testid="unreviewed-badge">
                {unreviewedCount}
              </Badge>
            </HStack>
          </Box>
          <VStack gap={0} align="stretch">
            {unreviewedLabels.map((label) => (
              <LabelRow
                key={label.labelName}
                label={label}
                isNew
                isPending={isPending}
                onToggle={handleToggle}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* All reviewed labels */}
      {reviewedLabels.length > 0 && (
        <Box
          bg="surface.raised"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="border.subtle"
          boxShadow="0 1px 2px rgba(62,69,67,0.04)"
          overflow="hidden"
        >
          <Box px={4} py={3} bg="surface.sunken" borderBottomWidth="1px" borderColor="border.subtle">
            <Text fontSize="sm" fontWeight="700" color="fg.brand">
              All Labels
            </Text>
          </Box>
          <VStack gap={0} align="stretch">
            {reviewedLabels.map((label) => (
              <LabelRow
                key={label.labelName}
                label={label}
                isNew={false}
                isPending={isPending}
                onToggle={handleToggle}
              />
            ))}
          </VStack>
        </Box>
      )}

      {filteredLabels.length === 0 && search.trim() && (
        <Text fontSize="sm" color="fg.brandMuted" textAlign="center" py={8}>
          No labels matching &quot;{search}&quot;
        </Text>
      )}
    </VStack>
  )
}

interface LabelRowProps {
  label: LabelVisibilityEntry
  isNew: boolean
  isPending: boolean
  onToggle: (label: LabelVisibilityEntry) => void
}

function LabelRow({ label, isNew, isPending, onToggle }: LabelRowProps) {
  const labelColor = getLabelColor(label.labelName)

  return (
    <Flex
      px={4}
      py={3}
      align="center"
      justify="space-between"
      gap={3}
      borderBottomWidth="1px"
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
      data-testid={`label-row-${label.labelName}`}
    >
      <HStack gap={3} flex={1} minW={0}>
        {/* Colored dot */}
        <Box
          w="10px"
          h="10px"
          borderRadius="full"
          bg={labelColor.dot}
          flexShrink={0}
          aria-hidden="true"
        />

        {/* Label name + badges */}
        <HStack gap={2} minW={0}>
          <Text fontSize="sm" fontWeight="500" truncate>
            {label.labelName}
          </Text>
          {isNew && (
            <Badge colorPalette="orange" size="sm" data-testid="new-badge">
              New
            </Badge>
          )}
        </HStack>
      </HStack>

      {/* Item count */}
      <Text fontSize="xs" color="fg.brandMuted" flexShrink={0}>
        {label.itemCount} {label.itemCount === 1 ? 'item' : 'items'}
      </Text>

      {/* Toggle switch — explicit colors for dark mode visibility */}
      <Switch.Root
        checked={label.isVisible}
        onCheckedChange={() => onToggle(label)}
        disabled={isPending}
        aria-label={`Show ${label.labelName} in filter`}
        data-testid={`toggle-${label.labelName}`}
        size="sm"
      >
        <Switch.HiddenInput />
        <Switch.Control
          css={{
            backgroundColor: 'var(--switch-off-bg, #4A5568)',
            '&[data-state=checked]': {
              backgroundColor: 'var(--switch-on-bg, #8E992E)',
            },
          }}
          style={{
            '--switch-off-bg': '#4A5568',
            '--switch-on-bg': '#8E992E',
          } as React.CSSProperties}
        >
          <Switch.Thumb
            css={{
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </Switch.Control>
      </Switch.Root>
    </Flex>
  )
}
