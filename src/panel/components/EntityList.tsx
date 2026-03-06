import { type FC, useState, useMemo, useCallback } from 'react'

const ROOT_KEYS = ['ROOT_QUERY', 'ROOT_MUTATION'] as const

interface CacheEntry {
  id: string
  typename: string
  data: Record<string, unknown>
}

interface EntityListProps {
  cacheData: Record<string, unknown> | null
  selectedEntityKey: string | null
  onSelectEntity: (entityKey: string) => void
  onRefresh: () => Promise<void>
  loading: boolean
  draftEntityKeys?: Set<string>
  autoRefresh: boolean
  onAutoRefreshChange: (value: boolean) => void
}

export const EntityList: FC<EntityListProps> = ({
  cacheData,
  selectedEntityKey,
  onSelectEntity,
  onRefresh,
  loading,
  draftEntityKeys,
  autoRefresh,
  onAutoRefreshChange,
}) => {
  const [search, setSearch] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const rootEntries = useMemo<CacheEntry[]>(() => {
    if (!cacheData) return []
    return ROOT_KEYS
      .filter((key) => key in cacheData)
      .map((key) => ({
        id: key,
        typename: key,
        data: cacheData[key] as Record<string, unknown>,
      }))
  }, [cacheData])

  const entries = useMemo<CacheEntry[]>(() => {
    if (!cacheData) return []
    return Object.entries(cacheData)
      .filter(([key]) => !ROOT_KEYS.includes(key as (typeof ROOT_KEYS)[number]) && key !== '__META')
      .map(([id, data]) => ({
        id,
        typename:
          (data as Record<string, unknown>)?.__typename as string ?? id.split(':')[0] ?? 'Unknown',
        data: data as Record<string, unknown>,
      }))
      .sort((a, b) => a.typename.localeCompare(b.typename) || a.id.localeCompare(b.id))
  }, [cacheData])

  const grouped = useMemo(() => {
    const groups = new Map<string, CacheEntry[]>()
    for (const entry of entries) {
      const key = entry.typename
      const existing = groups.get(key) ?? []
      existing.push(entry)
      groups.set(key, existing)
    }
    return groups
  }, [entries])

  const filteredRootEntries = useMemo(() => {
    if (!search.trim()) return rootEntries
    const query = search.toLowerCase()
    return rootEntries.filter(
      (e) =>
        e.id.toLowerCase().includes(query) ||
        JSON.stringify(e.data).toLowerCase().includes(query),
    )
  }, [rootEntries, search])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return grouped
    const query = search.toLowerCase()
    const filtered = new Map<string, CacheEntry[]>()
    for (const [typename, groupEntries] of grouped) {
      const matching = groupEntries.filter(
        (e) =>
          e.id.toLowerCase().includes(query) ||
          e.typename.toLowerCase().includes(query) ||
          JSON.stringify(e.data).toLowerCase().includes(query),
      )
      if (matching.length > 0) {
        filtered.set(typename, matching)
      }
    }
    return filtered
  }, [grouped, search])

  const totalEntries = rootEntries.length + entries.length
  const hasNoResults = filteredRootEntries.length === 0 && filteredGroups.size === 0

  const handleSelectAndExpand = useCallback(
    (entityKey: string, typename: string) => {
      setExpandedGroup(typename)
      onSelectEntity(entityKey)
    },
    [onSelectEntity],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none flex items-center gap-2 p-2 border-b border-panel-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cache..."
          className="flex-1 px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
        />
      </div>

      <div className="flex-none flex items-center gap-2 px-2 py-1 border-b border-panel-border">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-2 py-0.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Refresh'}
        </button>
        <label className="flex items-center gap-1 text-sm text-panel-text-muted cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange(e.target.checked)}
            className="accent-panel-accent"
          />
          Auto
          {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-panel-success animate-pulse" />}
        </label>
        <span className="text-sm text-panel-text-muted">
          {totalEntries} entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {hasNoResults && (
          <div className="text-sm text-panel-text-muted text-center py-4">
            {!cacheData ? 'Click Refresh to load cache' : 'No entries found'}
          </div>
        )}

        {/* Root entries */}
        {filteredRootEntries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelectEntity(entry.id)}
            className={`w-full text-left px-2 py-1.5 text-sm rounded truncate transition-colors flex items-center gap-1.5 ${
              selectedEntityKey === entry.id
                ? 'bg-panel-accent/20 text-panel-accent'
                : 'text-panel-warning hover:bg-panel-surface'
            }`}
          >
            {draftEntityKeys?.has(entry.id) && (
              <span className="w-1.5 h-1.5 rounded-full bg-panel-warning flex-shrink-0" />
            )}
            <span className="truncate">{entry.id}</span>
          </button>
        ))}

        {/* Grouped entries */}
        {Array.from(filteredGroups.entries()).map(([typename, groupEntries]) => {
          const isGroupExpanded = expandedGroup === typename || search.trim().length > 0

          return (
            <div key={typename}>
              <button
                onClick={() => setExpandedGroup(isGroupExpanded && !search ? null : typename)}
                className="flex items-center gap-1 w-full px-2 py-1 text-sm font-medium text-panel-accent hover:text-panel-accent-hover transition-colors"
              >
                <span className="text-sm">{isGroupExpanded ? '\u25BC' : '\u25B6'}</span>
                <span>{typename}</span>
                <span className="text-panel-text-muted ml-1">({groupEntries.length})</span>
              </button>

              {isGroupExpanded && (
                <div className="ml-4 space-y-0.5">
                  {groupEntries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleSelectAndExpand(entry.id, typename)}
                      className={`w-full text-left px-2 py-1 text-sm rounded truncate transition-colors flex items-center gap-1.5 ${
                        selectedEntityKey === entry.id
                          ? 'bg-panel-accent/20 text-panel-accent'
                          : 'text-panel-text hover:bg-panel-surface'
                      }`}
                    >
                      {draftEntityKeys?.has(entry.id) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-panel-warning flex-shrink-0" />
                      )}
                      <span className="truncate">{entry.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
