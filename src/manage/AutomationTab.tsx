import { useEffect, useState } from 'react'
import { Select, Switch } from 'radix-ui'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { countTags, type KeyCount } from '../lib/aggregate'
import {
  applyAutoTagRules,
  getAutoTagRules,
  getFolderRules,
  resolveFolderMoves,
  saveAutoTagRules,
  saveFolderRules,
  type AutoTagRule,
  type FolderRule,
} from '../lib/automation'
import { flattenBookmarks, getTree, listFolders, moveBookmark, updateTitle, type FolderOption } from '../lib/bookmarks'
import { cardBodyClass, cardClass, formFieldClass, inputClass, selectTriggerClass, toggleClass } from '../lib/ui-classes'
import { decodeTitle, encodeTitle } from '../lib/title-codec'
import { ConfirmDialog } from './ConfirmDialog'
import { FolderCombobox } from './FolderCombobox'
import { FormDialog } from './FormDialog'

const AUTO_TAG_CONDITIONS: { value: AutoTagRule['when']; label: string }[] = [
  { value: 'url-contains', label: 'URL contains' },
  { value: 'title-contains', label: 'Title contains' },
  { value: 'url-regex', label: 'URL matches regex' },
  { value: 'title-regex', label: 'Title matches regex' },
]

const FOLDER_CONDITIONS: { value: FolderRule['when']; label: string }[] = [
  { value: 'tags-include', label: 'Tags include' },
  { value: 'any-tag-matches', label: 'Any tag matches' },
  { value: 'all-tags-match', label: 'All tags match' },
]

function SimpleSelect<T extends string>({
  value,
  onValueChange,
  options,
}: {
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <Select.Trigger className={`${selectTriggerClass} w-full`}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="bg-base-100 text-base-content border border-base-300 rounded-lg shadow-lg p-1 z-50">
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="rounded-md px-3 py-2 outline-none cursor-pointer data-[highlighted]:bg-base-200"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function RuleToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <Switch.Root checked={enabled} onCheckedChange={onChange} className={`${toggleClass} shrink-0`}>
      <Switch.Thumb className="block w-4 h-4 bg-base-100 rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-4" />
    </Switch.Root>
  )
}

function TagPicker({
  allTags,
  selected,
  onChange,
  placeholder,
}: {
  allTags: KeyCount[]
  selected: string[]
  onChange: (tags: string[]) => void
  placeholder: string
}) {
  const [search, setSearch] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag || selected.includes(tag)) return
    onChange([...selected, tag])
    setSearch('')
  }

  function removeTag(tag: string) {
    onChange(selected.filter((t) => t !== tag))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(search)
      return
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && search === '' && selected.length > 0) {
      event.preventDefault()
      removeTag(selected[selected.length - 1])
    }
  }

  const term = search.trim().toLowerCase()
  const suggestions = allTags.filter(
    ({ key }) => !selected.includes(key) && (term === '' || key.toLowerCase().includes(term)),
  )
  const exactExists =
    allTags.some(({ key }) => key.toLowerCase() === term) || selected.some((t) => t.toLowerCase() === term)

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${inputClass} w-full h-auto min-h-9 flex flex-wrap items-center gap-1 py-1`}>
        {selected.map((tag) => (
          <Chip key={tag} tag={tag} size="xs" onRemove={() => removeTag(tag)} />
        ))}
        <input
          className="flex-1 min-w-[100px] outline-none bg-transparent text-sm"
          placeholder={selected.length === 0 ? placeholder : ''}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {(suggestions.length > 0 || (term !== '' && !exactExists)) && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map(({ key, count }) => (
            <Chip key={key} tag={key} size="xs" onClick={() => addTag(key)}>
              {key} <span className="opacity-60">({count})</span>
            </Chip>
          ))}
          {term !== '' && !exactExists && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-primary text-primary px-2 py-0.5 text-[11px] cursor-pointer hover:bg-primary/10"
              onClick={() => addTag(search)}
            >
              + "{search.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AutoTagRuleDialog({
  rule,
  allTags,
  trigger,
  title,
  onSave,
}: {
  rule?: AutoTagRule
  allTags: KeyCount[]
  trigger: React.ReactNode
  title: string
  onSave: (fields: { when: AutoTagRule['when']; pattern: string; tags: string[] }) => Promise<void>
}) {
  const [when, setWhen] = useState<AutoTagRule['when']>(rule?.when ?? 'url-contains')
  const [pattern, setPattern] = useState(rule?.pattern ?? '')
  const [tags, setTags] = useState<string[]>(rule?.tags ?? [])

  return (
    <FormDialog trigger={trigger} title={title}>
      {(close) => (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!pattern.trim() || tags.length === 0) return
            await onSave({ when, pattern: pattern.trim(), tags })
            close()
          }}
        >
          <label className={formFieldClass}>
            <span className="text-xs opacity-60">When:</span>
            <SimpleSelect value={when} onValueChange={setWhen} options={AUTO_TAG_CONDITIONS} />
          </label>
          <label className={formFieldClass}>
            <span className="text-xs opacity-60">Value:</span>
            <input
              autoFocus
              className={`${inputClass} w-full`}
              placeholder="e.g. phonetool"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </label>
          <div className={formFieldClass}>
            <span className="text-xs opacity-60">Tags to add:</span>
            <TagPicker allTags={allTags} selected={tags} onChange={setTags} placeholder="Search or type new tag..." />
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      )}
    </FormDialog>
  )
}

function FolderRuleDialog({
  rule,
  allTags,
  folders,
  trigger,
  title,
  onSave,
}: {
  rule?: FolderRule
  allTags: KeyCount[]
  folders: FolderOption[]
  trigger: React.ReactNode
  title: string
  onSave: (fields: { when: FolderRule['when']; tags: string[]; folderId: string }) => Promise<void>
}) {
  const [when, setWhen] = useState<FolderRule['when']>(rule?.when ?? 'tags-include')
  const [tags, setTags] = useState<string[]>(rule?.tags ?? [])
  const [folderId, setFolderId] = useState(rule?.folderId ?? folders[0]?.id ?? '')

  return (
    <FormDialog trigger={trigger} title={title}>
      {(close) => (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (tags.length === 0 || !folderId) return
            await onSave({ when, tags, folderId })
            close()
          }}
        >
          <label className={formFieldClass}>
            <span className="text-xs opacity-60">When:</span>
            <SimpleSelect value={when} onValueChange={setWhen} options={FOLDER_CONDITIONS} />
          </label>
          <div className={formFieldClass}>
            <span className="text-xs opacity-60">Tags to match:</span>
            <TagPicker allTags={allTags} selected={tags} onChange={setTags} placeholder="Search or type tag..." />
          </div>
          <label className={formFieldClass}>
            <span className="text-xs opacity-60">Move to folder:</span>
            <FolderCombobox folders={folders} value={folderId} onValueChange={setFolderId} />
          </label>
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      )}
    </FormDialog>
  )
}

export function AutomationTab() {
  const [autoTagRules, setAutoTagRules] = useState<AutoTagRule[]>([])
  const [folderRules, setFolderRules] = useState<FolderRule[]>([])
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [allTags, setAllTags] = useState<KeyCount[]>([])
  const [running, setRunning] = useState(false)
  const [ranMessage, setRanMessage] = useState('')

  useEffect(() => {
    getAutoTagRules().then(setAutoTagRules)
    getFolderRules().then(setFolderRules)
    getTree().then((tree) => {
      setFolders(listFolders(tree[0]?.children ?? []))
      setAllTags(countTags(flattenBookmarks(tree).map((node) => decodeTitle(node.title))))
    })
  }, [])

  async function persistAutoTagRules(next: AutoTagRule[]) {
    setAutoTagRules(next)
    await saveAutoTagRules(next)
  }

  async function persistFolderRules(next: FolderRule[]) {
    setFolderRules(next)
    await saveFolderRules(next)
  }

  async function addAutoTagRule(fields: { when: AutoTagRule['when']; pattern: string; tags: string[] }) {
    await persistAutoTagRules([...autoTagRules, { id: crypto.randomUUID(), ...fields }])
  }

  async function updateAutoTagRule(
    id: string,
    fields: { when: AutoTagRule['when']; pattern: string; tags: string[] },
  ) {
    await persistAutoTagRules(autoTagRules.map((r) => (r.id === id ? { ...r, ...fields } : r)))
  }

  async function toggleAutoTagRule(id: string, enabled: boolean) {
    await persistAutoTagRules(autoTagRules.map((r) => (r.id === id ? { ...r, enabled } : r)))
  }

  async function deleteAutoTagRule(id: string) {
    await persistAutoTagRules(autoTagRules.filter((r) => r.id !== id))
  }

  async function addFolderRule(fields: { when: FolderRule['when']; tags: string[]; folderId: string }) {
    await persistFolderRules([...folderRules, { id: crypto.randomUUID(), ...fields }])
  }

  async function updateFolderRule(id: string, fields: { when: FolderRule['when']; tags: string[]; folderId: string }) {
    await persistFolderRules(folderRules.map((r) => (r.id === id ? { ...r, ...fields } : r)))
  }

  async function toggleFolderRule(id: string, enabled: boolean) {
    await persistFolderRules(folderRules.map((r) => (r.id === id ? { ...r, enabled } : r)))
  }

  async function deleteFolderRule(id: string) {
    await persistFolderRules(folderRules.filter((r) => r.id !== id))
  }

  async function runRules() {
    setRunning(true)
    setRanMessage('')
    try {
      const tree = await getTree()
      const nodes = flattenBookmarks(tree)
      const decodedById = new Map(nodes.map((node) => [node.id, decodeTitle(node.title)]))

      const withTags = nodes.map((node) => ({
        id: node.id,
        url: node.url ?? '',
        title: decodedById.get(node.id)!.title,
        tags: decodedById.get(node.id)!.tags,
      }))
      const tagged = applyAutoTagRules(withTags, autoTagRules)

      const tagUpdates = tagged.filter((b, i) => b.tags.length !== withTags[i].tags.length ||
        !b.tags.every((tag) => withTags[i].tags.includes(tag)))
      await Promise.all(
        tagUpdates.map((b) => {
          const decoded = decodedById.get(b.id)!
          return updateTitle(b.id, encodeTitle({ ...decoded, tags: b.tags }))
        }),
      )

      const forFolderRules = nodes.map((node) => ({
        id: node.id,
        tags: tagged.find((b) => b.id === node.id)!.tags,
        folderId: node.parentId ?? '',
      }))
      const moves = resolveFolderMoves(forFolderRules, folderRules)
      await Promise.all(moves.map((move) => moveBookmark(move.id, move.folderId)))

      setRanMessage(`Applied ${tagUpdates.length} tag update(s) and ${moves.length} folder move(s).`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cardClass}>
        <div className={cardBodyClass}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Auto-Tagging Rules</h3>
              <p className="text-sm opacity-60">Automatically add tags to bookmarks based on URL or title patterns.</p>
            </div>
            <AutoTagRuleDialog
              allTags={allTags}
              title="Add Auto-Tagging Rule"
              trigger={
                <Button variant="primary" size="sm">
                  + Add Rule
                </Button>
              }
              onSave={addAutoTagRule}
            />
          </div>
          {autoTagRules.length === 0 ? (
            <p className="text-sm opacity-60 text-center py-4">
              No auto-tagging rules yet. Click "+ Add Rule" to create one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {autoTagRules.map((rule) => (
                <li key={rule.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-base-200">
                  <RuleToggle
                    enabled={rule.enabled !== false}
                    onChange={(enabled) => toggleAutoTagRule(rule.id, enabled)}
                  />
                  <span className="flex-1 text-sm flex items-center flex-wrap gap-1">
                    If <span className="text-primary font-medium">{AUTO_TAG_CONDITIONS.find((c) => c.value === rule.when)?.label}</span>
                    "{rule.pattern}" → add
                    {rule.tags.map((tag) => (
                      <Chip key={tag} tag={tag} size="xs" />
                    ))}
                  </span>
                  <AutoTagRuleDialog
                    rule={rule}
                    allTags={allTags}
                    title="Edit Auto-Tagging Rule"
                    trigger={
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    }
                    onSave={(fields) => updateAutoTagRule(rule.id, fields)}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="error">
                        Delete
                      </Button>
                    }
                    title="Delete this auto-tagging rule?"
                    description="This permanently removes the rule."
                    confirmLabel="Delete"
                    onConfirm={() => deleteAutoTagRule(rule.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <div className={cardBodyClass}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Folder Organization Rules</h3>
              <p className="text-sm opacity-60">Automatically move bookmarks to folders based on their tags.</p>
            </div>
            <FolderRuleDialog
              allTags={allTags}
              folders={folders}
              title="Add Folder Organization Rule"
              trigger={
                <Button variant="primary" size="sm">
                  + Add Rule
                </Button>
              }
              onSave={addFolderRule}
            />
          </div>
          {folderRules.length === 0 ? (
            <p className="text-sm opacity-60 text-center py-4">
              No folder organization rules yet. Click "+ Add Rule" to create one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {folderRules.map((rule) => (
                <li key={rule.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-base-200">
                  <RuleToggle
                    enabled={rule.enabled !== false}
                    onChange={(enabled) => toggleFolderRule(rule.id, enabled)}
                  />
                  <span className="flex-1 text-sm flex items-center flex-wrap gap-1">
                    If <span className="text-primary font-medium">{FOLDER_CONDITIONS.find((c) => c.value === rule.when)?.label}</span>
                    {rule.tags.map((tag) => (
                      <Chip key={tag} tag={tag} size="xs" />
                    ))}
                    → move to <span className="font-medium">{folders.find((f) => f.id === rule.folderId)?.title ?? rule.folderId}</span>
                  </span>
                  <FolderRuleDialog
                    rule={rule}
                    allTags={allTags}
                    folders={folders}
                    title="Edit Folder Organization Rule"
                    trigger={
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    }
                    onSave={(fields) => updateFolderRule(rule.id, fields)}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="error">
                        Delete
                      </Button>
                    }
                    title="Delete this folder organization rule?"
                    description="This permanently removes the rule."
                    confirmLabel="Delete"
                    onConfirm={() => deleteFolderRule(rule.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <div className={cardBodyClass}>
          <Button variant="success" className="self-start" disabled={running} onClick={runRules}>
            Run rules on all existing bookmarks
          </Button>
          {ranMessage && (
            <p role="status" className="text-success text-sm mt-2">
              {ranMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
