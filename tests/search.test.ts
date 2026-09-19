import { describe, expect, it } from 'vitest'
import { search, type SearchItem } from '../src/lib/search'

function item(overrides: Partial<SearchItem>): SearchItem {
  return {
    id: '0',
    url: 'https://example.com',
    title: 'Untitled',
    tags: [],
    dateAdded: 0,
    ...overrides,
  }
}

describe('search', () => {
  it('matches #tag queries exactly, not as a substring on other tags', () => {
    const items = [
      item({ id: '1', tags: ['work'] }),
      item({ id: '2', tags: ['homework'] }),
      item({ id: '3', tags: ['other'] }),
    ]
    expect(search(items, '#work').map((i) => i.id)).toEqual(['1'])
  })

  it('is case-insensitive for #tag queries', () => {
    const items = [item({ id: '1', tags: ['Work'] })]
    expect(search(items, '#WORK').map((i) => i.id)).toEqual(['1'])
  })

  it('matches a title substring case-insensitively', () => {
    const items = [item({ id: '1', title: 'Deployment Guide' }), item({ id: '2', title: 'Nope' })]
    expect(search(items, 'guide').map((i) => i.id)).toEqual(['1'])
  })

  it('matches a URL substring when the title does not match', () => {
    const items = [
      item({ id: '1', title: 'Nope', url: 'https://example.com/deploy-guide' }),
      item({ id: '2', title: 'Nope', url: 'https://other.com' }),
    ]
    expect(search(items, 'deploy-guide').map((i) => i.id)).toEqual(['1'])
  })

  it('ranks title matches above URL-only matches', () => {
    const items = [
      item({ id: 'url-only', title: 'Nope', url: 'https://example.com/panorama' }),
      item({ id: 'title-match', title: 'Panorama service', url: 'https://other.com' }),
    ]
    expect(search(items, 'panorama').map((i) => i.id)).toEqual(['title-match', 'url-only'])
  })

  it('breaks ties within the same tier by most-recently-added first', () => {
    const items = [
      item({ id: 'older', title: 'Panorama a', dateAdded: 100 }),
      item({ id: 'newer', title: 'Panorama b', dateAdded: 200 }),
    ]
    expect(search(items, 'panorama').map((i) => i.id)).toEqual(['newer', 'older'])
  })

  it('excludes non-matching bookmarks entirely', () => {
    const items = [item({ id: '1', title: 'Match' }), item({ id: '2', title: 'Nope' })]
    expect(search(items, 'match').map((i) => i.id)).toEqual(['1'])
  })

  it('returns everything, most-recent first, for an empty query', () => {
    const items = [
      item({ id: 'older', dateAdded: 100 }),
      item({ id: 'newer', dateAdded: 200 }),
    ]
    expect(search(items, '').map((i) => i.id)).toEqual(['newer', 'older'])
  })
})
