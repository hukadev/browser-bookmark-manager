import { describe, expect, it } from 'vitest'
import { groupDuplicates, normalizeUrl, resolveCleanup, type DuplicateItem } from '../src/lib/duplicates'

describe('normalizeUrl', () => {
  it('treats http and https as equivalent', () => {
    expect(normalizeUrl('http://example.com/page')).toBe(normalizeUrl('https://example.com/page'))
  })

  it('strips a trailing slash', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe(normalizeUrl('https://example.com/page'))
  })

  it('strips a leading www.', () => {
    expect(normalizeUrl('https://www.example.com/page')).toBe(normalizeUrl('https://example.com/page'))
  })

  it('strips every known tracking query param', () => {
    const tracked =
      'https://example.com/page?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e&gclid=f&fbclid=g&msclkid=h&mc_cid=i&mc_eid=j'
    expect(normalizeUrl(tracked)).toBe(normalizeUrl('https://example.com/page'))
  })

  it('preserves non-tracking query params as a real difference', () => {
    expect(normalizeUrl('https://example.com/page?id=1')).not.toBe(
      normalizeUrl('https://example.com/page?id=2'),
    )
  })

  it('falls back to the raw string for an unparseable URL instead of throwing', () => {
    expect(() => normalizeUrl('not a url')).not.toThrow()
  })

  it('treats different ports on the same host as different, not duplicates', () => {
    expect(normalizeUrl('http://localhost:3000/app')).not.toBe(normalizeUrl('http://localhost:8080/app'))
  })
})

describe('groupDuplicates', () => {
  const items: DuplicateItem[] = [
    { id: '1', url: 'https://example.com/a', dateAdded: 100 },
    { id: '2', url: 'https://www.example.com/a/', dateAdded: 200 },
    { id: '3', url: 'https://example.com/b', dateAdded: 300 },
  ]

  it('groups only urls that normalize to the same key', () => {
    const groups = groupDuplicates(items)
    expect(groups).toHaveLength(1)
    expect(groups[0].map((i) => i.id).sort()).toEqual(['1', '2'])
  })

  it('excludes groups with no duplicates', () => {
    expect(groupDuplicates([items[2]])).toEqual([])
  })
})

describe('resolveCleanup', () => {
  const group: DuplicateItem[] = [
    { id: 'old', url: 'https://example.com/a', dateAdded: 100 },
    { id: 'new', url: 'https://example.com/a', dateAdded: 200 },
  ]

  it('keeps the oldest bookmark by default', () => {
    expect(resolveCleanup([group])).toEqual([{ keep: 'old', deleteIds: ['new'] }])
  })

  it('honors an explicit selection for that group over the default', () => {
    const key = normalizeUrl(group[0].url)
    expect(resolveCleanup([group], { [key]: 'new' })).toEqual([{ keep: 'new', deleteIds: ['old'] }])
  })
})
