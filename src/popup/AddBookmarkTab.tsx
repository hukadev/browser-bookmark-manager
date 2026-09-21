import { useEffect, useRef, useState } from 'react'
import {
  Button as AriaRemoveButton,
  ComboBox,
  Input as ComboBoxInput,
  ListBox,
  ListBoxItem,
  Popover,
  Tag as AriaTag,
  TagGroup,
  TagList,
} from 'react-aria-components'
import {
  createBookmark,
  findByUrl,
  flattenBookmarks,
  getTree,
  listFolders,
  moveBookmark,
  updateBookmark,
  type FolderOption,
} from '../lib/bookmarks'
import { countTags } from '../lib/aggregate'
import { updateBadgeForTab } from '../lib/badge'
import { suggestTags, type TagSuggestion } from '../lib/tag-suggest'
import { tagBgTintClass, tagBorderColorClass, tagColorClass, tagTextColorClass } from '../lib/tag-color'
import { formFieldClass, inputClass, labelClass, textareaClass } from '../lib/ui-classes'
import { decodeTitle, encodeTitle } from '../lib/title-codec'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { HelpPopover } from './HelpPopover'

const AUTOSAVE_DEBOUNCE_MS = 500

const FOOTER_TIPS = [
  'Tip: Open Manage tab to edit, archive, or bulk-organize',
  'Tip: Type a tag and press comma to add several at once',
  'Tip: Click the Tags field to pick from your most-used tags',
  'Tip: Notes save with the bookmark, so they sync across devices too',
]

export function AddBookmarkTab() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [note, setNote] = useState('')
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [folderId, setFolderId] = useState('')
  const [folderInputValue, setFolderInputValue] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [existing, setExisting] = useState<{ url: string; tags: string[]; title: string }[]>([])
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [footerTip] = useState(() => FOOTER_TIPS[Math.floor(Math.random() * FOOTER_TIPS.length)])
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const tagsRef = useRef(tags)
  const activeTabRef = useRef<{ id: number; url: string } | null>(null)

  useEffect(() => {
    tagsRef.current = tags
  }, [tags])

  function refreshBadge() {
    const tab = activeTabRef.current
    if (tab) updateBadgeForTab(tab.id, tab.url)
  }

  // The bookmark this popup is bound to can disappear out from under it (removed via
  // Chrome, the Manage tab, or the toolbar-icon toggle) while the popup stays open with
  // a now-stale existingId. Any further chrome.bookmarks.update/move call then rejects;
  // catching it here falls back to "new bookmark" mode instead of silently no-op'ing.
  function handleStaleBookmark() {
    setExistingId(null)
  }

  useEffect(() => {
    Promise.all([chrome.tabs.query({ active: true, currentWindow: true }), getTree()]).then(
      ([[activeTab], tree]) => {
        if (activeTab?.id !== undefined && activeTab.url) {
          activeTabRef.current = { id: activeTab.id, url: activeTab.url }
        }

        const options = listFolders(tree[0]?.children ?? [])
        setFolders(options)

        setExisting(
          flattenBookmarks(tree).map((node) => {
            const decoded = decodeTitle(node.title)
            return { url: node.url ?? '', tags: decoded.tags, title: decoded.title }
          }),
        )

        const activeUrl = activeTab?.url ?? ''
        const match = findByUrl(tree, activeUrl)
        if (match) {
          const decoded = decodeTitle(match.title)
          setExistingId(match.id)
          setUrl(match.url ?? activeUrl)
          setTitle(decoded.title)
          setTags(decoded.tags)
          setNote(decoded.note ?? '')
          const matchFolderId = match.parentId ?? options[0]?.id ?? ''
          setFolderId(matchFolderId)
          setFolderInputValue(options.find((f) => f.id === matchFolderId)?.title ?? '')
        } else {
          setUrl(activeUrl)
          setTitle(activeTab?.title ?? '')
          if (options.length > 0) {
            setFolderId(options[0].id)
            setFolderInputValue(options[0].title)
          }
        }
      },
    )
  }, [])

  useEffect(() => {
    if (!url || !title) {
      setSuggestions([])
      return
    }
    setSuggestions(suggestTags(existing, url, title, tags))
  }, [existing, url, title, tags])

  const popularTags = countTags(existing).filter(({ key }) => !tags.includes(key))

  // Debounced autosave for freeform text fields; tag/folder changes save immediately (see addTag/removeTag/handleFolderChange).
  useEffect(() => {
    if (existingId === null) return
    const timeout = setTimeout(() => {
      updateBookmark(existingId, {
        url,
        title: encodeTitle({ title, tags: tagsRef.current, note: note.trim() || undefined }),
      })
        .then(refreshBadge)
        .catch(handleStaleBookmark)
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [existingId, url, title, note])

  function saveTags(nextTags: string[]) {
    const nextTitle = encodeTitle({ title, tags: nextTags, note: note.trim() || undefined })
    if (existingId !== null) {
      updateBookmark(existingId, { title: nextTitle }).then(refreshBadge).catch(handleStaleBookmark)
    } else {
      createBookmark({ parentId: folderId, title: nextTitle, url }).then((created) => {
        setExistingId(created.id)
        refreshBadge()
      })
    }
  }

  function addTag(raw: string) {
    const tag = raw.trim()
    setTagInput('')
    if (!tag || tags.includes(tag)) return
    const nextTags = [...tags, tag]
    setTags(nextTags)
    saveTags(nextTags)
  }

  function handleTagInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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

  function removeTag(tag: string) {
    const nextTags = tags.filter((t) => t !== tag)
    setTags(nextTags)
    saveTags(nextTags)
  }

  function handleFolderChange(nextFolderId: string) {
    setFolderId(nextFolderId)
    if (existingId !== null) {
      moveBookmark(existingId, nextFolderId).then(refreshBadge).catch(handleStaleBookmark)
    } else {
      createBookmark({
        parentId: nextFolderId,
        title: encodeTitle({ title, tags, note: note.trim() || undefined }),
        url,
      }).then((created) => {
        setExistingId(created.id)
        refreshBadge()
      })
    }
  }

  async function handleSave() {
    const created = await createBookmark({
      parentId: folderId,
      title: encodeTitle({ title, tags, note: note.trim() || undefined }),
      url,
    })
    setExistingId(created.id)
    refreshBadge()
  }

  return (
    <div className="flex flex-col gap-3">
      <label className={formFieldClass}>
        <span className={labelClass}>URL</span>
        <input className={`${inputClass} w-full text-primary`} value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className={formFieldClass}>
        <span className={labelClass}>Title</span>
        <input className={`${inputClass} w-full`} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className={formFieldClass}>
        <span className={`${labelClass} inline-flex items-center gap-1 w-fit`}>
          Tags
          <HelpPopover label="How tags work">
            <p>Tags save as [tag1][tag2] in the title, so they sync via Chrome Sync automatically.</p>
          </HelpPopover>
        </span>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1 text-xs">
            <span className="opacity-70">Suggested:</span>
            {suggestions.map((s) => (
              <Chip key={s.tag} tag={s.tag} onClick={() => addTag(s.tag)}>
                {s.tag} {s.percentage}%
              </Chip>
            ))}
          </div>
        )}
        <div className="relative">
          <div className={`${inputClass} w-full h-auto min-h-10 flex flex-wrap items-center gap-1 py-1`}>
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
              onKeyDown={handleTagInputKeyDown}
              onFocus={() => setTagDropdownOpen(true)}
              onBlur={() => setTimeout(() => setTagDropdownOpen(false), 150)}
            />
          </div>
          {tagDropdownOpen && popularTags.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-base-100 border border-base-300 rounded-lg shadow-lg p-1">
              {popularTags.map(({ key, count }) => (
                <li key={key}>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full text-xs text-left cursor-pointer rounded-md px-2 py-1 hover:bg-base-200"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addTag(key)
                      setTagDropdownOpen(false)
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tagColorClass(key).replace('badge-', 'bg-')}`} />
                    {key}
                    <span className="opacity-50">({count})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="text-xs opacity-60 mt-1">Press Enter or comma to add multiple tags</span>
      </div>
      <div className={formFieldClass}>
        <span className={`${labelClass} inline-flex items-center gap-1 w-fit`}>
          Note
          <HelpPopover label="How notes work">
            <p>Notes save as ((note: ...)) in the title, so they sync the same way as tags.</p>
          </HelpPopover>
        </span>
        <textarea
          className={`${textareaClass} w-full`}
          rows={2}
          placeholder="Add a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <label className={formFieldClass}>
        <span className={labelClass}>Folder</span>
        <ComboBox
          aria-label="Folder"
          menuTrigger="focus"
          defaultItems={folders}
          selectedKey={folderId}
          inputValue={folderInputValue}
          onInputChange={setFolderInputValue}
          onFocus={() => setFolderInputValue('')}
          onBlur={() => setFolderInputValue(folders.find((f) => f.id === folderId)?.title ?? '')}
          onSelectionChange={(key) => {
            if (key === null) return
            const nextFolderId = String(key)
            handleFolderChange(nextFolderId)
            setFolderInputValue(folders.find((f) => f.id === nextFolderId)?.title ?? '')
          }}
        >
          <ComboBoxInput className={`${inputClass} w-full`} />
          <Popover className="w-(--trigger-width) bg-base-100 text-base-content border border-base-300 rounded-lg shadow-lg p-1 z-50">
            <ListBox className="max-h-56 overflow-auto outline-none font-mono">
              {(folder: FolderOption) => (
                <ListBoxItem
                  id={folder.id}
                  textValue={folder.title}
                  className="rounded-md px-1 py-0.5 outline-none cursor-pointer data-[focused]:bg-base-200"
                >
                  {folder.linePrefix + folder.title}
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        </ComboBox>
      </label>
      {existingId === null ? (
        <Button variant="primary" onClick={handleSave}>
          Save Bookmark
        </Button>
      ) : (
        <p role="status" className="bg-warning/10 border border-dashed border-warning text-sm rounded-lg px-3 py-2">
          Bookmark exists - changes auto-save
        </p>
      )}
      <p className="text-xs opacity-50">{footerTip}</p>
    </div>
  )
}
