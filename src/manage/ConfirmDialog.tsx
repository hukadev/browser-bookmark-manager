import type { ReactNode } from 'react'
import { AlertDialog } from 'radix-ui'
import { Button } from '../components/Button'

interface ConfirmDialogProps {
  trigger: ReactNode
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = 'Confirm', onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-base-100 text-base-content rounded-lg shadow-xl p-6 w-full max-w-sm">
          <AlertDialog.Title className="font-bold text-lg">{title}</AlertDialog.Title>
          {description && <AlertDialog.Description className="py-4">{description}</AlertDialog.Description>}
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialog.Cancel asChild>
              <Button>Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="error" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
