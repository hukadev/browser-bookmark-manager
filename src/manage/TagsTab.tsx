import { useEffect, useMemo, useState } from 'react'
import { Checkbox } from 'radix-ui'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { countTags, tagStats, type KeyCount } from '../lib/aggregate'
import { flattenBookmarks, getTree, updateTitle } from '../lib/bookmarks'
import { tagTextColorClass } from '../lib/tag-color'
import { cardBodyClass, checkboxClass, inputClass, labelClass } from '../lib/ui-classes'
import { decodeTitle, encodeTitle, renameTag } from '../lib/title-codec'
import { ConfirmDialog } from './ConfirmDialog'
import { FormDialog } from './FormDialog'

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode
type SortOrder = 'count-desc' | 'alpha-asc' | 'alpha-desc'

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'count-desc', label: 'By count' },
  { value: 'alpha-asc', label: 'A-Z' },
  { value: 'alpha-desc', label: 'Z-A' },
]

function RenameTagDialog({
  tag,
  onRename,
}: {
  tag: string
  onRename: (oldTag: string, newTag: string) => Promise<void>
}) {
  const [value, setValue] = useState(tag)

  return (
    <FormDialog
      trigger={
        <Button size="xs" variant="outline">
          Rename
        </Button>
      }
      title={`Rename ${tag}`}
    >
      {(close) => (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            await onRename(tag, value.trim())
            close()
          }}
        >
          <input
            autoFocus
            className={`${inputClass} w-full`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
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

export function TagsTab() {
  const [nodes, setNodes] = useState<BookmarkNode[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('count-desc')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function reload() {
    getTree().then((tree) => setNodes(flattenBookmarks(tree)))
  }

  useEffect(reload, [])

  const bookmarks = useMemo(
    () => nodes.map((node) => ({ id: node.id, decoded: decodeTitle(node.title) })),
    [nodes],
  )

  const stats = useMemo(() => tagStats(bookmarks.map((b) => b.decoded)), [bookmarks])
  const counts = useMemo(() => countTags(bookmarks.map((b) => b.decoded)), [bookmarks])
  const sortedCounts = useMemo<KeyCount[]>(() => {
    if (sortOrder === 'alpha-asc') return [...counts].sort((a, b) => a.key.localeCompare(b.key))
    if (sortOrder === 'alpha-desc') return [...counts].sort((a, b) => b.key.localeCompare(a.key))
    return counts
  }, [counts, sortOrder])

  async function handleRename(oldTag: string, newTag: string) {
    if (!newTag || newTag === oldTag) return
    await Promise.all(
      bookmarks
        .filter((b) => b.decoded.tags.includes(oldTag))
        .map((b) => updateTitle(b.id, encodeTitle(renameTag(b.decoded, oldTag, newTag)))),
    )
    reload()
  }

  function toggleTag(key: string) {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
  }

  function toggleSelectAll() {
    setSelectedTags((prev) => (prev.length === sortedCounts.length ? [] : sortedCounts.map((c) => c.key)))
  }

  async function handleDeleteSelectedTags() {
    await Promise.all(
      bookmarks
        .filter((b) => b.decoded.tags.some((t) => selectedTags.includes(t)))
        .map((b) =>
          updateTitle(
            b.id,
            encodeTitle({ ...b.decoded, tags: b.decoded.tags.filter((t) => !selectedTags.includes(t)) }),
          ),
        ),
    )
    setSelectedTags([])
    reload()
  }

  async function handleMergeSelectedTags() {
    if (selectedTags.length < 2) return
    const target = sortedCounts.find((c) => selectedTags.includes(c.key))?.key ?? selectedTags[0]
    const rest = selectedTags.filter((t) => t !== target)
    await Promise.all(
      bookmarks
        .filter((b) => b.decoded.tags.some((t) => selectedTags.includes(t)))
        .map((b) => {
          const tags = [...new Set([...b.decoded.tags.filter((t) => !rest.includes(t)), target])]
          return updateTitle(b.id, encodeTitle({ ...b.decoded, tags }))
        }),
    )
    setSelectedTags([])
    reload()
  }

  const maxCount = counts[0]?.count ?? 1

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-base-300 bg-base-200 flex divide-x divide-base-300">
        <div className="flex-1 p-4">
          <div className="text-2xl font-semibold">{stats.totalTags}</div>
          <div className="text-xs opacity-60">Total Tags</div>
        </div>
        <div className="flex-1 p-4">
          <div className="text-2xl font-semibold">{stats.taggedBookmarks}</div>
          <div className="text-xs opacity-60">Tagged Bookmarks</div>
        </div>
        <div className="flex-1 p-4">
          <div className="text-2xl font-semibold">{stats.untaggedBookmarks}</div>
          <div className="text-xs opacity-60">Untagged Bookmarks</div>
        </div>
        <div className="flex-1 p-4">
          <div className="text-2xl font-semibold">{stats.avgUsesPerTag.toFixed(1)}</div>
          <div className="text-xs opacity-60">Avg Uses/Tag</div>
        </div>
      </div>

      <div className="rounded-lg border border-base-300 bg-base-200">
        <div className={cardBodyClass}>
          <h3 className="text-xs font-semibold opacity-60 tracking-wide uppercase">Tag Cloud</h3>
          <div className="flex flex-wrap items-baseline gap-2">
            {counts.map(({ key, count }) => (
              <span
                key={key}
                className={`font-semibold ${tagTextColorClass(key)}`}
                style={{ fontSize: `${0.75 + (count / maxCount) * 1.5}em` }}
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
          <span className="text-sm font-medium text-warning-content">
            {selectedTags.length} tag{selectedTags.length === 1 ? '' : 's'} selected
          </span>
          {selectedTags.length >= 2 && (
            <Button size="sm" variant="primary" onClick={handleMergeSelectedTags}>
              Merge
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="error">
                Delete
              </Button>
            }
            title="Delete selected tags?"
            description={`This removes ${selectedTags.length} tag(s) from every bookmark that has them. The bookmarks themselves are kept.`}
            confirmLabel="Delete"
            onConfirm={handleDeleteSelectedTags}
          />
          <Button size="sm" variant="outline" onClick={() => setSelectedTags([])}>
            Clear
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox.Root
            checked={sortedCounts.length > 0 && selectedTags.length === sortedCounts.length}
            onCheckedChange={toggleSelectAll}
            className={`${checkboxClass} flex items-center justify-center`}
          >
            <Checkbox.Indicator className="text-primary-content text-xs leading-none">✓</Checkbox.Indicator>
          </Checkbox.Root>
          <span className="font-medium">All Tags</span>
        </label>
        <div className="flex items-center gap-2">
          <span className={labelClass}>Sort</span>
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={sortOrder === option.value ? 'primary' : 'outline'}
                onClick={() => setSortOrder(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {sortedCounts.map(({ key, count }) => (
          <li key={key} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-base-200">
            <Checkbox.Root
              checked={selectedTags.includes(key)}
              onCheckedChange={() => toggleTag(key)}
              className={`${checkboxClass} flex items-center justify-center shrink-0`}
            >
              <Checkbox.Indicator className="text-primary-content text-xs leading-none">✓</Checkbox.Indicator>
            </Checkbox.Root>
            <Chip tag={key} />
            <span className="ml-auto text-sm opacity-60">
              {count} bookmark{count === 1 ? '' : 's'}
            </span>
            <RenameTagDialog tag={key} onRename={handleRename} />
          </li>
        ))}
      </ul>
    </div>
  )
}
