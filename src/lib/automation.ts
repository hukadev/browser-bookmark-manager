import { LOCAL_KEY_AUTO_TAG_RULES, LOCAL_KEY_FOLDER_RULES } from '../shared/constants'
import { getBookmark, moveBookmark, updateTitle } from './bookmarks'
import { decodeTitle, encodeTitle } from './title-codec'

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

/** Runs auto-tag then folder rules against one freshly created bookmark. Returns its resulting tags/folder, or null if it no longer exists. */
export async function applyRulesToBookmark(id: string): Promise<{ tags: string[]; folderId: string } | null> {
  const [autoTagRules, folderRules, node] = await Promise.all([getAutoTagRules(), getFolderRules(), getBookmark(id)])
  if (!node?.url) return null

  const decoded = decodeTitle(node.title)
  const [tagged] = applyAutoTagRules([{ url: node.url, title: decoded.title, tags: decoded.tags }], autoTagRules)
  const tagsChanged =
    tagged.tags.length !== decoded.tags.length || !tagged.tags.every((tag) => decoded.tags.includes(tag))
  if (tagsChanged) {
    await updateTitle(id, encodeTitle({ ...decoded, tags: tagged.tags }))
  }

  const currentFolderId = node.parentId ?? ''
  const moves = resolveFolderMoves([{ id, tags: tagged.tags, folderId: currentFolderId }], folderRules)
  const folderId = moves[0]?.folderId ?? currentFolderId
  if (moves.length > 0) {
    await moveBookmark(id, folderId)
  }

  return { tags: tagged.tags, folderId }
}
