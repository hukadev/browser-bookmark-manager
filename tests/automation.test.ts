import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyAutoTagRules,
  getAutoTagRules,
  getFolderRules,
  matchesAutoTagRule,
  matchesFolderRule,
  resolveFolderMoves,
  saveAutoTagRules,
  saveFolderRules,
  type AutoTagRule,
  type FolderRule,
} from '../src/lib/automation'
import { LOCAL_KEY_AUTO_TAG_RULES, LOCAL_KEY_FOLDER_RULES } from '../src/shared/constants'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('matchesAutoTagRule', () => {
  const bookmark = { url: 'https://github.com/openwt/panorama', title: 'Panorama PR #42' }

  it('matches url-contains', () => {
    const rule: AutoTagRule = { id: '1', when: 'url-contains', pattern: 'github.com', tags: ['dev'] }
    expect(matchesAutoTagRule(bookmark, rule)).toBe(true)
  })

  it('matches title-contains', () => {
    const rule: AutoTagRule = { id: '1', when: 'title-contains', pattern: 'Panorama', tags: ['dev'] }
    expect(matchesAutoTagRule(bookmark, rule)).toBe(true)
  })

  it('matches url-matches-regex', () => {
    const rule: AutoTagRule = { id: '1', when: 'url-regex', pattern: '/openwt/\\w+$', tags: ['dev'] }
    expect(matchesAutoTagRule(bookmark, rule)).toBe(true)
  })

  it('matches title-matches-regex', () => {
    const rule: AutoTagRule = { id: '1', when: 'title-regex', pattern: 'PR #\\d+', tags: ['dev'] }
    expect(matchesAutoTagRule(bookmark, rule)).toBe(true)
  })

  it('does not match when the condition fails', () => {
    const rule: AutoTagRule = { id: '1', when: 'url-contains', pattern: 'gitlab.com', tags: ['dev'] }
    expect(matchesAutoTagRule(bookmark, rule)).toBe(false)
  })

  it('treats an invalid regex as a non-match instead of throwing', () => {
    const rule: AutoTagRule = { id: '1', when: 'title-regex', pattern: '(unclosed', tags: ['dev'] }
    expect(() => matchesAutoTagRule(bookmark, rule)).not.toThrow()
    expect(matchesAutoTagRule(bookmark, rule)).toBe(false)
  })
})

describe('applyAutoTagRules', () => {
  it('adds a matching rule tag without duplicating an existing one', () => {
    const bookmarks = [{ id: '1', url: 'https://github.com/x', title: 'X', tags: ['dev'] }]
    const rules: AutoTagRule[] = [
      { id: 'r1', when: 'url-contains', pattern: 'github.com', tags: ['dev', 'oss'] },
    ]
    expect(applyAutoTagRules(bookmarks, rules)).toEqual([
      { id: '1', url: 'https://github.com/x', title: 'X', tags: ['dev', 'oss'] },
    ])
  })

  it('leaves tags untouched when no rule matches', () => {
    const bookmarks = [{ id: '1', url: 'https://example.com', title: 'X', tags: [] }]
    const rules: AutoTagRule[] = [
      { id: 'r1', when: 'url-contains', pattern: 'github.com', tags: ['oss'] },
    ]
    expect(applyAutoTagRules(bookmarks, rules)).toEqual(bookmarks)
  })
})

describe('matchesFolderRule', () => {
  it('tags-include: true only when the bookmark has every rule tag (superset)', () => {
    const rule: FolderRule = { id: '1', when: 'tags-include', tags: ['work', 'urgent'], folderId: 'f' }
    expect(matchesFolderRule({ tags: ['work', 'urgent', 'extra'] }, rule)).toBe(true)
    expect(matchesFolderRule({ tags: ['work'] }, rule)).toBe(false)
  })

  it('any-tag-matches: true when at least one tag overlaps', () => {
    const rule: FolderRule = { id: '1', when: 'any-tag-matches', tags: ['work', 'urgent'], folderId: 'f' }
    expect(matchesFolderRule({ tags: ['urgent'] }, rule)).toBe(true)
    expect(matchesFolderRule({ tags: ['other'] }, rule)).toBe(false)
  })

  it('all-tags-match: true only for an exact set match', () => {
    const rule: FolderRule = { id: '1', when: 'all-tags-match', tags: ['work', 'urgent'], folderId: 'f' }
    expect(matchesFolderRule({ tags: ['urgent', 'work'] }, rule)).toBe(true)
    expect(matchesFolderRule({ tags: ['work', 'urgent', 'extra'] }, rule)).toBe(false)
    expect(matchesFolderRule({ tags: ['work'] }, rule)).toBe(false)
  })
})

describe('resolveFolderMoves', () => {
  it('moves a bookmark to the first matching rule\'s folder', () => {
    const bookmarks = [{ id: '1', tags: ['work'], folderId: 'inbox' }]
    const rules: FolderRule[] = [
      { id: 'r1', when: 'any-tag-matches', tags: ['work'], folderId: 'work-folder' },
      { id: 'r2', when: 'any-tag-matches', tags: ['work'], folderId: 'other-folder' },
    ]
    expect(resolveFolderMoves(bookmarks, rules)).toEqual([{ id: '1', folderId: 'work-folder' }])
  })

  it('skips a bookmark already in its target folder', () => {
    const bookmarks = [{ id: '1', tags: ['work'], folderId: 'work-folder' }]
    const rules: FolderRule[] = [{ id: 'r1', when: 'any-tag-matches', tags: ['work'], folderId: 'work-folder' }]
    expect(resolveFolderMoves(bookmarks, rules)).toEqual([])
  })

  it('skips a bookmark that matches no rule', () => {
    const bookmarks = [{ id: '1', tags: ['other'], folderId: 'inbox' }]
    const rules: FolderRule[] = [{ id: 'r1', when: 'any-tag-matches', tags: ['work'], folderId: 'work-folder' }]
    expect(resolveFolderMoves(bookmarks, rules)).toEqual([])
  })
})

describe('rule storage', () => {
  it('reads auto-tag rules from chrome.storage.local, defaulting to empty', async () => {
    vi.stubGlobal('chrome', {
      storage: { local: { get: vi.fn().mockResolvedValue({}) } },
    })
    expect(await getAutoTagRules()).toEqual([])
  })

  it('writes auto-tag rules under the shared storage key', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('chrome', { storage: { local: { set } } })
    const rules: AutoTagRule[] = [{ id: '1', when: 'url-contains', pattern: 'x', tags: ['y'] }]

    await saveAutoTagRules(rules)

    expect(set).toHaveBeenCalledWith({ [LOCAL_KEY_AUTO_TAG_RULES]: rules })
  })

  it('reads folder rules from chrome.storage.local, defaulting to empty', async () => {
    vi.stubGlobal('chrome', {
      storage: { local: { get: vi.fn().mockResolvedValue({}) } },
    })
    expect(await getFolderRules()).toEqual([])
  })

  it('writes folder rules under the shared storage key', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('chrome', { storage: { local: { set } } })
    const rules: FolderRule[] = [{ id: '1', when: 'any-tag-matches', tags: ['y'], folderId: 'f' }]

    await saveFolderRules(rules)

    expect(set).toHaveBeenCalledWith({ [LOCAL_KEY_FOLDER_RULES]: rules })
  })
})
