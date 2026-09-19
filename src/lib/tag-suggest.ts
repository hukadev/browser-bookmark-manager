export interface SuggestionSource {
  url: string
  tags: string[]
  title: string
}

export interface TagSuggestion {
  tag: string
  percentage: number
}

const DOMAIN_WEIGHT = 0.3
const TITLE_WEIGHT = 0.2
const URL_MATCH_WEIGHT = 0.5
const TOP_N = 3

function hostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function keywordsOf(title: string): string[] {
  return title.toLowerCase().match(/[a-z0-9]+/g) ?? []
}

/** Largest-remainder rounding: shares always sum to exactly 100. */
function distributePercentages(scores: number[]): number[] {
  const total = scores.reduce((a, b) => a + b, 0)
  if (total === 0) return scores.map(() => 0)

  const raw = scores.map((score) => (score / total) * 100)
  const floors = raw.map(Math.floor)
  const remainder = 100 - floors.reduce((a, b) => a + b, 0)

  const byRemainingFrac = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)

  const result = [...floors]
  for (let i = 0; i < remainder; i++) result[byRemainingFrac[i].index] += 1
  return result
}

export function suggestTags(
  existing: SuggestionSource[],
  newUrl: string,
  newTitle: string,
  excludeTags: string[] = [],
): TagSuggestion[] {
  const domain = hostname(newUrl)
  const sameDomain = existing.filter((b) => hostname(b.url) === domain)
  const newKeywords = keywordsOf(newTitle)
  // dev.azure.com, github.com, etc. host many unrelated repos under one hostname, so a
  // literal repo/project-name match in the URL path is a much stronger signal than domain alone.
  const newUrlLower = (() => {
    try {
      return decodeURIComponent(newUrl).toLowerCase()
    } catch {
      return newUrl.toLowerCase()
    }
  })()

  const candidateTags = [...new Set(existing.flatMap((b) => b.tags))].filter(
    (tag) => !excludeTags.includes(tag),
  )

  const scored = candidateTags.map((tag) => {
    const domainRatio =
      sameDomain.length === 0
        ? 0
        : sameDomain.filter((b) => b.tags.includes(tag)).length / sameDomain.length

    const taggedTitles = existing
      .filter((b) => b.tags.includes(tag))
      .map((b) => b.title.toLowerCase())
      .join(' ')
    const titleRatio =
      newKeywords.length === 0
        ? 0
        : newKeywords.filter((k) => taggedTitles.includes(k)).length / newKeywords.length

    // Guard against short tags spuriously matching generic URL substrings (e.g. "c" inside ".com").
    const urlRatio = tag.length >= 4 && newUrlLower.includes(tag.toLowerCase()) ? 1 : 0

    const score = DOMAIN_WEIGHT * domainRatio + TITLE_WEIGHT * titleRatio + URL_MATCH_WEIGHT * urlRatio
    return { tag, score }
  })

  const top = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)

  const percentages = distributePercentages(top.map(({ score }) => score))
  return top.map(({ tag }, i) => ({ tag, percentage: percentages[i] }))
}
