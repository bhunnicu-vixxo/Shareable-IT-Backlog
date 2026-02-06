'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { system } from '@/theme'
import type { PropsWithChildren } from 'react'

export function Provider(props: PropsWithChildren) {
  return <ChakraProvider value={system}>{props.children}</ChakraProvider>
}
