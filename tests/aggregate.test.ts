import { describe, expect, it } from 'vitest'
import { countBy, countFolders, countTags, tagStats } from '../src/lib/aggregate'

describe('aggregate', () => {
  it('counts occurrences across arrays of keys', () => {
    expect(countBy([['a', 'b'], ['a'], ['a', 'c']])).toEqual([
      { key: 'a', count: 3 },
      { key: 'b', count: 1 },
      { key: 'c', count: 1 },
    ])
  })

  it('sorts descending by count, then ascending alphabetically on ties', () => {
    expect(countBy([['b'], ['a']])).toEqual([
      { key: 'a', count: 1 },
      { key: 'b', count: 1 },
    ])
  })

  it('returns nothing for an empty input', () => {
    expect(countBy([])).toEqual([])
  })

  it('ignores bookmarks with no tags', () => {
    expect(countTags([{ tags: ['work'] }, { tags: [] }])).toEqual([{ key: 'work', count: 1 }])
  })

  it('counts bookmarks per folder', () => {
    expect(
      countFolders([{ folderId: '1' }, { folderId: '2' }, { folderId: '1' }]),
    ).toEqual([
      { key: '1', count: 2 },
      { key: '2', count: 1 },
    ])
  })

  it('computes Tags-tab stats cards', () => {
    expect(
      tagStats([{ tags: ['a', 'b'] }, { tags: ['a'] }, { tags: [] }]),
    ).toEqual({
      totalTags: 2,
      taggedBookmarks: 2,
      untaggedBookmarks: 1,
      avgUsesPerTag: 1.5,
    })
  })

  it('reports zero avg uses per tag when there are no tags at all', () => {
    expect(tagStats([{ tags: [] }])).toEqual({
      totalTags: 0,
      taggedBookmarks: 0,
      untaggedBookmarks: 1,
      avgUsesPerTag: 0,
    })
  })
})
