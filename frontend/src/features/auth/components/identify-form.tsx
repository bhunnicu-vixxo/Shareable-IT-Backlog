import { useState, type FormEvent } from 'react'
import { Box, Button, Heading, Input, Text, VisuallyHidden, VStack } from '@chakra-ui/react'

interface IdentifyFormProps {
  onIdentify: (email: string) => Promise<unknown>
  isIdentifying: boolean
  error: string | null
}

/**
 * Simple email identification form.
 * Users provide their email to identify themselves (no password required).
 */
export function IdentifyForm({ onIdentify, isIdentifying, error }: IdentifyFormProps) {
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

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
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
      bg="bg"
    >
      <Box
        maxW="400px"
        w="full"
        p={8}
        borderWidth="1px"
        borderRadius="xl"
        shadow="lg"
      >
        <form onSubmit={handleSubmit} noValidate>
          <VStack gap={6} align="stretch">
            <VStack gap={2}>
              <Heading as="h1" size="lg" textAlign="center">
                Shareable IT Backlog
              </Heading>
              <Text color="fg.muted" textAlign="center" fontSize="sm">
                Enter your email to access the backlog
              </Text>
            </VStack>

            <VStack gap={3} align="stretch">
              <VisuallyHidden asChild>
                <label htmlFor="identify-email-input">Email address</label>
              </VisuallyHidden>
              <Input
                id="identify-email-input"
                type="email"
                placeholder="your.name@vixxo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationError) setValidationError(null)
                }}
                autoFocus
              />
              {displayError && (
                <Text color="fg.error" fontSize="sm" role="alert">
                  {displayError}
                </Text>
              )}
            </VStack>

            <Button
              type="submit"
              colorPalette="blue"
              w="full"
              disabled={isIdentifying}
            >
              {isIdentifying ? 'Identifying...' : 'Continue'}
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}
