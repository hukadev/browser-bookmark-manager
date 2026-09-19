import { describe, expect, it } from 'vitest'
import { tagColorClass, tagTextColorClass } from '../src/lib/tag-color'

describe('tagColorClass', () => {
  it('returns the same class for the same tag every time', () => {
    expect(tagColorClass('work')).toBe(tagColorClass('work'))
  })

  it('returns a badge-* class', () => {
    expect(tagColorClass('work')).toMatch(/^badge-/)
  })

  it('distributes different tags across more than one color', () => {
    const tags = ['work', 'urgent', 'someday', 'docs', 'pr', 'infra', 'oss']
    const colors = new Set(tags.map(tagColorClass))
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('tagTextColorClass', () => {
  it('returns a text-* class for the same underlying hue as tagColorClass, "-content" variant allowed', () => {
    const hue = tagColorClass('work').replace('badge-', '')
    const textVariant = tagTextColorClass('work').replace('text-', '')
    expect(textVariant === hue || textVariant === `${hue}-content`).toBe(true)
  })
})
