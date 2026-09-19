import { describe, expect, it } from 'vitest'
import { decodeTitle, encodeTitle, renameTag } from '../src/lib/title-codec'

function roundTrip(input: { title: string; tags: string[]; note?: string }) {
  expect(decodeTitle(encodeTitle(input))).toEqual(input)
}

describe('title-codec', () => {
  it('round-trips a title with tags and a note', () => {
    roundTrip({ title: 'Example', tags: ['work', 'urgent'], note: 'check this' })
  })

  it('round-trips a plain title with no tags and no note', () => {
    roundTrip({ title: 'Just a title', tags: [] })
  })

  it('round-trips tags only, no note', () => {
    roundTrip({ title: 'Example', tags: ['ref'] })
  })

  it('round-trips a note only, no tags', () => {
    roundTrip({ title: 'Example', tags: [], note: 'remember this' })
  })

  it('round-trips a tag containing a space', () => {
    roundTrip({ title: 'Example', tags: ['gmu pyxshore'], note: undefined })
  })

  it('preserves literal brackets and parens in the middle of a title', () => {
    roundTrip({ title: 'Understand [WIP] this (draft) release', tags: ['ref'] })
  })

  it('preserves a literal double-paren phrase that is not a note marker', () => {
    roundTrip({ title: 'Some ((important)) thing', tags: ['ref'] })
  })

  it('decodes an unbalanced leading bracket as literal title text, not a crash', () => {
    const decoded = decodeTitle('[tag Title with no closing bracket')
    expect(decoded).toEqual({ title: '[tag Title with no closing bracket', tags: [] })
  })

  it('keeps a leading # a user typed into a tag, verbatim', () => {
    const decoded = decodeTitle('[#azure-pipelines-templates] Pipelines - Recent')
    expect(decoded).toEqual({ title: 'Pipelines - Recent', tags: ['#azure-pipelines-templates'] })
  })

  it('decodes a trailing bracket tag (title first, tag last)', () => {
    const decoded = decodeTitle('Pipelines - Recent [#azure-pipelines-templates]')
    expect(decoded).toEqual({ title: 'Pipelines - Recent', tags: ['#azure-pipelines-templates'] })
  })

  it('decodes multiple trailing bracket tags in reading order', () => {
    const decoded = decodeTitle('Pipelines - Recent [azure-pipelines-templates][someday]')
    expect(decoded).toEqual({ title: 'Pipelines - Recent', tags: ['azure-pipelines-templates', 'someday'] })
  })

  it('decodes a trailing tag before a trailing note', () => {
    const decoded = decodeTitle('Pipelines - Recent [someday] ((note: check this))')
    expect(decoded).toEqual({ title: 'Pipelines - Recent', tags: ['someday'], note: 'check this' })
  })

  it('decodes an unbalanced trailing note marker as literal title text', () => {
    const decoded = decodeTitle('Example ((note: unfinished')
    expect(decoded).toEqual({ title: 'Example ((note: unfinished', tags: [] })
  })

  it('encodes tags in order, each bracket-wrapped, ahead of the title', () => {
    expect(encodeTitle({ title: 'Example', tags: ['a', 'b'] })).toBe('[a][b] Example')
  })

  it('encodes a note as a trailing ((note: ...)) suffix', () => {
    expect(encodeTitle({ title: 'Example', tags: [], note: 'hi' })).toBe('Example ((note: hi))')
  })

  it('decodes multiple leading tags plus a trailing note together', () => {
    const decoded = decodeTitle('[a][b] Example ((note: hi))')
    expect(decoded).toEqual({ title: 'Example', tags: ['a', 'b'], note: 'hi' })
  })
})

describe('renameTag', () => {
  it('renames a matching tag, leaving title and note untouched', () => {
    expect(renameTag({ title: 'Example', tags: ['a', 'b'], note: 'hi' }, 'a', 'z')).toEqual({
      title: 'Example',
      tags: ['z', 'b'],
      note: 'hi',
    })
  })

  it('is a no-op when the bookmark does not have the tag', () => {
    const decoded = { title: 'Example', tags: ['b'] }
    expect(renameTag(decoded, 'a', 'z')).toEqual(decoded)
  })

  it('dedupes if the new name collides with an existing tag', () => {
    expect(renameTag({ title: 'Example', tags: ['a', 'b'] }, 'a', 'b')).toEqual({
      title: 'Example',
      tags: ['b'],
    })
  })
})
