import { useState } from 'react'
import { Popover } from 'radix-ui'
import type { FolderOption } from '../lib/bookmarks'
import { inputClass, selectTriggerClass } from '../lib/ui-classes'

interface FolderComboboxProps {
  folders: FolderOption[]
  value: string
  onValueChange: (id: string) => void
}

export function FolderCombobox({ folders, value, onValueChange }: FolderComboboxProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const selected = folders.find((f) => f.id === value)
  const filtered = folders.filter((f) => f.title.toLowerCase().includes(filter.toLowerCase()))

  function select(id: string) {
    onValueChange(id)
    setOpen(false)
    setFilter('')
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setFilter('')
      }}
    >
      <Popover.Trigger asChild>
        <button type="button" className={`${selectTriggerClass} font-mono`}>
          {selected ? selected.linePrefix + selected.title : 'Select a folder'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-base-100 text-base-content border border-base-300 rounded-lg shadow-lg p-2 z-50 w-64"
          sideOffset={4}
        >
          <input
            autoFocus
            className={`${inputClass} w-full mb-1`}
            placeholder="Search folders..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <ul className="max-h-64 overflow-y-auto flex flex-col gap-0.5 font-mono">
            {filtered.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  className={`block w-full text-left rounded-md px-1 py-0.5 text-xs transition-colors cursor-pointer hover:bg-base-200 ${folder.id === value ? 'bg-base-200' : ''}`}
                  onClick={() => select(folder.id)}
                >
                  {folder.linePrefix + folder.title}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="text-sm opacity-60 px-2 py-1">No folders match</li>}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
