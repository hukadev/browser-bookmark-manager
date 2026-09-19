import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('updateBadgeForTab', () => {
  it('sets a checkmark badge when the tab url matches a bookmark', async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined)
    const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined)
    const getTree = vi.fn().mockResolvedValue([{ id: '1', title: 'x', url: 'https://example.com' }])
    vi.stubGlobal('chrome', { bookmarks: { getTree }, action: { setBadgeText, setBadgeBackgroundColor } })

    const { updateBadgeForTab } = await import('../src/lib/badge')
    await updateBadgeForTab(7, 'https://example.com')

    expect(setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '✓' })
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 7, color: '#1e8e3e' })
  })

  it('clears the badge when the tab url matches no bookmark', async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined)
    const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined)
    const getTree = vi.fn().mockResolvedValue([])
    vi.stubGlobal('chrome', { bookmarks: { getTree }, action: { setBadgeText, setBadgeBackgroundColor } })

    const { updateBadgeForTab } = await import('../src/lib/badge')
    await updateBadgeForTab(7, 'https://example.com')

    expect(setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '' })
    expect(setBadgeBackgroundColor).not.toHaveBeenCalled()
  })

  it('clears the badge without touching bookmarks for chrome:// urls', async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined)
    const getTree = vi.fn().mockResolvedValue([])
    vi.stubGlobal('chrome', { bookmarks: { getTree }, action: { setBadgeText, setBadgeBackgroundColor: vi.fn() } })

    const { updateBadgeForTab } = await import('../src/lib/badge')
    await updateBadgeForTab(7, 'chrome://extensions')

    expect(setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '' })
    expect(getTree).not.toHaveBeenCalled()
  })
})
