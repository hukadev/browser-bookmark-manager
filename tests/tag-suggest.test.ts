import { describe, expect, it } from 'vitest'
import { suggestTags, type SuggestionSource } from '../src/lib/tag-suggest'

describe('tag-suggest', () => {
  it('ranks a tag by 0.6*domain-frequency + 0.4*title-keyword-overlap', () => {
    const existing: SuggestionSource[] = [
      { url: 'https://github.com/panorama/pr1', tags: ['panorama'], title: 'Panorama service refactor' },
      { url: 'https://github.com/panorama/pr2', tags: ['panorama'], title: 'Panorama bugfix' },
      { url: 'https://github.com/panorama/pr3', tags: [], title: 'Unrelated readme update' },
      { url: 'https://gitlab.com/other/pr1', tags: ['other'], title: 'Other project notes' },
    ]

    const suggestions = suggestTags(existing, 'https://github.com/panorama/pr4', 'Panorama deployment guide')

    // Only one tag scores above zero, so its share of the shown suggestions is 100%.
    expect(suggestions).toEqual([{ tag: 'panorama', percentage: 100 }])
  })

  it('returns no suggestions when there are no existing bookmarks', () => {
    expect(suggestTags([], 'https://example.com', 'New title')).toEqual([])
  })

  it('excludes tags with zero signal on both dimensions', () => {
    const existing: SuggestionSource[] = [
      { url: 'https://example.com/a', tags: ['unrelated'], title: 'Nothing in common' },
    ]
    expect(suggestTags(existing, 'https://another.com/x', 'Completely different')).toEqual([])
  })

  it('caps results at the top 3 by score, descending', () => {
    const existing: SuggestionSource[] = [
      { url: 'https://d.com/1', tags: ['a'], title: 'alpha keyword' },
      { url: 'https://d.com/2', tags: ['a'], title: 'alpha keyword' },
      { url: 'https://d.com/3', tags: ['b'], title: 'alpha keyword' },
      { url: 'https://d.com/4', tags: ['c'], title: 'alpha' },
      { url: 'https://d.com/5', tags: ['e'], title: 'beta gamma' },
    ]

    const suggestions = suggestTags(existing, 'https://d.com/6', 'alpha keyword')

    expect(suggestions).toHaveLength(3)
    expect(suggestions.map((s) => s.tag)).toEqual(['a', 'b', 'c'])
    expect(suggestions[0].percentage).toBeGreaterThanOrEqual(suggestions[1].percentage)
    expect(suggestions[1].percentage).toBeGreaterThanOrEqual(suggestions[2].percentage)
  })

  it('normalizes shown percentages so they always sum to 100', () => {
    const existing: SuggestionSource[] = [
      { url: 'https://d.com/1', tags: ['a'], title: 'alpha keyword' },
      { url: 'https://d.com/2', tags: ['a'], title: 'alpha keyword' },
      { url: 'https://d.com/3', tags: ['b'], title: 'alpha keyword' },
      { url: 'https://d.com/4', tags: ['c'], title: 'alpha' },
    ]

    const suggestions = suggestTags(existing, 'https://d.com/6', 'alpha keyword')

    expect(suggestions.reduce((sum, s) => sum + s.percentage, 0)).toBe(100)
  })

  it('excludes already-added tags before normalizing, so the shown set still sums to 100', () => {
    const existing: SuggestionSource[] = [
      { url: 'https://d.com/1', tags: ['a'], title: 'alpha keyword' },
      { url: 'https://d.com/2', tags: ['a'], title: 'alpha keyword' },
      { url: 'https://d.com/3', tags: ['b'], title: 'alpha keyword' },
      { url: 'https://d.com/4', tags: ['c'], title: 'alpha' },
    ]

    const suggestions = suggestTags(existing, 'https://d.com/6', 'alpha keyword', ['a'])

    expect(suggestions.map((s) => s.tag)).toEqual(['b', 'c'])
    expect(suggestions.reduce((sum, s) => sum + s.percentage, 0)).toBe(100)
  })

  it('ranks a tag highest when its name appears literally in the URL path, even under a shared hostname', () => {
    // dev.azure.com hosts many unrelated repos; hostname-only domain matching can't tell them apart.
    const existing: SuggestionSource[] = [
      {
        url: 'https://dev.azure.com/Org/Proj/_git/accordcontractuel-backend/pullrequest/1',
        tags: ['accordcontractuel-backend'],
        title: 'Pull request 1: docs update',
      },
      {
        url: 'https://dev.azure.com/Org/Proj/_git/panorama/pullrequest/2',
        tags: ['panorama'],
        title: 'Pull request 2: migrate pipeline',
      },
    ]

    const newUrl =
      'https://dev.azure.com/OpenWebTechnologyFoundry/GMU%20-%20Pyxshore/_git/accordcontractuel-backend/pullrequest/51137?path=%2Fowt-internal%2Fpipelines%2Fazure-pipeline.yml'

    const suggestions = suggestTags(existing, newUrl, 'Pull request 51137: pipeline update')

    expect(suggestions[0].tag).toBe('accordcontractuel-backend')
  })

  it('scores 100% when a tag has full domain frequency and full title overlap', () => {
    const existing: SuggestionSource[] = [
      { url: 'https://d.com/1', tags: ['solo'], title: 'exact match' },
    ]
    expect(suggestTags(existing, 'https://d.com/2', 'exact match')).toEqual([
      { tag: 'solo', percentage: 100 },
    ])
  })
})
