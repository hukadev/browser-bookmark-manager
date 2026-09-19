import type { ReactNode } from 'react'
import { Popover } from 'radix-ui'

export function HelpPopover({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-base-content/40 text-[10px] leading-none opacity-60 hover:opacity-100 cursor-pointer align-middle"
          aria-label={label}
        >
          ?
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-base-100 text-base-content border border-base-300 rounded-lg p-3 max-w-[220px] text-sm leading-relaxed z-50"
          sideOffset={6}
        >
          {children}
          <Popover.Arrow className="fill-base-100" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
