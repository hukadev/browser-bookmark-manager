export interface KeyCount {
  key: string
  count: number
}

export function countBy(keyLists: string[][]): KeyCount[] {
  const counts = new Map<string, number>()
  for (const keys of keyLists) {
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

export function countTags(bookmarks: { tags: string[] }[]): KeyCount[] {
  return countBy(bookmarks.map((b) => b.tags))
}

export function countFolders(bookmarks: { folderId: string }[]): KeyCount[] {
  return countBy(bookmarks.map((b) => [b.folderId]))
}

export interface TagStats {
  totalTags: number
  taggedBookmarks: number
  untaggedBookmarks: number
  avgUsesPerTag: number
}

export function tagStats(bookmarks: { tags: string[] }[]): TagStats {
  const counts = countTags(bookmarks)
  const totalTags = counts.length
  const taggedBookmarks = bookmarks.filter((b) => b.tags.length > 0).length
  const totalUses = counts.reduce((sum, c) => sum + c.count, 0)

  return {
    totalTags,
    taggedBookmarks,
    untaggedBookmarks: bookmarks.length - taggedBookmarks,
    avgUsesPerTag: totalTags === 0 ? 0 : totalUses / totalTags,
  }
}
