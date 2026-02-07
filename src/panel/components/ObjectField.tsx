import { type FC, useState, useCallback, useMemo } from 'react'
import type { ParsedSchema, FieldDef } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { buildEmptyFormData } from '../utils/defaultValues'
import { useCacheData } from '../contexts/CacheDataContext'
import { getEntitiesForType, getEntityLabel } from '../utils/entityLabels'
import { EntityPickerModal } from './EntityPickerModal'

type Mode = 'create' | 'reference'

interface ObjectFieldProps {
  typeName: string
  fields: FieldDef[]
  value: Record<string, unknown> | null
  onChange: (value: Record<string, unknown> | null) => void
  schema: ParsedSchema
  visited: Set<string>
  depth: number
  maxDepth: number
}

export const ObjectField: FC<ObjectFieldProps> = ({
  typeName,
  fields,
  value,
  onChange,
  schema,
  visited,
  depth,
  maxDepth,
}) => {
  const cacheData = useCacheData()
  const isRef = value != null && '__ref' in value && typeof value.__ref === 'string'
  const [mode, setMode] = useState<Mode>(isRef ? 'reference' : 'create')
  const [expanded, setExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const entities = useMemo(
    () => getEntitiesForType(cacheData, typeName, schema),
    [cacheData, typeName, schema],
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

  const handleToggle = useCallback(() => {
    if (!expanded && !value) {
      const defaults = buildEmptyFormData(fields, schema)
      onChange({ __typename: typeName, ...defaults })
    }
    setExpanded(!expanded)
  }, [expanded, value, fields, schema, typeName, onChange])

  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      onChange({
        ...(value ?? { __typename: typeName }),
        [fieldName]: fieldValue,
      })
    },
    [value, typeName, onChange],
  )

  const handleSetNull = useCallback(() => {
    onChange(null)
    setExpanded(false)
  }, [onChange])

  const handleModeSwitch = useCallback(
    (newMode: Mode) => {
      setMode(newMode)
      if (newMode === 'create') {
        const defaults = buildEmptyFormData(fields, schema)
        onChange({ __typename: typeName, ...defaults })
        setExpanded(true)
      } else {
        // Switching to reference mode - clear value until user picks one
        onChange(null)
        setExpanded(false)
      }
    },
    [fields, schema, typeName, onChange],
  )

  const handleEntitySelect = useCallback(
    (cacheId: string) => {
      onChange({ __ref: cacheId })
      setPickerOpen(false)
    },
    [onChange],
  )

  const isCircular = visited.has(typeName) || depth >= maxDepth

  if (isCircular) {
    return (
      <div className="space-y-1">
        <ModeToggle
          mode={mode}
          onModeChange={setMode}
          entityCount={entities.length}
        />
        {mode === 'create' ? (
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
            placeholder={`${typeName} (circular ref - enter JSON)`}
            className="w-full px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-warning placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent font-mono"
          />
        ) : (
          <>
            <EntityTrigger
              selectedLabel={selectedLabel}
              onOpen={() => setPickerOpen(true)}
              entityCount={entities.length}
            />
            {pickerOpen && (
              <EntityPickerModal
                entities={entities}
                typeName={typeName}
                onSelect={handleEntitySelect}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="border-l border-panel-border pl-2">
      <div className="flex items-center gap-2 mb-1">
        <ModeToggle
          mode={mode}
          onModeChange={handleModeSwitch}
          entityCount={entities.length}
        />
        {mode === 'create' && (
          <button
            onClick={handleToggle}
            className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
          >
            {expanded ? '\u25BC' : '\u25B6'} {typeName}
          </button>
        )}
        {value && (
          <button
            onClick={handleSetNull}
            className="text-sm text-panel-error hover:text-panel-error/80 transition-colors"
          >
            null
          </button>
        )}
      </div>

      {mode === 'create' && expanded && value && !isRef && (
        <TypeFieldForm
          fields={fields}
          data={value}
          onChange={handleFieldChange}
          schema={schema}
          visited={new Set([...visited, typeName])}
          depth={depth + 1}
          maxDepth={maxDepth}
        />
      )}

      {mode === 'reference' && (
        <>
          <EntityTrigger
            selectedLabel={selectedLabel}
            onOpen={() => setPickerOpen(true)}
            entityCount={entities.length}
          />
          {pickerOpen && (
            <EntityPickerModal
              entities={entities}
              typeName={typeName}
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
