import { useEffect, useState } from 'react'
import { Tabs } from 'radix-ui'
import { countTags } from '../lib/aggregate'
import { flattenBookmarks, getTree } from '../lib/bookmarks'
import { groupDuplicates } from '../lib/duplicates'
import { decodeTitle } from '../lib/title-codec'
import { AllBookmarksTab } from './AllBookmarksTab'
import { AutomationTab } from './AutomationTab'
import { FindDuplicatesTab } from './FindDuplicatesTab'
import { FoldersTab } from './FoldersTab'
import { HowToTab } from './HowToTab'
import { SettingsTab } from './SettingsTab'
import { TagsTab } from './TagsTab'

const TABS = [
  { id: 'all', label: 'All Bookmarks', Component: AllBookmarksTab },
  { id: 'duplicates', label: 'Find Duplicates', Component: FindDuplicatesTab },
  { id: 'folders', label: 'Folders', Component: FoldersTab },
  { id: 'tags', label: 'Tags', Component: TagsTab },
  { id: 'automation', label: 'Automation', Component: AutomationTab },
  { id: 'settings', label: 'Settings', Component: SettingsTab },
  { id: 'howto', label: 'How To', Component: HowToTab },
] as const

type TabId = (typeof TABS)[number]['id']

const CENTERED_TAB_IDS: TabId[] = ['duplicates', 'tags', 'automation', 'settings', 'howto']

export function Manage() {
  const [tab, setTab] = useState<TabId>('all')
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [tagCount, setTagCount] = useState(0)

  useEffect(() => {
    getTree().then((tree) => {
      const nodes = flattenBookmarks(tree).map((node) => ({
        url: node.url ?? '',
        dateAdded: node.dateAdded ?? 0,
        tags: decodeTitle(node.title).tags,
      }))
      setDuplicateCount(groupDuplicates(nodes.map((n, i) => ({ id: String(i), ...n }))).length)
      setTagCount(countTags(nodes).length)
    })
  }, [])

  const badgeFor = (id: TabId): number | null => {
    if (id === 'duplicates') return duplicateCount
    if (id === 'tags') return tagCount
    return null
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content p-6">
      <Tabs.Root value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <Tabs.List className="flex items-center justify-center gap-1 border-b border-base-300 pb-3 mb-4">
          {TABS.map((t) => {
            const badge = badgeFor(t.id)
            const active = tab === t.id
            return (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-primary text-primary-content' : 'text-base-content/70 hover:bg-base-200'
                }`}
              >
                {t.label}
                {badge !== null && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${active ? 'border border-primary-content/50 text-primary-content' : 'bg-base-300 text-base-content/70'}`}
                  >
                    {badge}
                  </span>
                )}
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>
        {TABS.map((t) => (
          <Tabs.Content key={t.id} value={t.id} className={CENTERED_TAB_IDS.includes(t.id) ? 'max-w-3xl mx-auto' : undefined}>
            <t.Component />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  )
}
