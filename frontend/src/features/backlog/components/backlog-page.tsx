import { Box, Heading } from '@chakra-ui/react'
import { BacklogList } from './backlog-list'

export function BacklogPage() {
  return (
    <Box p="4" maxWidth="960px" mx="auto">
      <Heading as="h1" size="xl" color="brand.gray" mb="6">
        Backlog
      </Heading>
      <BacklogList />
    </Box>
  )
}
