import { type FC, useState, useMemo } from 'react'
import type { ParsedSchema, ParsedType } from '../types/schema'

interface SchemaExplorerProps {
  schema: ParsedSchema
  onSelectType: (typeName: string) => void
  selectedType: string | null
}

const TYPE_KIND_LABELS: Record<string, string> = {
  OBJECT: 'Types',
  INTERFACE: 'Interfaces',
  UNION: 'Unions',
  ENUM: 'Enums',
  SCALAR: 'Scalars',
  INPUT_OBJECT: 'Inputs',
}

const TYPE_KIND_COLORS: Record<string, string> = {
  OBJECT: 'text-panel-accent',
  INTERFACE: 'text-purple-400',
  UNION: 'text-orange-400',
  ENUM: 'text-panel-warning',
  SCALAR: 'text-panel-text-muted',
  INPUT_OBJECT: 'text-teal-400',
}

export const SchemaExplorer: FC<SchemaExplorerProps> = ({
  schema,
  onSelectType,
  selectedType,
}) => {
  const [search, setSearch] = useState('')
  const [expandedKind, setExpandedKind] = useState<string>('OBJECT')

  const grouped = useMemo(() => {
    const groups = new Map<string, ParsedType[]>()
    for (const type of schema.types.values()) {
      // Skip root operation types from the list
      if (
        type.name === schema.queryType ||
        type.name === schema.mutationType ||
        type.name === schema.subscriptionType
      ) {
        continue
      }

      const existing = groups.get(type.kind) ?? []
      existing.push(type)
      groups.set(type.kind, existing)
    }

    // Sort each group alphabetically
    for (const types of groups.values()) {
      types.sort((a, b) => a.name.localeCompare(b.name))
    }

    return groups
  }, [schema])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return grouped
    const query = search.toLowerCase()
    const filtered = new Map<string, ParsedType[]>()
    for (const [kind, types] of grouped) {
      const matching = types.filter((t) => t.name.toLowerCase().includes(query))
      if (matching.length > 0) {
        filtered.set(kind, matching)
      }
    }
    return filtered
  }, [grouped, search])

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search types..."
        className="w-full px-2 py-1 mb-2 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
      />

      <div className="flex-1 overflow-y-auto space-y-1">
        {['OBJECT', 'INTERFACE', 'UNION', 'ENUM', 'INPUT_OBJECT', 'SCALAR'].map((kind) => {
          const types = filteredGroups.get(kind)
          if (!types?.length) return null

          const isExpanded = expandedKind === kind || search.trim().length > 0

          return (
            <div key={kind}>
              <button
                onClick={() => setExpandedKind(isExpanded && !search ? '' : kind)}
                className="flex items-center gap-1 w-full px-1 py-0.5 text-sm font-medium text-panel-text-muted hover:text-panel-text transition-colors"
              >
                <span className="text-sm">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                <span>{TYPE_KIND_LABELS[kind] ?? kind}</span>
                <span className="text-panel-border ml-1">({types.length})</span>
              </button>

              {isExpanded && (
                <div className="ml-3 space-y-px">
                  {types.map((type) => (
                    <button
                      key={type.name}
                      onClick={() => onSelectType(type.name)}
                      className={`block w-full text-left px-2 py-0.5 text-sm rounded truncate transition-colors ${
                        selectedType === type.name
                          ? 'bg-panel-accent/20 text-panel-accent'
                          : `${TYPE_KIND_COLORS[kind]} hover:bg-panel-surface`
                      }`}
                      title={type.description ?? type.name}
                    >
                      {type.name}
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
