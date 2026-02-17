import { useEffect, useRef } from 'react'
import { Button, Dialog, Text, VStack } from '@chakra-ui/react'

export interface ConfirmationDialogProps {
  title: string
  body: string
  confirmLabel: string
  confirmColorPalette?: string
  isOpen: boolean
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable confirmation dialog using Chakra UI v3 Dialog (role="alertdialog").
 * Traps focus and requires explicit confirm/cancel.
 */
export function ConfirmationDialog({
  title,
  body,
  confirmLabel,
  confirmColorPalette = 'blue',
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const closeRequestedRef = useRef(false)

  useEffect(() => {
    if (isOpen) closeRequestedRef.current = false
  }, [isOpen])

  const requestClose = () => {
    if (closeRequestedRef.current) return
    closeRequestedRef.current = true
    onCancel()
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={({ open }) => {
        if (!open) requestClose()
      }}
      role="alertdialog"
      initialFocusEl={() => cancelRef.current}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="md">
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="start" gap={2}>
              <Text>{body}</Text>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer gap={3}>
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={requestClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              colorPalette={confirmColorPalette}
              onClick={onConfirm}
              loading={isLoading}
            >
              {confirmLabel}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
