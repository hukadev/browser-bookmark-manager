import { useEffect, useState } from 'react'
import { Chip } from '../components/Chip'
import { SearchIcon } from '../components/Icon'
import { flattenBookmarks, getTree } from '../lib/bookmarks'
import { search, type SearchItem } from '../lib/search'
import { inputClass, kbdClass } from '../lib/ui-classes'
import { decodeTitle } from '../lib/title-codec'

export function SearchTab() {
  const [items, setItems] = useState<SearchItem[]>([])
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    getTree().then((tree) => {
      setItems(
        flattenBookmarks(tree).map((node) => {
          const decoded = decodeTitle(node.title)
          return {
            id: node.id,
            url: node.url ?? '',
            title: decoded.title,
            tags: decoded.tags,
            dateAdded: node.dateAdded ?? 0,
          }
        }),
      )
    })
  }, [])

  const results = search(items, query)

  useEffect(() => {
    setSelectedIndex(-1)
  }, [query])

  function openResult(item: SearchItem) {
    chrome.tabs.create({ url: item.url })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      const selected = results[selectedIndex]
      if (selected) openResult(selected)
    }
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <label className={`${inputClass} rounded-full flex items-center gap-2`}>
        <SearchIcon className="w-4 h-4 fill-current opacity-50 shrink-0" />
        <input
          autoFocus
          className="grow"
          placeholder="Search by title, URL, or #tags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <p className="text-xs opacity-60 px-1">
        {results.length} bookmark{results.length === 1 ? '' : 's'}
      </p>
      <ul className="flex flex-col flex-1 min-h-0 overflow-y-auto border border-base-300 rounded-lg divide-y divide-base-300">
        {results.map((result, index) => (
          <li
            key={result.id}
            className={`flex flex-col gap-0.5 px-3 py-2 cursor-pointer ${
              index === selectedIndex ? 'bg-primary/10' : 'hover:bg-base-200'
            }`}
            aria-selected={index === selectedIndex}
            onClick={() => openResult(result)}
          >
            <span className="font-medium truncate">{result.title}</span>
            <span className="text-xs opacity-60 truncate">{result.url}</span>
            {result.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {result.tags.map((tag) => (
                  <Chip key={tag} tag={tag} size="xs" />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs opacity-60 border-t border-base-200 pt-2">
          <span className="flex items-center gap-1">
            <kbd className={kbdClass}>↑</kbd>
            <kbd className={kbdClass}>↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className={kbdClass}>Enter</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className={kbdClass}>⌘/Ctrl+Shift+P</kbd> Open search
          </span>
        </div>
        <p className="text-xs opacity-50 text-center">
          Tip: tags and notes sync automatically via Chrome's built-in bookmark sync.
        </p>
      </div>
    </div>
  )
}
