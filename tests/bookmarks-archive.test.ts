import { describe, expect, it } from 'vitest'
import { isFolderWithin } from '../src/lib/bookmarks'

type Node = chrome.bookmarks.BookmarkTreeNode

const tree: Node[] = [
  {
    id: '1',
    title: 'Bookmarks Bar',
    children: [
      {
        id: '2',
        title: 'Archive',
        children: [{ id: '3', title: 'Old stuff', children: [] }],
      },
      { id: '4', title: 'Active work', children: [] },
    ],
  },
] as unknown as Node[]

describe('isFolderWithin', () => {
  it('is true for the ancestor folder itself', () => {
    expect(isFolderWithin(tree, '2', '2')).toBe(true)
  })

  it('is true for a direct child of the ancestor', () => {
    expect(isFolderWithin(tree, '3', '2')).toBe(true)
  })

  it('is false for a folder outside the ancestor subtree', () => {
    expect(isFolderWithin(tree, '4', '2')).toBe(false)
  })

  it('is false when the ancestor id does not exist', () => {
    expect(isFolderWithin(tree, '3', 'missing')).toBe(false)
  })
})
