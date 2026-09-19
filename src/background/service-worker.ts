import { updateBadgeForTab } from '../lib/badge'
import { OPEN_SEARCH_COMMAND, SESSION_KEY_OPEN_ON_SEARCH } from '../shared/constants'

export async function handleCommand(command: string): Promise<void> {
  if (command !== OPEN_SEARCH_COMMAND) return
  // openPopup() only counts as a user gesture when called with no prior `await` in this
  // task -- start the storage write but don't await it yet, so the gesture stays fresh.
  const flagWritten = chrome.storage.session.set({ [SESSION_KEY_OPEN_ON_SEARCH]: true })
  await chrome.action.openPopup()
  await flagWritten
}

chrome.commands.onCommand.addListener(handleCommand)

async function refreshActiveTabBadge(): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (activeTab?.id !== undefined && activeTab.url) await updateBadgeForTab(activeTab.id, activeTab.url)
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId)
  if (tab.url) await updateBadgeForTab(tabId, tab.url)
})

// A bookmark opened into a new tab already carries its target url at creation time (before
// onUpdated fires), so onCreated sets the badge immediately instead of waiting on navigation.
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id !== undefined && tab.url) updateBadgeForTab(tab.id, tab.url)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) updateBadgeForTab(tabId, changeInfo.url)
  else if (changeInfo.status === 'complete' && tab.url) updateBadgeForTab(tabId, tab.url)
})

chrome.bookmarks.onCreated.addListener(refreshActiveTabBadge)
chrome.bookmarks.onRemoved.addListener(refreshActiveTabBadge)
chrome.bookmarks.onChanged.addListener(refreshActiveTabBadge)
