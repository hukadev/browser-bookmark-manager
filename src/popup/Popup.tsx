import { useEffect, useState } from 'react'
import { Tabs } from 'radix-ui'
import { Button } from '../components/Button'
import { TabCloseIcon } from '../components/Icon'
import { findByUrl, getTree } from '../lib/bookmarks'
import { tabTriggerClass, tabsListClass } from '../lib/ui-classes'
import { SESSION_KEY_OPEN_ON_SEARCH } from '../shared/constants'
import { AddBookmarkTab } from './AddBookmarkTab'
import { SearchTab } from './SearchTab'

type Tab = 'add' | 'search'

export function Popup() {
  const [tab, setTab] = useState<Tab>('add')

  useEffect(() => {
    chrome.storage.session.get(SESSION_KEY_OPEN_ON_SEARCH).then((result) => {
      if (result[SESSION_KEY_OPEN_ON_SEARCH]) {
        setTab('search')
        chrome.storage.session.remove(SESSION_KEY_OPEN_ON_SEARCH)
      }
    })
  }, [])

  function handleValueChange(value: string) {
    if (value === 'manage') {
      chrome.tabs.create({ url: 'manage.html' })
      return
    }
    setTab(value as Tab)
  }

  async function handleCloseBookmarkedTabs() {
    const [openTabs, tree] = await Promise.all([chrome.tabs.query({ currentWindow: true }), getTree()])
    const ids = openTabs
      .filter((t): t is chrome.tabs.Tab & { id: number; url: string } => t.id !== undefined && !!t.url)
      .filter((t) => findByUrl(tree, t.url))
      .map((t) => t.id)
    if (ids.length > 0) chrome.tabs.remove(ids)
  }

  return (
    <Tabs.Root
      value={tab}
      onValueChange={handleValueChange}
      activationMode="manual"
      className="bg-base-100 text-base-content flex flex-col h-full"
    >
      <div className="flex items-center">
        <Tabs.List className={`${tabsListClass} flex-1`}>
          <Tabs.Trigger value="add" className={tabTriggerClass}>
            Add Bookmark
          </Tabs.Trigger>
          <Tabs.Trigger value="search" className={tabTriggerClass}>
            Search
          </Tabs.Trigger>
          <Tabs.Trigger value="manage" className={tabTriggerClass}>
            Manage
          </Tabs.Trigger>
        </Tabs.List>
        <Button
          variant="ghost"
          size="xs"
          square
          className="mr-2"
          title="Close bookmarked tabs"
          aria-label="Close bookmarked tabs"
          onClick={handleCloseBookmarkedTabs}
        >
          <TabCloseIcon className="w-4 h-4 fill-current" />
        </Button>
      </div>
      <Tabs.Content value="add" className="p-3">
        <AddBookmarkTab />
      </Tabs.Content>
      <Tabs.Content value="search" className="p-3 flex-1 min-h-0 flex flex-col">
        <SearchTab />
      </Tabs.Content>
    </Tabs.Root>
  )
}
