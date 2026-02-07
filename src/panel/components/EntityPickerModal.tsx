import { type FC, useState, useMemo, useEffect, useCallback } from 'react'

interface EntityPickerModalProps {
  entities: Array<{ cacheId: string; entity: Record<string, unknown>; label: string }>
  typeName: string
  onSelect: (cacheId: string) => void
  onClose: () => void
}

export const EntityPickerModal: FC<EntityPickerModalProps> = ({
  entities,
  typeName,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('')

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const filtered = useMemo(() => {
    if (!search.trim()) return entities
    const query = search.toLowerCase()
    return entities.filter((e) => {
      return e.cacheId.toLowerCase().includes(query) || JSON.stringify(e.entity).toLowerCase().includes(query)
    })
  }, [entities, search])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-panel-bg border border-panel-border rounded-lg shadow-2xl flex flex-col"
        style={{ width: '90%', maxWidth: 520, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <span className="text-sm font-medium text-panel-text">
            Select {typeName}
            <span className="text-panel-text-muted ml-1">
              ({filtered.length} available)
            </span>
          </span>
          <button
            onClick={onClose}
            className="text-panel-text-muted hover:text-panel-text transition-colors text-lg leading-none"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-panel-border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            autoFocus
            className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
          />
        </div>

        {/* Entity list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filtered.length === 0 && (
            <div className="text-sm text-panel-text-muted text-center py-4">
              No matching entities
            </div>
          )}
          {filtered.map((e) => (
            <button
              key={e.cacheId}
              onClick={() => onSelect(e.cacheId)}
              className="w-full text-left px-3 py-2 rounded border border-panel-border bg-panel-surface hover:border-panel-accent hover:bg-panel-accent/10 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium text-panel-accent mb-1">
                {e.cacheId}
              </div>
              <div className="space-y-px text-xs font-mono">
                {Object.entries(e.entity).map(([key, val]) => {
                  if (key === '__typename') return null
                  return (
                    <div key={key} className="flex gap-1">
                      <span className="text-panel-text-muted shrink-0">{key}:</span>
                      <span className="min-w-0">{renderValue(val)}</span>
                    </div>
                  )
                })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-panel-text-muted">null</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-panel-text-muted">[]</span>
    }
    if (depth > 2) {
      return <span className="text-panel-text-muted">[{value.length} items]</span>
    }
    return (
      <div className="ml-3 border-l border-panel-border/50 pl-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-1">
            <span className="text-panel-text-muted shrink-0">{i}:</span>
            <span className="min-w-0">{renderValue(item, depth + 1)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('__ref' in obj && typeof obj.__ref === 'string') {
      return <span className="text-panel-accent">{'\u2192'} {obj.__ref}</span>
    }
    if (depth > 2) {
      return <span className="text-panel-text-muted">{JSON.stringify(value)}</span>
    }
    const entries = Object.entries(obj).filter(([k]) => k !== '__typename')
    if (entries.length === 0) {
      return <span className="text-panel-text-muted">{'{}'}</span>
    }
    return (
      <div className="ml-3 border-l border-panel-border/50 pl-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-1">
            <span className="text-panel-text-muted shrink-0">{k}:</span>
            <span className="min-w-0">{renderValue(v, depth + 1)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'string') {
    return <span className="text-panel-success">"{value}"</span>
  }
  if (typeof value === 'number') {
    return <span className="text-panel-accent">{value}</span>
  }
  if (typeof value === 'boolean') {
    return <span className="text-panel-warning">{String(value)}</span>
  }
  return <span>{String(value)}</span>
}
