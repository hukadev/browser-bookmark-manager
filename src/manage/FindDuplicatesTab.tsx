import { useEffect, useMemo, useState } from 'react'
import { RadioGroup } from 'radix-ui'
import { Button } from '../components/Button'
import { flattenBookmarks, getTree, removeBookmark } from '../lib/bookmarks'
import { groupDuplicates, normalizeUrl, resolveCleanup, type DuplicateItem } from '../lib/duplicates'
import { decodeTitle } from '../lib/title-codec'
import { ConfirmDialog } from './ConfirmDialog'

interface Row extends DuplicateItem {
  title: string
}

export function FindDuplicatesTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [selections, setSelections] = useState<Record<string, string>>({})

  function reload() {
    getTree().then((tree) => {
      setRows(
        flattenBookmarks(tree).map((node) => ({
          id: node.id,
          url: node.url ?? '',
          title: decodeTitle(node.title).title,
          dateAdded: node.dateAdded ?? 0,
        })),
      )
    })
  }

  useEffect(reload, [])

  const groups = useMemo(() => groupDuplicates(rows), [rows])
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])

  function selectKeep(groupKey: string, id: string) {
    setSelections((prev) => ({ ...prev, [groupKey]: id }))
  }

  async function deleteOthers(group: DuplicateItem[]) {
    const key = normalizeUrl(group[0].url)
    const [{ deleteIds }] = resolveCleanup([group], selections)
    await Promise.all(deleteIds.map((id) => removeBookmark(id)))
    setSelections((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    reload()
  }

  async function cleanAll() {
    const results = resolveCleanup(groups, selections)
    await Promise.all(results.flatMap((r) => r.deleteIds.map((id) => removeBookmark(id))))
    setSelections({})
    reload()
  }

  const duplicateCount = groups.reduce((sum, group) => sum + group.length - 1, 0)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm opacity-70">
        {groups.length} duplicate groups ({duplicateCount} duplicates to clean)
      </p>
      {groups.length === 0 ? (
        <p className="text-success">No Duplicates Found — Your bookmarks are clean and organized!</p>
      ) : (
        <>
          <ConfirmDialog
            trigger={
              <Button variant="error" className="self-start">
                Clean All Duplicates
              </Button>
            }
            title="Clean all duplicate groups?"
            description={`This keeps one bookmark per group (your selection, or the oldest) and permanently deletes the other ${duplicateCount}.`}
            confirmLabel="Clean All"
            onConfirm={cleanAll}
          />
          {groups.map((group) => {
            const key = normalizeUrl(group[0].url)
            const selected = selections[key] ?? [...group].sort((a, b) => a.dateAdded - b.dateAdded)[0].id
            return (
              <fieldset key={key} className="border border-base-300 rounded-lg p-3 flex flex-col gap-2">
                <RadioGroup.Root value={selected} onValueChange={(value) => selectKeep(key, value)} className="flex flex-col gap-1">
                  {group.map((item) => {
                    const row = rowById.get(item.id)
                    return (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroup.Item
                          value={item.id}
                          className="w-4 h-4 rounded-full border border-base-300 flex items-center justify-center data-[state=checked]:border-primary shrink-0"
                        >
                          <RadioGroup.Indicator className="w-2 h-2 rounded-full bg-primary" />
                        </RadioGroup.Item>
                        <span>
                          {row?.title} — <span className="opacity-60">{row?.url}</span>
                        </span>
                      </label>
                    )
                  })}
                </RadioGroup.Root>
                <ConfirmDialog
                  trigger={
                    <Button variant="error" size="sm" className="self-start">
                      Delete Others
                    </Button>
                  }
                  title="Delete the other copies?"
                  description="This keeps the selected bookmark and permanently deletes the rest of this group."
                  confirmLabel="Delete"
                  onConfirm={() => deleteOthers(group)}
                />
              </fieldset>
            )
          })}
        </>
      )}
    </div>
  )
}
