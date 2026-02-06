import { type FC, useState, useMemo, useCallback, useRef, useEffect } from 'react'

const ROOT_KEYS = ['ROOT_QUERY', 'ROOT_MUTATION'] as const

interface CacheViewerProps {
  cacheData: Record<string, unknown> | null
  loading: boolean
  onRefresh: () => void
  onEvict: (cacheId: string) => Promise<boolean>
  onWriteCacheData: (cacheId: string, data: Record<string, unknown>, typeName: string) => Promise<boolean>
  onResetCache: () => Promise<boolean>
}

interface CacheEntry {
  id: string
  typename: string
  data: Record<string, unknown>
}

export const CacheViewer: FC<CacheViewerProps> = ({
  cacheData,
  loading,
  onRefresh,
  onEvict,
  onWriteCacheData,
  onResetCache,
}) => {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editJson, setEditJson] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const cacheDataRef = useRef(cacheData)
  cacheDataRef.current = cacheData

  const scrollToRef = useRef<string | null>(null)

  useEffect(() => {
    if (!scrollToRef.current) return
    const target = scrollToRef.current
    scrollToRef.current = null
    requestAnimationFrame(() => {
      document.querySelector(`[data-cache-id="${CSS.escape(target)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [expandedId])

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

  const handleEvict = useCallback(
    async (cacheId: string) => {
      const success = await onEvict(cacheId)
      if (success) {
        onRefresh()
      }
    },
    [onEvict, onRefresh],
  )

  const handleCopy = useCallback((entry: CacheEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2))
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [])

  const handleStartEdit = useCallback((entry: CacheEntry) => {
    setEditingId(entry.id)
    setEditJson(JSON.stringify(entry.data, null, 2))
    setEditError(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditJson('')
    setEditError(null)
  }, [])

  const handleSaveEdit = useCallback(
    async (entryId: string) => {
      setEditError(null)
      setSaving(true)
      try {
        const parsed = JSON.parse(editJson) as Record<string, unknown>
        const typeName = (parsed.__typename as string) ?? entryId.split(':')[0] ?? 'Unknown'
        const success = await onWriteCacheData(entryId, parsed, typeName)
        if (success) {
          setEditingId(null)
          setEditJson('')
          onRefresh()
        } else {
          setEditError('Write failed')
        }
      } catch (e) {
        setEditError(e instanceof Error ? e.message : 'Invalid JSON')
      } finally {
        setSaving(false)
      }
    },
    [editJson, onWriteCacheData, onRefresh],
  )

  const handleResetCache = useCallback(async () => {
    if (!confirm('Reset entire Apollo cache? The app will refetch all active queries.')) return
    const success = await onResetCache()
    if (success) {
      onRefresh()
    }
  }, [onResetCache, onRefresh])

  const renderValue = useCallback(
    (value: unknown, depth = 0): React.ReactNode => {
      if (value === null) return <span className="text-panel-text-muted">null</span>
      if (value === undefined) return <span className="text-panel-text-muted">undefined</span>

      if (typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>

        if ('__ref' in obj && typeof obj.__ref === 'string') {
          return (
            <button
              onClick={() => {
                const refId = obj.__ref as string
                const refEntry = cacheDataRef.current?.[refId] as Record<string, unknown> | undefined
                const typename = (refEntry?.__typename as string)
                  ?? refId.split(':')[0]
                  ?? 'Unknown'

                scrollToRef.current = refId
                setExpandedGroup(typename)
                setExpandedId(refId)
                setSearch('')
              }}
              className="text-panel-accent hover:underline text-sm"
            >
              {'\u2192'} {obj.__ref as string}
            </button>
          )
        }

        if (depth > 2) {
          return <span className="text-panel-text-muted">{JSON.stringify(value)}</span>
        }

        return (
          <div className="ml-3 border-l border-panel-border/50 pl-2">
            {Object.entries(obj).map(([k, v]) => (
              <div key={k} className="flex gap-1 text-sm py-px">
                <span className="text-panel-text-muted shrink-0">{k}:</span>
                <span className="min-w-0">{renderValue(v, depth + 1)}</span>
              </div>
            ))}
          </div>
        )
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-panel-text-muted">[]</span>
        if (depth > 2) {
          return <span className="text-panel-text-muted">[{value.length} items]</span>
        }
        return (
          <div className="ml-3 border-l border-panel-border/50 pl-2">
            {value.map((item, i) => (
              <div key={i} className="flex gap-1 text-sm py-px">
                <span className="text-panel-text-muted shrink-0">{i}:</span>
                <span className="min-w-0">{renderValue(item, depth + 1)}</span>
              </div>
            ))}
          </div>
        )
      }

      if (typeof value === 'string')
        return <span className="text-panel-success">"{value}"</span>
      if (typeof value === 'number')
        return <span className="text-panel-accent">{value}</span>
      if (typeof value === 'boolean')
        return <span className="text-panel-warning">{String(value)}</span>

      return <span>{String(value)}</span>
    },
    [],
  )

  const renderEntryActions = useCallback(
    (entry: CacheEntry, readOnly: boolean) => (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleCopy(entry)}
          className="px-1 text-sm text-panel-text-muted hover:text-panel-text transition-colors"
          title="Copy JSON to clipboard"
        >
          {copiedId === entry.id ? 'copied!' : 'duplicate'}
        </button>
        {!readOnly && (
          <>
            <button
              onClick={() => handleStartEdit(entry)}
              className="px-1 text-sm text-panel-accent hover:text-panel-accent-hover transition-colors"
              title="Edit entry"
            >
              edit
            </button>
            <button
              onClick={() => handleEvict(entry.id)}
              className="px-1 text-sm text-panel-error hover:text-panel-error/80 transition-colors"
              title="Evict from cache"
            >
              evict
            </button>
          </>
        )}
      </div>
    ),
    [copiedId, handleCopy, handleStartEdit, handleEvict],
  )

  const renderEntryContent = useCallback(
    (entry: CacheEntry) => {
      if (editingId === entry.id) {
        return (
          <div className="ml-4 py-1 space-y-1">
            <textarea
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              className="w-full h-48 px-2 py-1 text-sm font-mono rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent resize-y"
              spellCheck={false}
            />
            {editError && (
              <div className="text-sm text-panel-error">{editError}</div>
            )}
            <div className="flex gap-1">
              <button
                onClick={() => handleSaveEdit(entry.id)}
                disabled={saving}
                className="px-2 py-0.5 text-sm rounded bg-panel-accent text-white hover:bg-panel-accent-hover disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-0.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      }

      return (
        <div className="ml-4 py-1 text-sm">
          {renderValue(entry.data)}
        </div>
      )
    },
    [editingId, editJson, editError, saving, handleSaveEdit, handleCancelEdit, renderValue],
  )

  const hasNoResults = filteredRootEntries.length === 0 && filteredGroups.size === 0

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
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-2 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <button
          onClick={handleResetCache}
          className="px-2 py-1 text-sm rounded bg-panel-error/20 text-panel-error hover:bg-panel-error/30 transition-colors"
          title="Reset entire cache"
        >
          Reset
        </button>
        <span className="text-sm text-panel-text-muted">
          {totalEntries} entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {hasNoResults && (
          <div className="text-sm text-panel-text-muted text-center py-4">
            {!cacheData ? 'Click Refresh to load cache' : 'No entries found'}
          </div>
        )}

        {/* Root entries (ROOT_QUERY, ROOT_MUTATION) */}
        {filteredRootEntries.map((entry) => {
          const isExpanded = expandedId === entry.id

          return (
            <div key={entry.id} data-cache-id={entry.id} className="border-b border-panel-border/30 pb-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex-1 text-left px-1 py-0.5 text-sm font-medium rounded truncate text-panel-warning hover:bg-panel-surface transition-colors"
                >
                  <span className="text-sm mr-1">
                    {isExpanded ? '\u25BC' : '\u25B6'}
                  </span>
                  {entry.id}
                </button>
                {renderEntryActions(entry, true)}
              </div>

              {isExpanded && renderEntryContent(entry)}
            </div>
          )
        })}

        {/* Regular grouped entries */}
        {Array.from(filteredGroups.entries()).map(([typename, groupEntries]) => {
          const isGroupExpanded = expandedGroup === typename || search.trim().length > 0

          return (
            <div key={typename}>
              <button
                onClick={() => setExpandedGroup(isGroupExpanded && !search ? null : typename)}
                className="flex items-center gap-1 w-full px-1 py-0.5 text-sm font-medium text-panel-accent hover:text-panel-accent-hover transition-colors"
              >
                <span className="text-sm">{isGroupExpanded ? '\u25BC' : '\u25B6'}</span>
                <span>{typename}</span>
                <span className="text-panel-text-muted ml-1">({groupEntries.length})</span>
              </button>

              {isGroupExpanded && (
                <div className="ml-3 space-y-px">
                  {groupEntries.map((entry) => {
                    const isExpanded = expandedId === entry.id

                    return (
                      <div key={entry.id} data-cache-id={entry.id}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="flex-1 text-left px-2 py-0.5 text-sm rounded truncate text-panel-text hover:bg-panel-surface transition-colors"
                          >
                            <span className="text-sm mr-1">
                              {isExpanded ? '\u25BC' : '\u25B6'}
                            </span>
                            {entry.id}
                          </button>
                          {renderEntryActions(entry, false)}
                        </div>

                        {isExpanded && renderEntryContent(entry)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
