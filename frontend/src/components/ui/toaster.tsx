import {
  Toaster as ChakraToaster,
  Toast,
  createToaster,
} from '@chakra-ui/react'

export const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
  max: 3,
})

export function Toaster() {
  return (
    <ChakraToaster toaster={toaster}>
      {(toast) => (
        <Toast.Root key={toast.id}>
          {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
          {toast.description && (
            <Toast.Description>{toast.description}</Toast.Description>
          )}
          <Toast.CloseTrigger />
        </Toast.Root>
      )}
    </ChakraToaster>
  )
}
