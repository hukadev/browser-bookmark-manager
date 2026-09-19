import { findByUrl } from './bookmarks'

const BADGE_TEXT = '✓'
const BADGE_COLOR = '#1e8e3e'

/** Sets the toolbar badge for `tabId` to a checkmark if `url` matches a bookmark, or clears it otherwise. */
export async function updateBadgeForTab(tabId: number, url: string): Promise<void> {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    await chrome.action.setBadgeText({ tabId, text: '' })
    return
  }

  const tree = await chrome.bookmarks.getTree()
  const bookmarked = findByUrl(tree, url) !== undefined

  await chrome.action.setBadgeText({ tabId, text: bookmarked ? BADGE_TEXT : '' })
  if (bookmarked) await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR })
}
