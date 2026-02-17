import { useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Link as ChakraLink,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { toaster } from '@/components/ui/toaster'
import {
  useTriageQueue,
  useApproveRequest,
  useRejectRequest,
} from '../hooks/use-requests'
import { REQUEST_STATUS_CONFIG, type ITRequest } from '../types/request.types'

function TriageCard({ request }: { request: ITRequest }) {
  const { approveRequest, isApproving } = useApproveRequest()
  const { rejectRequest, isRejecting } = useRejectRequest()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const statusConfig = REQUEST_STATUS_CONFIG[request.status]
  const dateStr = new Date(request.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const isPending = request.status === 'submitted' || request.status === 'reviewing'

  const handleApprove = async () => {
    try {
      const approved = await approveRequest({ id: request.id })
      toaster.create({
        title: 'Request approved',
        description: approved.linearIssueUrl
          ? 'A Linear issue has been created for this request.'
          : 'Request approved. Linear issue creation may be pending or failed.',
        type: approved.linearIssueUrl ? 'success' : 'warning',
      })
    } catch {
      toaster.create({
        title: 'Approval failed',
        description: 'Could not approve the request. Please try again.',
        type: 'error',
      })
    }
  }

  const handleReject = async () => {
    if (rejectionReason.trim().length < 5) {
      toaster.create({
        title: 'Reason required',
        description: 'Please provide a rejection reason (at least 5 characters).',
        type: 'warning',
      })
      return
    }

    try {
      await rejectRequest({
        id: request.id,
        rejectionReason: rejectionReason.trim(),
      })
      toaster.create({
        title: 'Request rejected',
        description: 'The submitter will see your rejection reason.',
        type: 'info',
      })
      setShowRejectForm(false)
      setRejectionReason('')
    } catch {
      toaster.create({
        title: 'Rejection failed',
        description: 'Could not reject the request. Please try again.',
        type: 'error',
      })
    }
  }

  return (
    <Box
      p={5}
      bg="surface.raised"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="0 1px 2px rgba(62,69,67,0.04)"
    >
      <VStack gap={3} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack gap={0.5} align="start" flex={1}>
            <Text fontWeight="700" fontSize="md" color="brand.gray">
              {request.title}
            </Text>
            <HStack gap={2} flexWrap="wrap">
              <Text fontSize="xs" color="fg.muted">
                by {request.submitterName ?? request.submitterEmail ?? `User #${request.userId}`}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {dateStr}
              </Text>
            </HStack>
          </VStack>
          <Badge colorPalette={statusConfig.colorPalette} size="sm">
            {statusConfig.label}
          </Badge>
        </HStack>

        <Text fontSize="sm" color="fg.default">
          {request.description}
        </Text>

        <HStack gap={3} flexWrap="wrap">
          <Badge variant="outline" size="sm">
            Impact: {request.businessImpact}
          </Badge>
          {request.urgency && (
            <Badge variant="outline" size="sm">
              Urgency: {request.urgency.replace('_', ' ')}
            </Badge>
          )}
          {request.category && (
            <Badge variant="outline" size="sm">
              Category: {request.category}
            </Badge>
          )}
        </HStack>

        {/* Show rejection reason for already-rejected */}
        {request.status === 'rejected' && request.rejectionReason && (
          <Box p={2} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.100">
            <Text fontSize="xs" color="red.600">
              Rejected: {request.rejectionReason}
            </Text>
          </Box>
        )}

        {/* Show linked Linear issue for approved */}
        {request.status === 'approved' && request.linearIssueUrl && (
          <Box p={2} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.100">
            <ChakraLink
              href={request.linearIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              fontSize="xs"
              color="green.600"
              fontWeight="600"
              _hover={{ textDecoration: 'underline' }}
            >
              Approved — Open in Linear{request.linearIssueIdentifier ? ` (${request.linearIssueIdentifier})` : ' →'}
            </ChakraLink>
          </Box>
        )}

        {/* Action buttons for pending requests */}
        {isPending && (
          <VStack gap={2} align="stretch" pt={1}>
            {showRejectForm && (
              <VStack gap={2} align="stretch">
                <Textarea
                  placeholder="Reason for rejection (min 5 characters)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  fontSize="sm"
                  borderRadius="lg"
                />
                <HStack gap={2}>
                  <Button
                    size="xs"
                    colorPalette="red"
                    onClick={handleReject}
                    loading={isRejecting}
                    disabled={isRejecting || rejectionReason.trim().length < 5}
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setShowRejectForm(false)
                      setRejectionReason('')
                    }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            )}

            {!showRejectForm && (
              <HStack gap={2}>
                <Button
                  size="sm"
                  bg="brand.green"
                  color="white"
                  _hover={{ bg: 'brand.greenHover' }}
                  onClick={handleApprove}
                  loading={isApproving}
                  disabled={isApproving}
                  borderRadius="lg"
                >
                  Approve & Create Issue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  onClick={() => setShowRejectForm(true)}
                  borderRadius="lg"
                >
                  Reject
                </Button>
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  )
}

/**
 * Admin triage queue for reviewing submitted IT requests.
 */
export function TriageQueue() {
  const { data: requests, isLoading, error } = useTriageQueue()

  const pendingRequests = requests?.filter(
    (r) => r.status === 'submitted' || r.status === 'reviewing',
  ) ?? []
  const processedRequests = requests?.filter(
    (r) => r.status !== 'submitted' && r.status !== 'reviewing',
  ) ?? []

  return (
    <VStack gap={6} align="stretch">
      <VStack gap={1} align="start">
        <Heading
          as="h2"
          size="lg"
          fontFamily="heading"
          letterSpacing="-0.02em"
          fontWeight="700"
          color="brand.gray"
        >
          Request Triage Queue
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          Review and process IT requests submitted by business users
        </Text>
      </VStack>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <Spinner size="lg" color="brand.green" />
        </Box>
      )}

      {error && (
        <Box p={4} bg="red.50" borderRadius="lg" borderWidth="1px" borderColor="red.200">
          <Text color="red.700" fontSize="sm">
            {error.message}
          </Text>
        </Box>
      )}

      {!isLoading && !error && (
        <>
          {pendingRequests.length === 0 && processedRequests.length === 0 && (
            <Box
              p={6}
              bg="surface.sunken"
              borderRadius="xl"
              textAlign="center"
            >
              <Text color="fg.muted" fontSize="sm">
                No requests have been submitted yet.
              </Text>
            </Box>
          )}

          {pendingRequests.length > 0 && (
            <VStack gap={3} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="brand.gray">
                Pending Review ({pendingRequests.length})
              </Text>
              {pendingRequests.map((request) => (
                <TriageCard key={request.id} request={request} />
              ))}
            </VStack>
          )}

          {processedRequests.length > 0 && (
            <VStack gap={3} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="fg.muted" pt={2}>
                Previously Processed ({processedRequests.length})
              </Text>
              {processedRequests.map((request) => (
                <TriageCard key={request.id} request={request} />
              ))}
            </VStack>
          )}
        </>
      )}
    </VStack>
  )
}
