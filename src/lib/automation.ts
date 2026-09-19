import { LOCAL_KEY_AUTO_TAG_RULES, LOCAL_KEY_FOLDER_RULES } from '../shared/constants'

export interface AutoTagRule {
  id: string
  when: 'url-contains' | 'title-contains' | 'url-regex' | 'title-regex'
  pattern: string
  tags: string[]
  /** Defaults to true when omitted, so existing stored rules stay active. */
  enabled?: boolean
}

export interface FolderRule {
  id: string
  when: 'tags-include' | 'any-tag-matches' | 'all-tags-match'
  tags: string[]
  folderId: string
  /** Defaults to true when omitted, so existing stored rules stay active. */
  enabled?: boolean
}

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value)
  } catch {
    return false
  }
}

export function matchesAutoTagRule(
  bookmark: { url: string; title: string },
  rule: AutoTagRule,
): boolean {
  switch (rule.when) {
    case 'url-contains':
      return bookmark.url.includes(rule.pattern)
    case 'title-contains':
      return bookmark.title.includes(rule.pattern)
    case 'url-regex':
      return safeRegexTest(rule.pattern, bookmark.url)
    case 'title-regex':
      return safeRegexTest(rule.pattern, bookmark.title)
  }
}

export function applyAutoTagRules<T extends { url: string; title: string; tags: string[] }>(
  bookmarks: T[],
  rules: AutoTagRule[],
): T[] {
  return bookmarks.map((bookmark) => {
    const matching = rules.filter((rule) => rule.enabled !== false && matchesAutoTagRule(bookmark, rule))
    if (matching.length === 0) return bookmark
    const tags = [...new Set([...bookmark.tags, ...matching.flatMap((rule) => rule.tags)])]
    return { ...bookmark, tags }
  })
}

export function matchesFolderRule(bookmark: { tags: string[] }, rule: FolderRule): boolean {
  switch (rule.when) {
    case 'tags-include':
      return rule.tags.every((tag) => bookmark.tags.includes(tag))
    case 'any-tag-matches':
      return rule.tags.some((tag) => bookmark.tags.includes(tag))
    case 'all-tags-match':
      return (
        bookmark.tags.length === rule.tags.length &&
        rule.tags.every((tag) => bookmark.tags.includes(tag))
      )
  }
}

export async function getAutoTagRules(): Promise<AutoTagRule[]> {
  const result = await chrome.storage.local.get(LOCAL_KEY_AUTO_TAG_RULES)
  return result[LOCAL_KEY_AUTO_TAG_RULES] ?? []
}

export function saveAutoTagRules(rules: AutoTagRule[]): Promise<void> {
  return chrome.storage.local.set({ [LOCAL_KEY_AUTO_TAG_RULES]: rules })
}

export async function getFolderRules(): Promise<FolderRule[]> {
  const result = await chrome.storage.local.get(LOCAL_KEY_FOLDER_RULES)
  return result[LOCAL_KEY_FOLDER_RULES] ?? []
}

export function saveFolderRules(rules: FolderRule[]): Promise<void> {
  return chrome.storage.local.set({ [LOCAL_KEY_FOLDER_RULES]: rules })
}

export interface FolderMove {
  id: string
  folderId: string
}

/** First matching rule wins; a bookmark already in its target folder is skipped. */
export function resolveFolderMoves(
  bookmarks: { id: string; tags: string[]; folderId: string }[],
  rules: FolderRule[],
): FolderMove[] {
  const moves: FolderMove[] = []
  for (const bookmark of bookmarks) {
    const rule = rules.find((r) => r.enabled !== false && matchesFolderRule(bookmark, r))
    if (rule && rule.folderId !== bookmark.folderId) {
      moves.push({ id: bookmark.id, folderId: rule.folderId })
    }
  }
  return moves
}
