export interface SearchItem {
  id: string
  url: string
  title: string
  tags: string[]
  dateAdded: number
}

const TAG_TIER = 0
const TITLE_TIER = 1
const URL_TIER = 2

export function search<T extends SearchItem>(items: T[], rawQuery: string): T[] {
  const query = rawQuery.trim()
  if (!query) return [...items].sort((a, b) => b.dateAdded - a.dateAdded)

  const ranked: { item: T; tier: number }[] = []

  if (query.startsWith('#')) {
    const tag = query.slice(1).toLowerCase()
    for (const item of items) {
      if (item.tags.some((t) => t.toLowerCase() === tag)) ranked.push({ item, tier: TAG_TIER })
    }
  } else {
    const needle = query.toLowerCase()
    for (const item of items) {
      if (item.title.toLowerCase().includes(needle)) ranked.push({ item, tier: TITLE_TIER })
      else if (item.url.toLowerCase().includes(needle)) ranked.push({ item, tier: URL_TIER })
    }
  }

  return ranked
    .sort((a, b) => a.tier - b.tier || b.item.dateAdded - a.item.dateAdded)
    .map(({ item }) => item)
}
