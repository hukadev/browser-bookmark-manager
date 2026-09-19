export interface DuplicateItem {
  id: string
  url: string
  dateAdded: number
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
])

export function normalizeUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  const host = parsed.hostname.replace(/^www\./, '') + (parsed.port ? `:${parsed.port}` : '')
  const pathname = parsed.pathname.replace(/\/$/, '')

  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key)) parsed.searchParams.delete(key)
  }
  const search = parsed.searchParams.toString()

  return `${host}${pathname}${search ? `?${search}` : ''}${parsed.hash}`
}

export function groupDuplicates(items: DuplicateItem[]): DuplicateItem[][] {
  const byNormalized = new Map<string, DuplicateItem[]>()
  for (const item of items) {
    const key = normalizeUrl(item.url)
    const group = byNormalized.get(key) ?? []
    group.push(item)
    byNormalized.set(key, group)
  }
  return [...byNormalized.values()].filter((group) => group.length > 1)
}

export interface CleanupResult {
  keep: string
  deleteIds: string[]
}

/** For each group: honor `selections[normalizedUrl]` if given and valid, else keep the oldest. */
export function resolveCleanup(
  groups: DuplicateItem[][],
  selections: Record<string, string> = {},
): CleanupResult[] {
  return groups.map((group) => {
    const key = normalizeUrl(group[0].url)
    const selected = selections[key]
    const keep =
      selected && group.some((item) => item.id === selected)
        ? selected
        : [...group].sort((a, b) => a.dateAdded - b.dateAdded)[0].id

    return { keep, deleteIds: group.filter((item) => item.id !== keep).map((item) => item.id) }
  })
}
