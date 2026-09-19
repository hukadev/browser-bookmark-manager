import { useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'

interface FormDialogProps {
  trigger: ReactNode
  title: string
  /** Receives a `close` callback the form's submit handler can call once its action completes. */
  children: (close: () => void) => ReactNode
}

export function FormDialog({ trigger, title, children }: FormDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-base-100 text-base-content rounded-lg shadow-xl p-6 w-full max-w-sm">
          <Dialog.Title className="font-bold text-lg mb-3">{title}</Dialog.Title>
          {children(() => setOpen(false))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
