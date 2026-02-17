import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router'
import { toaster } from '@/components/ui/toaster'
import { useVisibleLabels } from '@/shared/hooks/use-visible-labels'
import { useSubmitRequest, useSimilarItems } from '../hooks/use-requests'
import {
  BUSINESS_IMPACT_OPTIONS,
  URGENCY_OPTIONS,
  type RequestBusinessImpact,
  type RequestUrgency,
} from '../types/request.types'

/**
 * IT request submission form with inline duplicate detection.
 */
export function RequestForm() {
  const navigate = useNavigate()
  const { submitRequest, isSubmitting } = useSubmitRequest()
  const { visibleLabels } = useVisibleLabels()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [businessImpact, setBusinessImpact] = useState<RequestBusinessImpact | ''>('')
  const [category, setCategory] = useState('')
  const [urgency, setUrgency] = useState<RequestUrgency | ''>('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Debounced title for duplicate detection
  const [debouncedTitle, setDebouncedTitle] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: similarItems } = useSimilarItems(debouncedTitle)

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
    if (validationErrors.title) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.title
        return next
      })
    }

    // Debounce duplicate detection
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedTitle(value)
    }, 400)
  }, [validationErrors.title])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!title.trim() || title.trim().length < 10) {
      errors.title = 'Title must be at least 10 characters'
    }
    if (!description.trim() || description.trim().length < 50) {
      errors.description = 'Description must be at least 50 characters'
    }
    if (!businessImpact) {
      errors.businessImpact = 'Please select a business impact level'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await submitRequest({
        title: title.trim(),
        description: description.trim(),
        businessImpact: businessImpact as RequestBusinessImpact,
        category: category || undefined,
        urgency: (urgency as RequestUrgency) || undefined,
      })

      toaster.create({
        title: 'Request submitted',
        description: 'Your IT request has been submitted for review.',
        type: 'success',
      })

      navigate('/my-requests')
    } catch {
      toaster.create({
        title: 'Submission failed',
        description: 'Could not submit your request. Please try again.',
        type: 'error',
      })
    }
  }

  return (
    <Box maxW="720px" mx="auto" p={{ base: '4', md: '6' }}>
      <VStack gap={6} align="stretch">
        <VStack gap={1} align="start">
          <Heading
            as="h1"
            size="xl"
            fontFamily="heading"
            letterSpacing="-0.03em"
            fontWeight="800"
            color="brand.gray"
          >
            Submit IT Request
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Describe what you need from IT. Your request will be reviewed by the IT team.
          </Text>
        </VStack>

        <Box
          as="form"
          onSubmit={handleSubmit}
          bg="surface.raised"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.100"
          p={6}
          boxShadow="0 1px 3px rgba(62,69,67,0.06)"
        >
          <VStack gap={5} align="stretch">
            {/* Title */}
            <VStack gap={1.5} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="brand.gray">
                Title <Text as="span" color="red.500">*</Text>
              </Text>
              <Input
                ref={titleInputRef}
                placeholder="Brief summary of your IT request (min 10 chars)"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                size="md"
                borderRadius="lg"
                borderColor={validationErrors.title ? 'red.300' : 'gray.200'}
                _focusVisible={{
                  outline: '2px solid',
                  outlineColor: 'brand.green',
                  outlineOffset: '2px',
                }}
              />
              {validationErrors.title && (
                <Text color="red.500" fontSize="xs" role="alert">
                  {validationErrors.title}
                </Text>
              )}

              {/* Similar items panel */}
              {similarItems && similarItems.length > 0 && (
                <Box
                  mt={1}
                  p={3}
                  bg="yellow.50"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="yellow.200"
                >
                  <Text fontSize="xs" fontWeight="600" color="yellow.800" mb={2}>
                    Similar existing items — did you mean one of these?
                  </Text>
                  <VStack gap={1} align="stretch">
                    {similarItems.map((item) => (
                      <HStack key={item.identifier} gap={2}>
                        <Text fontSize="xs" fontWeight="600" color="yellow.700">
                          {item.identifier}
                        </Text>
                        <Text fontSize="xs" color="yellow.800" lineClamp={1}>
                          {item.title}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>

            {/* Description */}
            <VStack gap={1.5} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="brand.gray">
                Description <Text as="span" color="red.500">*</Text>
              </Text>
              <Textarea
                placeholder="Describe what you need, why it's important, and any relevant context (min 50 chars)"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (validationErrors.description) {
                    setValidationErrors((prev) => {
                      const next = { ...prev }
                      delete next.description
                      return next
                    })
                  }
                }}
                rows={5}
                borderRadius="lg"
                borderColor={validationErrors.description ? 'red.300' : 'gray.200'}
                _focusVisible={{
                  outline: '2px solid',
                  outlineColor: 'brand.green',
                  outlineOffset: '2px',
                }}
              />
              <HStack justify="space-between">
                {validationErrors.description ? (
                  <Text color="red.500" fontSize="xs" role="alert">
                    {validationErrors.description}
                  </Text>
                ) : (
                  <Box />
                )}
                <Text fontSize="xs" color="fg.muted">
                  {description.length} / 50 min
                </Text>
              </HStack>
            </VStack>

            {/* Business Impact */}
            <VStack gap={1.5} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="brand.gray">
                Business Impact <Text as="span" color="red.500">*</Text>
              </Text>
              <select
                value={businessImpact}
                onChange={(e) => {
                  setBusinessImpact(e.target.value as RequestBusinessImpact)
                  if (validationErrors.businessImpact) {
                    setValidationErrors((prev) => {
                      const next = { ...prev }
                      delete next.businessImpact
                      return next
                    })
                  }
                }}
                style={{
                  borderRadius: '8px',
                  border: `1px solid ${validationErrors.businessImpact ? '#FC8181' : '#E2E8F0'}`,
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  width: '100%',
                }}
              >
                <option value="">Select impact level...</option>
                {BUSINESS_IMPACT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {validationErrors.businessImpact && (
                <Text color="red.500" fontSize="xs" role="alert">
                  {validationErrors.businessImpact}
                </Text>
              )}
            </VStack>

            {/* Category (optional) */}
            <VStack gap={1.5} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="brand.gray">
                Category <Text as="span" color="fg.muted" fontWeight="400">(optional)</Text>
              </Text>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  width: '100%',
                }}
              >
                <option value="">Select a category...</option>
                {visibleLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </VStack>

            {/* Urgency (optional) */}
            <VStack gap={1.5} align="stretch">
              <Text fontWeight="600" fontSize="sm" color="brand.gray">
                Urgency <Text as="span" color="fg.muted" fontWeight="400">(optional)</Text>
              </Text>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
                style={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  width: '100%',
                }}
              >
                <option value="">Select urgency...</option>
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </VStack>

            {/* Submit */}
            <HStack justify="flex-end" pt={2}>
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                size="md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                bg="brand.green"
                color="white"
                _hover={{ bg: 'brand.greenHover' }}
                _active={{ bg: 'brand.greenActive' }}
                size="md"
                borderRadius="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Submit Request
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}
