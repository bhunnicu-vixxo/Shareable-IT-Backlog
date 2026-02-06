import { Box, Heading, Text } from '@chakra-ui/react'

export function AdminPage() {
  return (
    <Box p="4">
      <Heading as="h1" size="xl" color="brand.gray">
        Admin
      </Heading>
      <Text mt="2" color="brand.gray">
        Administration settings coming soon.
      </Text>
    </Box>
  )
}
