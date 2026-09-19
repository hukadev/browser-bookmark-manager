import { describe, expect, it, vi } from 'vitest'
import {
  buildFolderTree,
  createBookmark,
  findByUrl,
  findNodeById,
  flattenBookmarks,
  folderPath,
  listFolders,
  removeBookmark,
  updateBookmark,
} from '../src/lib/bookmarks'

type Node = chrome.bookmarks.BookmarkTreeNode

const tree: Node[] = [
  {
    id: '1',
    title: 'Bookmarks Bar',
    children: [
      {
        id: '2',
        title: 'Pull Requests',
        children: [{ id: '3', title: '[work] Some PR', url: 'https://example.com/pr' }],
      },
      { id: '4', title: '[docs] Root-level bookmark', url: 'https://example.com/docs' },
    ],
  },
] as unknown as Node[]

describe('bookmarks.ts tree helpers', () => {
  it('flattens every url-bearing node across nested folders', () => {
    expect(flattenBookmarks(tree).map((n) => n.id)).toEqual(['3', '4'])
  })

  it('finds a node anywhere in the tree by id', () => {
    expect(findNodeById(tree, '3')?.title).toBe('[work] Some PR')
    expect(findNodeById(tree, 'missing')).toBeUndefined()
  })

  it('builds a breadcrumb of folders down to the given folder', () => {
    expect(folderPath(tree, '2')).toEqual([
      { id: '1', title: 'Bookmarks Bar' },
      { id: '2', title: 'Pull Requests' },
    ])
  })

  it('returns a single-crumb breadcrumb for a top-level folder', () => {
    expect(folderPath(tree, '1')).toEqual([{ id: '1', title: 'Bookmarks Bar' }])
  })

  it('lists every folder, indented by nesting depth, skipping bookmarks', () => {
    expect(listFolders(tree)).toEqual([
      { id: '1', title: 'Bookmarks Bar', depth: 0 },
      { id: '2', title: 'Pull Requests', depth: 1 },
    ])
  })

  it('builds a nested folder-only tree for the Folders tab', () => {
    expect(buildFolderTree(tree)).toEqual([
      {
        id: '1',
        title: 'Bookmarks Bar',
        children: [{ id: '2', title: 'Pull Requests', children: [] }],
      },
    ])
  })

  it('finds a bookmark by normalized url match', () => {
    expect(findByUrl(tree, 'https://example.com/pr')?.id).toBe('3')
    expect(findByUrl(tree, 'https://www.example.com/pr/')?.id).toBe('3')
    expect(findByUrl(tree, 'http://example.com/pr')?.id).toBe('3')
  })

  it('returns undefined when no bookmark matches the url', () => {
    expect(findByUrl(tree, 'https://example.com/nope')).toBeUndefined()
  })
})

describe('bookmarks.ts chrome.bookmarks wrappers', () => {
  it('delegates createBookmark to chrome.bookmarks.create', async () => {
    const create = vi.fn().mockResolvedValue({ id: '5' })
    vi.stubGlobal('chrome', { bookmarks: { create } })

    const details = { parentId: '1', title: '[work] New', url: 'https://example.com' }
    await createBookmark(details)

    expect(create).toHaveBeenCalledWith(details)
    vi.unstubAllGlobals()
  })

  it('delegates removeBookmark to chrome.bookmarks.remove', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('chrome', { bookmarks: { remove } })

    await removeBookmark('5')

    expect(remove).toHaveBeenCalledWith('5')
    vi.unstubAllGlobals()
  })

  it('delegates updateBookmark to chrome.bookmarks.update with title and url', async () => {
    const update = vi.fn().mockResolvedValue({ id: '5' })
    vi.stubGlobal('chrome', { bookmarks: { update } })

    await updateBookmark('5', { title: '[work] X', url: 'https://example.com' })

    expect(update).toHaveBeenCalledWith('5', { title: '[work] X', url: 'https://example.com' })
    vi.unstubAllGlobals()
  })
})
