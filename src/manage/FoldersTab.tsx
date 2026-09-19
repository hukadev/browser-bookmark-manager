import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { countFolders } from '../lib/aggregate'
import {
  buildFolderTree,
  createFolder,
  flattenBookmarks,
  getTree,
  listFolders,
  moveBookmark,
  removeBookmark,
  removeFolder,
  updateTitle,
} from '../lib/bookmarks'
import { inputClass } from '../lib/ui-classes'
import { decodeTitle } from '../lib/title-codec'
import { LOCAL_KEY_ARCHIVE_FOLDER_ID } from '../shared/constants'
import { ConfirmDialog } from './ConfirmDialog'
import { FolderTree } from './FolderTree'
import { FormDialog } from './FormDialog'

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

const ROOT_FOLDER_ID = '1'

interface Row {
  id: string
  url: string
  title: string
  tags: string[]
  folderId: string
}

export function FoldersTab() {
  const [tree, setTree] = useState<BookmarkNode[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [archiveFolderId, setArchiveFolderId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [newFolderName, setNewFolderName] = useState('')
  const [renameValue, setRenameValue] = useState('')

  function reload() {
    getTree().then((loadedTree) => {
      setTree(loadedTree)
      setRows(
        flattenBookmarks(loadedTree).map((node) => {
          const decoded = decodeTitle(node.title)
          return {
            id: node.id,
            url: node.url ?? '',
            title: decoded.title,
            tags: decoded.tags,
            folderId: node.parentId ?? '',
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
  }, [])

  const roots = useMemo(() => buildFolderTree(tree[0]?.children ?? []), [tree])
  const countById = useMemo(() => {
    const counts = countFolders(rows)
    return new Map(counts.map((c) => [c.key, c.count]))
  }, [rows])

  useEffect(() => {
    const folder = listFolders(tree[0]?.children ?? []).find((f) => f.id === selectedFolderId)
    setRenameValue(folder?.title ?? '')
  }, [selectedFolderId, tree])

  const selectedFolderTitle = listFolders(tree[0]?.children ?? []).find((f) => f.id === selectedFolderId)?.title
  const bookmarksInSelected = rows.filter((row) => row.folderId === selectedFolderId)

  function toggleExpand(id: string) {
    setExpandedIds((ids) => {
      const next = new Set(ids)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAll() {
    setExpandedIds(new Set(listFolders(tree[0]?.children ?? []).map((f) => f.id)))
  }

  async function handleNewFolder(close: () => void) {
    const name = newFolderName.trim()
    if (!name) return
    await createFolder(selectedFolderId ?? ROOT_FOLDER_ID, name)
    setNewFolderName('')
    close()
    reload()
  }

  async function handleRename(close: () => void) {
    if (!selectedFolderId || !renameValue.trim()) return
    await updateTitle(selectedFolderId, renameValue.trim())
    close()
    reload()
  }

  async function handleArchive() {
    if (!selectedFolderId || !archiveFolderId) return
    const toMove = rows.filter((row) => row.folderId === selectedFolderId)
    await Promise.all(toMove.map((row) => moveBookmark(row.id, archiveFolderId)))
    reload()
  }

  async function handleDeleteFolder() {
    if (!selectedFolderId) return
    await removeFolder(selectedFolderId)
    setSelectedFolderId(null)
    reload()
  }

  async function handleDeleteBookmark(id: string) {
    await removeBookmark(id)
    reload()
  }

  const folderCount = listFolders(tree[0]?.children ?? []).length

  return (
    <div className="flex gap-4">
      <aside className="w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FormDialog
            trigger={
              <Button variant="primary" size="sm">
                + New Folder
              </Button>
            }
            title="New folder"
          >
            {(close) => (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleNewFolder(close)
                }}
              >
                <input
                  autoFocus
                  className={`${inputClass} w-full`}
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
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
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
        </div>
        <p className="text-xs opacity-60">
          {rows.length} bookmarks in {folderCount} folder{folderCount === 1 ? '' : 's'}
        </p>
        <FolderTree
          nodes={roots}
          countById={countById}
          expandedIds={expandedIds}
          selectedId={selectedFolderId}
          onToggleExpand={toggleExpand}
          onSelect={setSelectedFolderId}
        />
      </aside>
      <main className="flex-1 flex flex-col gap-3">
        {!selectedFolderId && (
          <div className="flex flex-col items-center justify-center text-center gap-1 py-16 opacity-60">
            <p className="font-semibold">Select a folder</p>
            <p className="text-sm">Click a folder on the left to view its contents</p>
          </div>
        )}
        {selectedFolderId && (
          <div className="flex items-center gap-2">
            <span className="font-bold">{selectedFolderTitle}</span>
            <FormDialog
              trigger={<Button size="sm">Rename</Button>}
              title="Rename folder"
            >
              {(close) => (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleRename(close)
                  }}
                >
                  <input
                    autoFocus
                    className={`${inputClass} w-full`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
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
            <Button size="sm" disabled={!archiveFolderId} onClick={handleArchive}>
              Archive
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="error">
                  Delete
                </Button>
              }
              title={`Delete "${selectedFolderTitle}"?`}
              description="This permanently deletes the folder and everything inside it."
              confirmLabel="Delete"
              onConfirm={handleDeleteFolder}
            />
          </div>
        )}
        <ul className="flex flex-col gap-1">
          {bookmarksInSelected.map((row) => (
            <li key={row.id} className="flex items-center gap-2 py-1 border-b border-base-200">
              <span className="font-medium">{row.title}</span>
              <span className="text-sm opacity-60 truncate">{row.url}</span>
              <Button
                size="xs"
                variant="error"
                className="ml-auto"
                onClick={() => handleDeleteBookmark(row.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
