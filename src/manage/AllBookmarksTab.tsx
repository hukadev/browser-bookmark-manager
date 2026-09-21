import { useEffect, useMemo, useState } from 'react'
import { Checkbox } from 'radix-ui'
import { Button as AriaRemoveButton, Tag as AriaTag, TagGroup, TagList } from 'react-aria-components'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { BookmarkIcon, FolderIcon, GridViewIcon, SearchIcon, ViewListIcon } from '../components/Icon'
import { countFolders, countTags } from '../lib/aggregate'
import {
  createFolder,
  faviconUrl,
  flattenBookmarks,
  folderPath,
  getTree,
  isFolderWithin,
  listFolders,
  moveBookmark,
  removeBookmark,
  updateBookmark,
  updateTitle,
  type FolderCrumb,
  type FolderOption,
} from '../lib/bookmarks'
import { getOgImage } from '../lib/og-image'
import { search } from '../lib/search'
import { tagBgTintClass, tagBorderColorClass, tagTextColorClass } from '../lib/tag-color'
import { decodeTitle, encodeTitle } from '../lib/title-codec'
import { checkboxClass, formFieldClass, inputClass, textareaClass } from '../lib/ui-classes'
import { LOCAL_KEY_ARCHIVE_FOLDER_ID } from '../shared/constants'
import { ConfirmDialog } from './ConfirmDialog'
import { FolderCombobox } from './FolderCombobox'
import { FormDialog } from './FormDialog'

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

interface Row {
  id: string
  url: string
  title: string
  tags: string[]
  note?: string
  folderId: string
  breadcrumb: FolderCrumb[]
  dateAdded: number
}

const TAG_BAR_LIMIT = 12

interface RowEditChanges {
  title: string
  url: string
  tags: string[]
  note?: string
  folderId: string
}

function LabeledCheckbox({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className={`${checkboxClass} flex items-center justify-center`}
      >
        <Checkbox.Indicator className="text-primary-content text-xs leading-none">✓</Checkbox.Indicator>
      </Checkbox.Root>
      {children}
    </label>
  )
}

function TagChipInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [tagInput, setTagInput] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim()
    setTagInput('')
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(tagInput)
      return
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && tagInput === '' && tags.length > 0) {
      event.preventDefault()
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className={`${inputClass} w-full h-auto min-h-8 flex flex-wrap items-center gap-1 py-1`}>
      <TagGroup aria-label="Selected tags" onRemove={(keys) => removeTag(String([...keys][0]))} className="contents">
        <TagList items={tags.map((tag) => ({ id: tag }))} className="contents">
          {(item) => (
            <AriaTag
              id={item.id}
              textValue={item.id}
              className={`inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs outline-none cursor-default ${tagBorderColorClass(item.id)} ${tagBgTintClass(item.id)} ${tagTextColorClass(item.id)}`}
            >
              {({ allowsRemoving }) => (
                <>
                  {item.id}
                  {allowsRemoving && (
                    <AriaRemoveButton
                      slot="remove"
                      className="opacity-60 hover:opacity-100 cursor-pointer"
                      aria-label={`Remove ${item.id}`}
                    >
                      ×
                    </AriaRemoveButton>
                  )}
                </>
              )}
            </AriaTag>
          )}
        </TagList>
      </TagGroup>
      <input
        className="flex-1 min-w-[80px] outline-none bg-transparent text-sm"
        placeholder={tags.length === 0 ? 'Type and press Enter' : ''}
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

function EditRow({
  row,
  folders,
  onSave,
  onCancel,
}: {
  row: Row
  folders: FolderOption[]
  onSave: (changes: RowEditChanges) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(row.title)
  const [url, setUrl] = useState(row.url)
  const [folderId, setFolderId] = useState(row.folderId)
  const [tags, setTags] = useState(row.tags)
  const [note, setNote] = useState(row.note ?? '')

  return (
    <li className="rounded-lg bg-base-200">
      <form
        className="flex flex-col gap-2 py-2 px-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ title, url, tags, note: note.trim() || undefined, folderId })
        }}
      >
      <div className="flex gap-2">
        <label className={`${formFieldClass} flex-[2] gap-0.5`}>
          <span className="text-xs opacity-60">Title</span>
          <input
            autoFocus
            className={`${inputClass} w-full text-sm py-1`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={`${formFieldClass} flex-[3] gap-0.5`}>
          <span className="text-xs opacity-60">URL</span>
          <input className={`${inputClass} w-full text-sm py-1`} value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <label className={`${formFieldClass} flex-1 gap-0.5`}>
          <span className="text-xs opacity-60">Folder</span>
          <FolderCombobox folders={folders} value={folderId} onValueChange={setFolderId} />
        </label>
        <div className={`${formFieldClass} flex-[2] gap-0.5`}>
          <span className="text-xs opacity-60">Tags</span>
          <TagChipInput tags={tags} onChange={setTags} />
        </div>
      </div>
      <label className={`${formFieldClass} gap-0.5`}>
        <span className="text-xs opacity-60">Note</span>
        <textarea
          className={`${textareaClass} w-full text-sm`}
          rows={1}
          placeholder="Add a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex justify-start gap-2">
        <Button type="submit" size="sm" variant="primary">
          Save
        </Button>
        <Button type="button" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      </form>
    </li>
  )
}

function BookmarkCard({
  row,
  selected,
  archiveDisabled,
  onToggleSelected,
  onEdit,
  onArchive,
  onDelete,
  onFolderClick,
}: {
  row: Row
  selected: boolean
  archiveDisabled: boolean
  onToggleSelected: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onFolderClick: (id: string) => void
}) {
  const [ogImage, setOgImage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setOgImage(null)
    if (row.url) {
      getOgImage(row.url).then((image) => {
        if (!cancelled) setOgImage(image)
      })
    }
    return () => {
      cancelled = true
    }
  }, [row.url])

  return (
    <li className="group flex flex-col rounded-lg bg-base-200 overflow-hidden min-w-0">
      <div className="relative aspect-[1200/630] bg-base-300 flex items-center justify-center">
        {ogImage ? (
          <img src={ogImage} alt="" className="w-full h-full object-cover" />
        ) : row.url ? (
          <img src={faviconUrl(row.url, 48)} alt="" className="w-10 h-10 opacity-60" />
        ) : (
          <BookmarkIcon className="w-10 h-10 opacity-30 fill-current" />
        )}
        <Checkbox.Root
          checked={selected}
          onCheckedChange={onToggleSelected}
          className={`${checkboxClass} absolute top-2 left-2 flex items-center justify-center bg-base-100 shrink-0`}
        >
          <Checkbox.Indicator className="text-primary-content text-xs leading-none">✓</Checkbox.Indicator>
        </Checkbox.Root>
      </div>
      <div className="flex flex-col gap-1.5 py-3 px-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {row.url ? (
            <img src={faviconUrl(row.url)} alt="" className="w-4 h-4 shrink-0 rounded-sm" />
          ) : (
            <BookmarkIcon className="w-4 h-4 opacity-40 shrink-0 fill-current" />
          )}
          <span className="font-semibold truncate">{row.title}</span>
        </div>
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-sm text-primary hover:underline truncate pl-[1.5rem]"
        >
          {row.url}
        </a>
        {row.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pl-[1.5rem]">
            {row.tags.map((tag) => (
              <Chip key={tag} tag={tag} />
            ))}
          </div>
        )}
        {row.breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 pl-[1.5rem] text-xs flex-wrap">
            <FolderIcon className="w-3 h-3 shrink-0 fill-current" />
            {row.breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i > 0 && <span className="opacity-50">/</span>}
                <button type="button" className="hover:underline hover:text-primary" onClick={() => onFolderClick(crumb.id)}>
                  {crumb.title}
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 pl-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="xs" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="xs" variant="outline" disabled={archiveDisabled} onClick={onArchive}>
            Archive
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="xs" variant="error">
                Delete
              </Button>
            }
            title="Delete this bookmark?"
            description="This permanently deletes the bookmark."
            confirmLabel="Confirm?"
            onConfirm={onDelete}
          />
        </div>
      </div>
    </li>
  )
}

function parseTagInput(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))]
}

export function AllBookmarksTab() {
  const [tree, setTree] = useState<BookmarkNode[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [archiveFolderId, setArchiveFolderId] = useState<string | null>(null)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newArchiveParentId, setNewArchiveParentId] = useState('')
  const [newArchiveName, setNewArchiveName] = useState('')
  const [bulkMoveFolderId, setBulkMoveFolderId] = useState('')
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [view, setView] = useState<'list' | 'grid'>('list')

  function reload() {
    getTree().then((loadedTree) => {
      setTree(loadedTree)
      const options = listFolders(loadedTree[0]?.children ?? [])
      setFolders(options)
      if (!newArchiveParentId && options.length > 0) setNewArchiveParentId(options[0].id)
      setRows(
        flattenBookmarks(loadedTree).map((node) => {
          const decoded = decodeTitle(node.title)
          return {
            id: node.id,
            url: node.url ?? '',
            title: decoded.title,
            tags: decoded.tags,
            note: decoded.note,
            folderId: node.parentId ?? '',
            breadcrumb: node.parentId ? folderPath(loadedTree, node.parentId) : [],
            dateAdded: node.dateAdded ?? 0,
          }
        }),
      )
    })
  }

  useEffect(() => {
    reload()
    chrome.storage.local.get(LOCAL_KEY_ARCHIVE_FOLDER_ID).then((result) => {
      setArchiveFolderId(result[LOCAL_KEY_ARCHIVE_FOLDER_ID] ?? null)
    })
    chrome.bookmarks.onCreated.addListener(reload)
    chrome.bookmarks.onRemoved.addListener(reload)
    chrome.bookmarks.onChanged.addListener(reload)
    chrome.bookmarks.onMoved.addListener(reload)
    chrome.bookmarks.onChildrenReordered.addListener(reload)
    return () => {
      chrome.bookmarks.onCreated.removeListener(reload)
      chrome.bookmarks.onRemoved.removeListener(reload)
      chrome.bookmarks.onChanged.removeListener(reload)
      chrome.bookmarks.onMoved.removeListener(reload)
      chrome.bookmarks.onChildrenReordered.removeListener(reload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeRows = useMemo(() => {
    if (includeArchived || !archiveFolderId) return rows
    return rows.filter((row) => !isFolderWithin(tree, row.folderId, archiveFolderId))
  }, [rows, tree, archiveFolderId, includeArchived])

  const tagCounts = useMemo(() => countTags(rows), [rows])
  const folderCounts = useMemo(() => countFolders(rows), [rows])
  const folderCountById = useMemo(
    () => new Map(folderCounts.map((f) => [f.key, f.count])),
    [folderCounts],
  )
  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])

  const visibleRows = useMemo(() => {
    let filtered = activeRows
    if (selectedTags.length > 0) {
      filtered = filtered.filter((row) => selectedTags.every((tag) => row.tags.includes(tag)))
    }
    if (selectedFolderIds.length > 0) {
      filtered = filtered.filter((row) => selectedFolderIds.includes(row.folderId))
    }
    if (!query) return filtered
    return search(filtered, query)
  }, [activeRows, selectedTags, selectedFolderIds, query])

  function toggleTag(tag: string) {
    setSelectedTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]))
  }

  function toggleFolder(id: string) {
    setSelectedFolderIds((ids) => {
      const next = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
      if (next.includes(id) && archiveFolderId && isFolderWithin(tree, id, archiveFolderId)) {
        setIncludeArchived(true)
      }
      return next
    })
  }

  function clearFilters() {
    setSelectedTags([])
    setSelectedFolderIds([])
  }

  function toggleSelected(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? visibleRows.map((row) => row.id) : [])
  }

  async function confirmDeleteSelected() {
    await Promise.all(selectedIds.map((id) => removeBookmark(id)))
    setSelectedIds([])
    reload()
  }

  async function handleBulkArchive() {
    if (!archiveFolderId) return
    await Promise.all(selectedIds.map((id) => moveBookmark(id, archiveFolderId)))
    reload()
  }

  async function handleBulkMove() {
    if (!bulkMoveFolderId) return
    await Promise.all(selectedIds.map((id) => moveBookmark(id, bulkMoveFolderId)))
    setBulkMoveFolderId('')
    reload()
  }

  async function applyBulkTags(nextTagsFor: (row: Row) => string[]) {
    await Promise.all(
      selectedIds.map((id) => {
        const row = rows.find((r) => r.id === id)
        if (!row) return Promise.resolve()
        return updateTitle(id, encodeTitle({ title: row.title, tags: nextTagsFor(row), note: row.note }))
      }),
    )
    reload()
  }

  async function handleBulkAddTags() {
    const add = parseTagInput(bulkTagInput)
    if (add.length === 0) return
    await applyBulkTags((row) => [...new Set([...row.tags, ...add])])
    setBulkTagInput('')
  }

  async function handleBulkRemoveTags() {
    const remove = parseTagInput(bulkTagInput)
    if (remove.length === 0) return
    await applyBulkTags((row) => row.tags.filter((t) => !remove.includes(t)))
    setBulkTagInput('')
  }

  async function handleBulkClearTags() {
    await applyBulkTags(() => [])
  }

  async function handleArchiveOne(id: string) {
    if (!archiveFolderId) return
    await moveBookmark(id, archiveFolderId)
    reload()
  }

  async function handleDeleteOne(id: string) {
    await removeBookmark(id)
    reload()
  }

  async function handleSaveEdit(id: string, changes: RowEditChanges) {
    const row = rows.find((r) => r.id === id)
    await updateBookmark(id, {
      title: encodeTitle({ title: changes.title, tags: changes.tags, note: changes.note }),
      url: changes.url,
    })
    if (row && row.folderId !== changes.folderId) await moveBookmark(id, changes.folderId)
    setEditingId(null)
    reload()
  }

  async function handleCreateArchiveFolder(close: () => void) {
    const name = newArchiveName.trim()
    if (!name || !newArchiveParentId) return
    const folder = await createFolder(newArchiveParentId, name)
    await chrome.storage.local.set({ [LOCAL_KEY_ARCHIVE_FOLDER_ID]: folder.id })
    setArchiveFolderId(folder.id)
    setNewArchiveName('')
    close()
    reload()
  }

  const hasFilters = selectedTags.length > 0 || selectedFolderIds.length > 0

  return (
    <div className="flex gap-4">
      <aside className="w-64 shrink-0 flex flex-col gap-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {(tagsExpanded ? tagCounts : tagCounts.slice(0, TAG_BAR_LIMIT)).map(({ key, count }) => (
              <Chip
                key={key}
                tag={key}
                aria-current={selectedTags.includes(key)}
                onClick={() => toggleTag(key)}
                className={`font-medium whitespace-normal break-words ${selectedTags.includes(key) ? 'ring-2 ring-current' : ''}`}
              >
                {key} {count}
              </Chip>
            ))}
          </div>
          {tagCounts.length > TAG_BAR_LIMIT && (
            <Button variant="ghost" size="xs" className="mt-1" onClick={() => setTagsExpanded((v) => !v)}>
              {tagsExpanded ? 'Show less' : 'Show all'}
            </Button>
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Folders</h3>
          <div className="flex flex-col gap-0.5">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                style={{ paddingLeft: `${0.5 + folder.depth}rem` }}
                className={`flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm transition-colors ${
                  selectedFolderIds.includes(folder.id) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-base-200'
                }`}
                aria-current={selectedFolderIds.includes(folder.id)}
                onClick={() => toggleFolder(folder.id)}
              >
                <FolderIcon className="w-4 h-4 shrink-0 opacity-60 fill-current" />
                <span className="truncate flex-1 text-left">{folder.title}</span>
                <span className="text-xs opacity-50">{folderCountById.get(folder.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="w-[36rem] flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/40">
            <SearchIcon className="w-4 h-4 opacity-50 shrink-0 fill-current" />
            <input
              className="grow bg-transparent outline-none text-sm"
              placeholder="Search by title, URL, or tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-3 border border-base-300 rounded-lg px-3 py-2 shrink-0">
            <LabeledCheckbox checked={includeArchived} onCheckedChange={setIncludeArchived}>
              <span className="whitespace-nowrap text-sm">Include archived</span>
            </LabeledCheckbox>
            {!archiveFolderId && (
              <FormDialog
                trigger={
                  <Button variant="outline" size="sm" className="whitespace-nowrap">
                    Create Archive Folder
                  </Button>
                }
                title="Create archive folder"
              >
              {(close) => (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleCreateArchiveFolder(close)
                  }}
                >
                  <FolderCombobox folders={folders} value={newArchiveParentId} onValueChange={setNewArchiveParentId} />
                  <input
                    autoFocus
                    className={`${inputClass} w-full`}
                    placeholder="Archive folder name"
                    value={newArchiveName}
                    onChange={(e) => setNewArchiveName(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" onClick={close}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Create
                    </Button>
                  </div>
                </form>
              )}
              </FormDialog>
            )}
          </div>
        </div>
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <span className="text-sm font-medium shrink-0">Filtering by:</span>
            <Button variant="outline" size="xs" className="rounded-full shrink-0" onClick={clearFilters}>
              Clear all
            </Button>
            {selectedFolderIds.map((id) => {
              const folder = folderById.get(id)
              if (!folder) return null
              return (
                <Chip key={`folder-${id}`} tag={folder.title} onRemove={() => toggleFolder(id)}>
                  <FolderIcon className="w-3 h-3 shrink-0 fill-current" />
                  <span>{folder.title}</span>
                </Chip>
              )
            })}
            {selectedTags.map((tag) => (
              <Chip key={`tag-${tag}`} tag={tag} onRemove={() => toggleTag(tag)} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm opacity-70">{visibleRows.length} bookmarks</p>
          <div className="flex items-center gap-1">
            <Button size="xs" square active={view === 'list'} aria-label="List view" onClick={() => setView('list')}>
              <ViewListIcon className="w-4 h-4 fill-current" />
            </Button>
            <Button size="xs" square active={view === 'grid'} aria-label="Grid view" onClick={() => setView('grid')}>
              <GridViewIcon className="w-4 h-4 fill-current" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LabeledCheckbox
            checked={visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row.id))}
            onCheckedChange={toggleSelectAll}
          >
            Select all
          </LabeledCheckbox>
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm font-medium text-primary">{selectedIds.length} selected</span>
              <Button size="sm" disabled={!archiveFolderId} onClick={handleBulkArchive}>
                Archive
              </Button>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="error">
                    Delete
                  </Button>
                }
                title="Delete selected bookmarks?"
                description={`This permanently deletes ${selectedIds.length} bookmark(s).`}
                confirmLabel="Delete"
                onConfirm={confirmDeleteSelected}
              />
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </>
          )}
        </div>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border border-base-300 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium shrink-0">Move:</span>
              <FolderCombobox folders={folders} value={bulkMoveFolderId} onValueChange={setBulkMoveFolderId} />
              <Button size="sm" variant="primary" disabled={!bulkMoveFolderId} onClick={handleBulkMove}>
                Move
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <span className="text-sm font-medium shrink-0">Tags:</span>
              <input
                className={`${inputClass} flex-1`}
                placeholder="Add tags..."
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
              />
              <Button size="sm" variant="primary" onClick={handleBulkAddTags}>
                +Add
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkRemoveTags}>
                -Remove
              </Button>
              <Button size="sm" variant="error" onClick={handleBulkClearTags}>
                Remove Tags
              </Button>
            </div>
          </div>
        )}
        <ul
          className={
            view === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3'
              : 'flex flex-col gap-2'
          }
        >
          {visibleRows.map((row) =>
            editingId === row.id ? (
              <EditRow
                key={row.id}
                row={row}
                folders={folders}
                onCancel={() => setEditingId(null)}
                onSave={(changes) => handleSaveEdit(row.id, changes)}
              />
            ) : view === 'grid' ? (
              <BookmarkCard
                key={row.id}
                row={row}
                selected={selectedIds.includes(row.id)}
                archiveDisabled={!archiveFolderId}
                onToggleSelected={() => toggleSelected(row.id)}
                onEdit={() => setEditingId(row.id)}
                onArchive={() => handleArchiveOne(row.id)}
                onDelete={() => handleDeleteOne(row.id)}
                onFolderClick={toggleFolder}
              />
            ) : (
              <li key={row.id} className="group flex flex-col gap-1.5 py-3 px-3 rounded-lg bg-base-200 min-w-0">
                <div className="flex items-center gap-2">
                  <Checkbox.Root
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={() => toggleSelected(row.id)}
                    className={`${checkboxClass} flex items-center justify-center shrink-0`}
                  >
                    <Checkbox.Indicator className="text-primary-content text-xs leading-none">✓</Checkbox.Indicator>
                  </Checkbox.Root>
                  {row.url ? (
                    <img src={faviconUrl(row.url)} alt="" className="w-4 h-4 shrink-0 rounded-sm" />
                  ) : (
                    <BookmarkIcon className="w-4 h-4 opacity-40 shrink-0 fill-current" />
                  )}
                  <span className="font-semibold">{row.title}</span>
                </div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-sm text-primary hover:underline truncate pl-[1.5rem]"
                >
                  {row.url}
                </a>
                {row.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-[1.5rem]">
                    {row.tags.map((tag) => (
                      <Chip key={tag} tag={tag} />
                    ))}
                  </div>
                )}
                {row.breadcrumb.length > 0 && (
                  <div className="flex items-center gap-1 pl-[1.5rem] text-xs flex-wrap">
                    <FolderIcon className="w-3 h-3 shrink-0 fill-current" />
                    {row.breadcrumb.map((crumb, i) => (
                      <span key={crumb.id} className="flex items-center gap-1">
                        {i > 0 && <span className="opacity-50">/</span>}
                        <button
                          type="button"
                          className="hover:underline hover:text-primary"
                          onClick={() => toggleFolder(crumb.id)}
                        >
                          {crumb.title}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 pl-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="xs" variant="outline" onClick={() => setEditingId(row.id)}>
                    Edit
                  </Button>
                  <Button size="xs" variant="outline" disabled={!archiveFolderId} onClick={() => handleArchiveOne(row.id)}>
                    Archive
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="xs" variant="error">
                        Delete
                      </Button>
                    }
                    title="Delete this bookmark?"
                    description="This permanently deletes the bookmark."
                    confirmLabel="Confirm?"
                    onConfirm={() => handleDeleteOne(row.id)}
                  />
                </div>
              </li>
            ),
          )}
        </ul>
      </main>
    </div>
  )
}
