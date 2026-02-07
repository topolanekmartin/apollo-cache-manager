import { type FC, useState, useCallback, useMemo } from 'react'
import type { ParsedSchema } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { buildEmptyFormData } from '../utils/defaultValues'
import { useCacheData } from '../contexts/CacheDataContext'
import { getEntitiesForType, getEntityLabel } from '../utils/entityLabels'
import { EntityPickerModal } from './EntityPickerModal'

type Mode = 'create' | 'reference'

interface UnionFieldProps {
  possibleTypes: string[]
  value: Record<string, unknown> | null
  onChange: (value: Record<string, unknown> | null) => void
  schema: ParsedSchema
  visited: Set<string>
  depth: number
  maxDepth: number
}

export const UnionField: FC<UnionFieldProps> = ({
  possibleTypes,
  value,
  onChange,
  schema,
  visited,
  depth,
  maxDepth,
}) => {
  const cacheData = useCacheData()
  const isRef = value != null && '__ref' in value && typeof value.__ref === 'string'
  const currentTypeName = isRef ? '' : ((value?.__typename as string) ?? '')
  const [mode, setMode] = useState<Mode>(isRef ? 'reference' : 'create')
  const [expanded, setExpanded] = useState(false)
  const [refTypeName, setRefTypeName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const activeTypeName = mode === 'reference' ? refTypeName : currentTypeName

  const currentType = useMemo(() => {
    if (!activeTypeName) return null
    return schema.types.get(activeTypeName) ?? null
  }, [activeTypeName, schema])

  const entities = useMemo(
    () => {
      if (!activeTypeName) return []
      return getEntitiesForType(cacheData, activeTypeName, schema)
    },
    [cacheData, activeTypeName, schema],
  )

  const selectedLabel = useMemo(() => {
    if (!isRef) return null
    const refId = value.__ref as string
    const entry = cacheData?.[refId]
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return getEntityLabel(refId, entry as Record<string, unknown>)
    }
    return refId
  }, [isRef, value, cacheData])

  const handleTypeChange = useCallback(
    (typeName: string) => {
      if (mode === 'reference') {
        setRefTypeName(typeName)
        onChange(null)
        return
      }
      if (!typeName) {
        onChange(null)
        return
      }
      const type = schema.types.get(typeName)
      if (!type || !('fields' in type)) {
        onChange({ __typename: typeName })
        return
      }
      const defaults = buildEmptyFormData(type.fields, schema)
      onChange({ __typename: typeName, ...defaults })
    },
    [schema, onChange, mode],
  )

  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      onChange({
        ...(value ?? {}),
        [fieldName]: fieldValue,
      })
    },
    [value, onChange],
  )

  const handleModeSwitch = useCallback(
    (newMode: Mode) => {
      setMode(newMode)
      if (newMode === 'create') {
        setRefTypeName('')
        if (currentTypeName) {
          const type = schema.types.get(currentTypeName)
          if (type && 'fields' in type) {
            const defaults = buildEmptyFormData(type.fields, schema)
            onChange({ __typename: currentTypeName, ...defaults })
          } else {
            onChange({ __typename: currentTypeName })
          }
        } else {
          onChange(null)
        }
        setExpanded(true)
      } else {
        onChange(null)
        setExpanded(false)
      }
    },
    [schema, currentTypeName, onChange],
  )

  const handleEntitySelect = useCallback(
    (cacheId: string) => {
      onChange({ __ref: cacheId })
      setPickerOpen(false)
    },
    [onChange],
  )

  if (depth >= maxDepth || possibleTypes.every((t) => visited.has(t))) {
    return (
      <input
        type="text"
        value={value ? JSON.stringify(value) : ''}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value))
          } catch {
            // ignore
          }
        }}
        placeholder="Union (max depth - enter JSON)"
        className="w-full px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-warning placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent font-mono"
      />
    )
  }

  return (
    <div className="border-l border-purple-400/30 pl-2 space-y-1">
      <div className="flex items-center gap-2">
        <select
          value={activeTypeName}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="flex-1 px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent"
        >
          <option value="">-- Select type --</option>
          {possibleTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {mode === 'create' && currentType && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
      </div>

      {activeTypeName && (
        <ModeToggle
          mode={mode}
          onModeChange={handleModeSwitch}
          entityCount={entities.length}
        />
      )}

      {mode === 'create' && expanded && currentType && 'fields' in currentType && value && !isRef && (
        <TypeFieldForm
          fields={currentType.fields}
          data={value}
          onChange={handleFieldChange}
          schema={schema}
          visited={new Set([...visited, currentTypeName])}
          depth={depth + 1}
          maxDepth={maxDepth}
        />
      )}

      {mode === 'reference' && activeTypeName && (
        <>
          <EntityTrigger
            selectedLabel={selectedLabel}
            onOpen={() => setPickerOpen(true)}
            entityCount={entities.length}
          />
          {pickerOpen && (
            <EntityPickerModal
              entities={entities}
              typeName={activeTypeName}
              onSelect={handleEntitySelect}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}

// --- Sub-components ---

interface ModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
  entityCount: number
}

const ModeToggle: FC<ModeToggleProps> = ({ mode, onModeChange, entityCount }) => {
  const btnBase = 'px-2 py-0.5 text-xs rounded-sm transition-colors'
  const activeClass = 'bg-panel-accent text-panel-bg font-medium'
  const inactiveClass = 'bg-panel-surface text-panel-text-muted hover:text-panel-text border border-panel-border'
  const disabledClass = 'bg-panel-surface text-panel-text-muted/50 border border-panel-border cursor-not-allowed'

  return (
    <div className="flex gap-px">
      <button
        onClick={() => onModeChange('create')}
        className={`${btnBase} rounded-r-none ${mode === 'create' ? activeClass : inactiveClass}`}
      >
        Create new
      </button>
      <button
        onClick={() => entityCount > 0 && onModeChange('reference')}
        disabled={entityCount === 0}
        title={entityCount === 0 ? 'No matching entities in cache' : `${entityCount} entities available`}
        className={`${btnBase} rounded-l-none ${
          mode === 'reference'
            ? activeClass
            : entityCount === 0
              ? disabledClass
              : inactiveClass
        }`}
      >
        Use existing{entityCount > 0 ? ` (${entityCount})` : ''}
      </button>
    </div>
  )
}

interface EntityTriggerProps {
  selectedLabel: string | null
  onOpen: () => void
  entityCount: number
}

const EntityTrigger: FC<EntityTriggerProps> = ({ selectedLabel, onOpen, entityCount }) => {
  if (entityCount === 0) {
    return (
      <div className="text-sm text-panel-text-muted italic">
        No matching entities in cache
      </div>
    )
  }

  return (
    <button
      onClick={onOpen}
      className="w-full text-left px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text hover:border-panel-accent focus:outline-none focus:border-panel-accent transition-colors truncate"
    >
      {selectedLabel ?? 'Select entity...'}
    </button>
  )
}
