import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Link as ChakraLink,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Link } from 'react-router'
import { useMyRequests } from '../hooks/use-requests'
import { REQUEST_STATUS_CONFIG, type ITRequest } from '../types/request.types'

function RequestCard({ request }: { request: ITRequest }) {
  const statusConfig = REQUEST_STATUS_CONFIG[request.status]
  const dateStr = new Date(request.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Box
      p={4}
      bg="surface.raised"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="0 1px 2px rgba(62,69,67,0.04)"
      transition="box-shadow 0.15s"
      _hover={{ boxShadow: '0 2px 8px rgba(62,69,67,0.08)' }}
    >
      <VStack gap={2} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack gap={0.5} align="start" flex={1}>
            <Text fontWeight="600" fontSize="sm" color="brand.gray" lineClamp={1}>
              {request.title}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Submitted {dateStr}
            </Text>
          </VStack>
          <Badge colorPalette={statusConfig.colorPalette} size="sm">
            {statusConfig.label}
          </Badge>
        </HStack>

        <Text fontSize="xs" color="fg.muted" lineClamp={2}>
          {request.description}
        </Text>

        {/* Show rejection reason */}
        {request.status === 'rejected' && request.rejectionReason && (
          <Box p={2} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.100">
            <Text fontSize="xs" fontWeight="600" color="red.700" mb={0.5}>
              Rejection Reason:
            </Text>
            <Text fontSize="xs" color="red.600">
              {request.rejectionReason}
            </Text>
          </Box>
        )}

        {/* Show admin notes */}
        {request.adminNotes && (
          <Box p={2} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.100">
            <Text fontSize="xs" fontWeight="600" color="blue.700" mb={0.5}>
              Admin Notes:
            </Text>
            <Text fontSize="xs" color="blue.600">
              {request.adminNotes}
            </Text>
          </Box>
        )}

        {/* Show Linear issue link when approved */}
        {request.status === 'approved' && request.linearIssueUrl && (
          <ChakraLink
            href={request.linearIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="green.600"
            fontWeight="600"
            _hover={{ textDecoration: 'underline' }}
          >
            Open in Linear{request.linearIssueIdentifier ? ` (${request.linearIssueIdentifier})` : ' →'}
          </ChakraLink>
        )}

        <HStack gap={2} flexWrap="wrap">
          {request.businessImpact && (
            <Text fontSize="xs" color="fg.muted">
              Impact: <Text as="span" fontWeight="500">{request.businessImpact}</Text>
            </Text>
          )}
          {request.urgency && (
            <Text fontSize="xs" color="fg.muted">
              Urgency: <Text as="span" fontWeight="500">{request.urgency.replace('_', ' ')}</Text>
            </Text>
          )}
          {request.category && (
            <Text fontSize="xs" color="fg.muted">
              Category: <Text as="span" fontWeight="500">{request.category}</Text>
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  )
}

/**
 * "My Requests" page showing the current user's submitted IT requests.
 */
export function MyRequestsPage() {
  const { data: requests, isLoading, error } = useMyRequests()

  return (
    <Box maxW="720px" mx="auto" p={{ base: '4', md: '6' }}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="center">
          <VStack gap={1} align="start">
            <Heading
              as="h1"
              size="xl"
              fontFamily="heading"
              letterSpacing="-0.03em"
              fontWeight="800"
              color="brand.gray"
            >
              My Requests
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Track the status of your IT requests
            </Text>
          </VStack>
          <Link to="/submit-request">
            <Button
              bg="brand.green"
              color="white"
              _hover={{ bg: 'brand.greenHover' }}
              size="sm"
              borderRadius="lg"
            >
              New Request
            </Button>
          </Link>
        </HStack>

        {isLoading && (
          <Box display="flex" justifyContent="center" py={8}>
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

        {!isLoading && !error && requests && requests.length === 0 && (
          <Box
            p={8}
            bg="surface.raised"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.100"
            textAlign="center"
          >
            <VStack gap={3}>
              <Text fontSize="lg" fontWeight="600" color="brand.gray">
                No requests yet
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Submit your first IT request and track it here.
              </Text>
              <Link to="/submit-request">
                <Button
                  bg="brand.green"
                  color="white"
                  _hover={{ bg: 'brand.greenHover' }}
                  size="md"
                  borderRadius="lg"
                  mt={2}
                >
                  Submit Request
                </Button>
              </Link>
            </VStack>
          </Box>
        )}

        {requests && requests.length > 0 && (
          <VStack gap={3} align="stretch">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
