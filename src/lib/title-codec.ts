import type { DecodedTitle } from '../shared/types'

const LEADING_TAG = /^\[([^[\]]+)\]/
// Bookmarks tagged by hand (or by the extension this app is compatible
// with) often trail the tag instead: "Title [tag]" rather than "[tag] Title".
const TRAILING_TAG = /\[([^[\]]+)\]$/
// Anchored to the very end so a coincidental "((...))" earlier in the
// title is never mistaken for the note marker.
const TRAILING_NOTE = /\(\(note:\s?([\s\S]*)\)\)$/

export function encodeTitle({ title, tags, note }: DecodedTitle): string {
  const tagSuffix = tags.map((tag) => `[${tag}]`).join('')
  let raw = tagSuffix ? `${title} ${tagSuffix}` : title
  if (note !== undefined) raw += ` ((note: ${note}))`
  return raw
}

export function renameTag(decoded: DecodedTitle, oldTag: string, newTag: string): DecodedTitle {
  if (!decoded.tags.includes(oldTag)) return decoded
  const tags = [...new Set(decoded.tags.map((tag) => (tag === oldTag ? newTag : tag)))]
  return { ...decoded, tags }
}

export function decodeTitle(raw: string): DecodedTitle {
  let rest = raw
  const tags: string[] = []

  let match = LEADING_TAG.exec(rest)
  while (match) {
    tags.push(match[1])
    rest = rest.slice(match[0].length)
    match = LEADING_TAG.exec(rest)
  }
  if (tags.length > 0) rest = rest.replace(/^ /, '')

  const noteMatch = TRAILING_NOTE.exec(rest)
  let note: string | undefined
  if (noteMatch) {
    note = noteMatch[1]
    rest = rest.slice(0, noteMatch.index).replace(/ $/, '')
  }

  const trailingTags: string[] = []
  let trailingMatch = TRAILING_TAG.exec(rest)
  while (trailingMatch) {
    trailingTags.push(trailingMatch[1])
    rest = rest.slice(0, trailingMatch.index).replace(/ $/, '')
    trailingMatch = TRAILING_TAG.exec(rest)
  }
  tags.push(...trailingTags.reverse())

  return note !== undefined ? { title: rest, tags, note } : { title: rest, tags }
}
