import { normalizeUrl } from './duplicates'

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

export function walk(nodes: BookmarkNode[], visit: (node: BookmarkNode) => void): void {
  for (const node of nodes) {
    visit(node)
    if (node.children) walk(node.children, visit)
  }
}

export function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const bookmarks: BookmarkNode[] = []
  walk(nodes, (node) => {
    if (node.url) bookmarks.push(node)
  })
  return bookmarks
}

export function findNodeById(nodes: BookmarkNode[], id: string): BookmarkNode | undefined {
  let found: BookmarkNode | undefined
  walk(nodes, (node) => {
    if (node.id === id) found = node
  })
  return found
}

export interface FolderCrumb {
  id: string
  title: string
}

/** Folders from the root down to (and including) `folderId`, e.g. [{id, title: "Bookmarks Bar"}, {id, title: "Pull Requests"}]. */
export function folderPath(nodes: BookmarkNode[], folderId: string): FolderCrumb[] {
  const path: FolderCrumb[] = []

  function search(node: BookmarkNode, trail: FolderCrumb[]): boolean {
    const nextTrail = node.url === undefined ? [...trail, { id: node.id, title: node.title }] : trail
    if (node.id === folderId) {
      path.push(...nextTrail)
      return true
    }
    return (node.children ?? []).some((child) => search(child, nextTrail))
  }

  nodes.some((node) => search(node, []))
  return path
}

export interface FolderOption {
  id: string
  title: string
  depth: number
}

/** Every folder in the tree, in display order, indented by nesting depth. */
export function listFolders(nodes: BookmarkNode[]): FolderOption[] {
  const folders: FolderOption[] = []

  function visit(node: BookmarkNode, depth: number) {
    if (node.url !== undefined) return
    folders.push({ id: node.id, title: node.title, depth })
    for (const child of node.children ?? []) visit(child, depth + 1)
  }

  for (const node of nodes) visit(node, 0)
  return folders
}

export interface FolderNode {
  id: string
  title: string
  children: FolderNode[]
}

/** Folders only, nested, for a collapsible Folders-tab tree. */
export function buildFolderTree(nodes: BookmarkNode[]): FolderNode[] {
  return nodes
    .filter((node) => node.url === undefined)
    .map((node) => ({
      id: node.id,
      title: node.title,
      children: buildFolderTree(node.children ?? []),
    }))
}

/** True if `folderId` is `ancestorId` itself or nested anywhere beneath it. */
export function isFolderWithin(nodes: BookmarkNode[], folderId: string, ancestorId: string): boolean {
  if (folderId === ancestorId) return true

  const parentOf = new Map<string, string>()
  walk(nodes, (node) => {
    for (const child of node.children ?? []) parentOf.set(child.id, node.id)
  })

  let current = folderId
  while (parentOf.has(current)) {
    current = parentOf.get(current)!
    if (current === ancestorId) return true
  }
  return false
}

/** The bookmark whose url normalizes to the same value as `url`, if any (spec: reference-parity §3.2/§4.1). */
export function findByUrl(nodes: BookmarkNode[], url: string): BookmarkNode | undefined {
  const target = normalizeUrl(url)
  return flattenBookmarks(nodes).find((node) => node.url !== undefined && normalizeUrl(node.url) === target)
}

export function getTree(): Promise<BookmarkNode[]> {
  return chrome.bookmarks.getTree()
}

export function createBookmark(details: chrome.bookmarks.BookmarkCreateArg): Promise<BookmarkNode> {
  return chrome.bookmarks.create(details)
}

export function createFolder(parentId: string, title: string): Promise<BookmarkNode> {
  return chrome.bookmarks.create({ parentId, title })
}

export function updateTitle(id: string, title: string): Promise<BookmarkNode> {
  return chrome.bookmarks.update(id, { title })
}

export function updateBookmark(id: string, changes: { title?: string; url?: string }): Promise<BookmarkNode> {
  return chrome.bookmarks.update(id, changes)
}

export function moveBookmark(id: string, parentId: string): Promise<BookmarkNode> {
  return chrome.bookmarks.move(id, { parentId })
}

export function removeBookmark(id: string): Promise<void> {
  return chrome.bookmarks.remove(id)
}

export function removeFolder(id: string): Promise<void> {
  return chrome.bookmarks.removeTree(id)
}

/** URL for a page's favicon via the extension's `_favicon` resource (requires the "favicon" permission). */
export function faviconUrl(pageUrl: string, size = 16): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'))
  url.searchParams.set('pageUrl', pageUrl)
  url.searchParams.set('size', String(size))
  return url.toString()
}
