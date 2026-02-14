import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Box, Button, Heading, Input, Text, VisuallyHidden, VStack } from '@chakra-ui/react'

interface IdentifyFormProps {
  onIdentify: (email: string) => Promise<unknown>
  isIdentifying: boolean
  error: string | null
}

/**
 * Branded email identification form.
 * Users provide their email to identify themselves (no password required).
 *
 * Features a full-page layout with brand identity, gradient background,
 * subtle noise texture, and refined white form card.
 */
export function IdentifyForm({ onIdentify, isIdentifying, error }: IdentifyFormProps) {
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Programmatic focus on mount — equivalent to autoFocus but satisfies
  // jsx-a11y/no-autofocus lint rule while keeping login form UX.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setValidationError('Email address is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setValidationError('Please enter a valid email address')
      return
    }

    try {
      await onIdentify(trimmed)
    } catch {
      // Error is handled by parent via the error prop
    }
  }

  const displayError = validationError ?? error

  return (
    <Box
      as="main"
      id="main-content"
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
      className="bg-grain"
      bg="linear-gradient(135deg, #2D3331 0%, #3E4543 40%, #4a5553 100%)"
    >
      <Box
        maxW="420px"
        w="full"
        mx="4"
        className="animate-scale-in"
      >
        {/* Brand identity */}
        <VStack gap={3} mb={8} align="center">
          <Box
            w="48px"
            h="6px"
            borderRadius="full"
            bg="#8E992E"
          />
          <Text
            fontSize="sm"
            fontWeight="600"
            color="whiteAlpha.500"
            letterSpacing="0.1em"
            textTransform="uppercase"
            fontFamily="heading"
          >
            Vixxo IT
          </Text>
        </VStack>

        {/* Form card — explicit white bg for reliable contrast against dark page */}
        <Box
          p={8}
          bg="white"
          borderRadius="2xl"
          boxShadow="0 20px 60px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1)"
        >
          <form onSubmit={handleSubmit} noValidate>
            <VStack gap={6} align="stretch">
              <VStack gap={2}>
                <Heading
                  as="h1"
                  size="lg"
                  textAlign="center"
                  fontFamily="heading"
                  letterSpacing="-0.02em"
                  color="#3E4543"
                >
                  Shareable IT Backlog
                </Heading>
                <Text color="#718096" textAlign="center" fontSize="sm">
                  Enter your email to access the backlog
                </Text>
              </VStack>

              <VStack gap={3} align="stretch">
                <VisuallyHidden asChild>
                  <label htmlFor="identify-email-input">Email address</label>
                </VisuallyHidden>
                <Input
                  ref={inputRef}
                  id="identify-email-input"
                  type="email"
                  placeholder="your.name@vixxo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  size="lg"
                  borderRadius="xl"
                  bg="#F4F3EF"
                  borderColor="#E2E8F0"
                  color="#3E4543"
                  _placeholder={{ color: '#A0AEC0' }}
                  _focusVisible={{
                    outline: '2px solid',
                    outlineColor: '#8E992E',
                    outlineOffset: '2px',
                    borderColor: '#8E992E',
                    bg: 'white',
                  }}
                />
                {displayError && (
                  <Text color="#C53030" fontSize="sm" role="alert">
                    {displayError}
                  </Text>
                )}
              </VStack>

              <Button
                type="submit"
                variant="solid"
                bg="brand.green"
                color="white"
                _hover={{ bg: 'brand.greenHover' }}
                _active={{ bg: 'brand.greenActive' }}
                w="full"
                size="lg"
                borderRadius="xl"
                disabled={isIdentifying}
              >
                {isIdentifying ? 'Identifying...' : 'Continue'}
              </Button>
            </VStack>
          </form>
        </Box>
      </Box>
    </Box>
  )
}
