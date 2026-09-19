import { Button } from '../components/Button'
import type { FolderNode } from '../lib/bookmarks'

interface FolderTreeProps {
  nodes: FolderNode[]
  countById: Map<string, number>
  expandedIds: Set<string>
  selectedId: string | null
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
}

export function FolderTree({
  nodes,
  countById,
  expandedIds,
  selectedId,
  onToggleExpand,
  onSelect,
}: FolderTreeProps) {
  return (
    <ul className="flex flex-col gap-0.5 pl-2">
      {nodes.map((node) => {
        const expanded = expandedIds.has(node.id)
        return (
          <li key={node.id}>
            <div className="flex items-center gap-1">
              {node.children.length > 0 ? (
                <Button
                  variant="ghost"
                  size="xs"
                  square
                  onClick={() => onToggleExpand(node.id)}
                  aria-label="Toggle"
                >
                  {expanded ? '▾' : '▸'}
                </Button>
              ) : (
                <span className="w-6" />
              )}
              <Button
                variant={selectedId === node.id ? 'primary' : 'ghost'}
                size="sm"
                className="justify-start flex-1"
                aria-current={selectedId === node.id}
                onClick={() => onSelect(node.id)}
              >
                {node.title} ({countById.get(node.id) ?? 0})
              </Button>
            </div>
            {expanded && node.children.length > 0 && (
              <FolderTree
                nodes={node.children}
                countById={countById}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
