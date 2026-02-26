import { type FC, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import type { ParsedSchema } from '../types/schema'
import type { UseDraftReturn } from '../hooks/useDraft'
import { TypeFieldForm } from './TypeFieldForm'
import { CacheDataProvider } from '../contexts/CacheDataContext'
import { cacheDataToFormData } from '../utils/cacheDataAdapter'

interface EntityDetailProps {
  entityKey: string
  cacheData: Record<string, unknown> | null
  schema: ParsedSchema | null
  draft: UseDraftReturn
  viewMode: 'form' | 'json'
  onViewModeChange: (mode: 'form' | 'json') => void
  onRequestDisableEditMode: () => void
  onSelectEntity: (key: string) => void
  onEvict: (entityKey: string) => Promise<void>
}

export const EntityDetail: FC<EntityDetailProps> = ({
  entityKey,
  cacheData,
  schema,
  draft,
  viewMode,
  onViewModeChange,
  onRequestDisableEditMode,
  onSelectEntity,
  onEvict,
}) => {
  const [showEvictConfirm, setShowEvictConfirm] = useState(false)
  const entityData = useMemo(() => {
    if (!cacheData || !cacheData[entityKey]) return null
    return cacheData[entityKey] as Record<string, unknown>
  }, [cacheData, entityKey])

  const typeName = useMemo(() => {
    if (!entityData) return entityKey.split(':')[0] ?? 'Unknown'
    return (entityData.__typename as string) ?? entityKey.split(':')[0] ?? 'Unknown'
  }, [entityData, entityKey])

  const schemaType = useMemo(() => {
    if (!schema) return null
    const t = schema.types.get(typeName)
    if (!t || !('fields' in t) || t.fields.length === 0) return null
    return t
  }, [schema, typeName])

  const formAvailable = schemaType !== null

  const draftEntity = draft.draftEntities[entityKey]

  const modifiedFields = useMemo(() => {
    if (!entityData || !draftEntity) return new Set<string>()
    const modified = new Set<string>()
    for (const key of Object.keys(entityData)) {
      if (key === '__typename') continue
      if (JSON.stringify(entityData[key]) !== JSON.stringify(draftEntity.data[key])) {
        modified.add(key)
      }
    }
    return modified
  }, [entityData, draftEntity])

  // Get the data to display (draft if in edit mode and entity is drafted, else cache)
  const isEditing = draft.editMode
  const displayData = isEditing && draftEntity ? draftEntity.data : entityData

  // Form data state - used for form view in edit mode
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Track the current entity key to detect entity changes
  const prevEntityKeyRef = useRef(entityKey)
  const prevEditModeRef = useRef(isEditing)

  // Sync data when entity changes or edit mode toggles
  useEffect(() => {
    const entityChanged = prevEntityKeyRef.current !== entityKey
    const editModeChanged = prevEditModeRef.current !== isEditing
    prevEntityKeyRef.current = entityKey
    prevEditModeRef.current = isEditing

    if (!displayData) return

    if (entityChanged || editModeChanged) {
      // When entering edit mode, ensure entity is in draft
      if (isEditing && entityData) {
        draft.ensureDraftEntity(entityKey, entityData, typeName)
      }

      // Sync form/json data from display data
      if (schemaType && schema && 'fields' in schemaType) {
        setFormData(cacheDataToFormData(displayData, schemaType.fields, schema))
      } else {
        setFormData({ ...displayData })
      }
      setJsonText(JSON.stringify(displayData, null, 2))
      setJsonError(null)
    }
  }, [entityKey, isEditing, displayData, entityData, typeName, schemaType, schema, draft])

  // When draft entity updates externally, sync form/json
  useEffect(() => {
    if (!isEditing || !draftEntity) return
    // Only update if we're not the ones causing the change (avoid loops)
    // This syncs when navigating back to an already-drafted entity
  }, [draftEntity, isEditing])

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      const newFormData = { ...formData, [fieldName]: value }
      setFormData(newFormData)
      if (isEditing) {
        const dataToStore = { __typename: typeName, ...newFormData }
        draft.updateDraftEntity(entityKey, dataToStore)
      }
    },
    [formData, isEditing, typeName, entityKey, draft],
  )

  const handleJsonChange = useCallback(
    (text: string) => {
      setJsonText(text)
      setJsonError(null)
      if (isEditing) {
        try {
          const parsed = JSON.parse(text)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            draft.updateDraftEntity(entityKey, parsed as Record<string, unknown>)
          }
        } catch {
          // don't update draft while JSON is invalid
        }
      }
    },
    [isEditing, entityKey, draft],
  )

  const handleSwitchToJson = useCallback(() => {
    if (isEditing) {
      const dataWithTypename = { __typename: typeName, ...formData }
      setJsonText(JSON.stringify(dataWithTypename, null, 2))
    } else if (displayData) {
      setJsonText(JSON.stringify(displayData, null, 2))
    }
    setJsonError(null)
    onViewModeChange('json')
  }, [isEditing, formData, typeName, displayData, onViewModeChange])

  const handleSwitchToForm = useCallback(() => {
    if (isEditing) {
      try {
        const parsed = JSON.parse(jsonText)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setJsonError('JSON must be an object')
          return
        }
        if (schemaType && schema && 'fields' in schemaType) {
          setFormData(cacheDataToFormData(parsed as Record<string, unknown>, schemaType.fields, schema))
        } else {
          setFormData(parsed as Record<string, unknown>)
        }
        setJsonError(null)
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
        return
      }
    }
    onViewModeChange('form')
  }, [isEditing, jsonText, schemaType, schema, onViewModeChange])

  const handleToggleEditMode = useCallback(() => {
    if (isEditing) {
      onRequestDisableEditMode()
    } else {
      if (entityData) {
        draft.ensureDraftEntity(entityKey, entityData, typeName)
      }
      draft.enableEditMode()
    }
  }, [isEditing, entityData, entityKey, typeName, draft, onRequestDisableEditMode])

  const renderValue = useCallback(
    (value: unknown, depth = 0): React.ReactNode => {
      if (value === null) return <span className="text-panel-text-muted">null</span>
      if (value === undefined) return <span className="text-panel-text-muted">undefined</span>

      if (typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>

        if ('__ref' in obj && typeof obj.__ref === 'string') {
          return (
            <button
              onClick={() => onSelectEntity(obj.__ref as string)}
              className="text-panel-accent text-sm hover:underline cursor-pointer"
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
    [onSelectEntity],
  )

  if (!entityData && !draftEntity) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-panel-text-muted">
        Select an entity to view details
      </div>
    )
  }

  const fields = schemaType && 'fields' in schemaType ? schemaType.fields : []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-3 py-2 border-b border-panel-border">
        <span className="text-sm font-medium text-panel-text truncate flex-1">
          <span className="text-panel-accent">{entityKey}</span>
        </span>

        {/* Form / JSON toggle */}
        {formAvailable && (
          <div className="flex gap-1">
            <button
              onClick={viewMode === 'json' ? handleSwitchToForm : undefined}
              className={`px-2 py-0.5 text-sm rounded transition-colors ${
                viewMode === 'form'
                  ? 'bg-panel-accent text-panel-bg font-medium'
                  : 'bg-panel-border text-panel-text-muted hover:text-panel-text'
              }`}
            >
              Form
            </button>
            <button
              onClick={viewMode === 'form' ? handleSwitchToJson : undefined}
              className={`px-2 py-0.5 text-sm rounded transition-colors ${
                viewMode === 'json'
                  ? 'bg-panel-accent text-panel-bg font-medium'
                  : 'bg-panel-border text-panel-text-muted hover:text-panel-text'
              }`}
            >
              JSON
            </button>
          </div>
        )}

        {/* Edit mode toggle switch */}
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <span className="text-sm text-panel-text-muted">Edit</span>
          <div
            role="switch"
            aria-checked={isEditing}
            onClick={handleToggleEditMode}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              isEditing ? 'bg-panel-warning' : 'bg-panel-border'
            }`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              isEditing ? 'translate-x-4.5' : 'translate-x-0.5'
            }`} />
          </div>
        </label>

        <button
          onClick={() => setShowEvictConfirm(true)}
          className="px-1.5 py-0.5 text-sm text-panel-error hover:text-panel-error/80 transition-colors"
          title="Evict from cache"
        >
          🗑
        </button>
      </div>

      {jsonError && (
        <div className="flex-none px-3 py-1 text-sm text-panel-error bg-panel-error/10">
          {jsonError}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {isEditing ? (
          // Edit mode
          viewMode === 'form' && formAvailable && schema ? (
            <CacheDataProvider value={cacheData}>
              <TypeFieldForm
                fields={fields}
                data={formData}
                onChange={handleFieldChange}
                schema={schema}
                visited={new Set([typeName])}
                depth={0}
                maxDepth={3}
                modifiedFields={modifiedFields}
              />
            </CacheDataProvider>
          ) : (
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full h-full px-2 py-1 text-sm font-mono rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent resize-none"
              spellCheck={false}
            />
          )
        ) : (
          // Inspect mode
          viewMode === 'json' || !formAvailable ? (
            <pre className="text-sm font-mono text-panel-text whitespace-pre-wrap break-words">
              {JSON.stringify(displayData, null, 2)}
            </pre>
          ) : (
            <div className="text-sm">
              {displayData && (
                <div className="ml-3 border-l border-panel-border/50 pl-2">
                  {Object.entries(displayData as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-1 text-sm py-px">
                      {modifiedFields.has(k) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-panel-warning flex-shrink-0 mt-1" />
                      )}
                      <span className="text-panel-text-muted shrink-0">{k}:</span>
                      <span className="min-w-0">{renderValue(v, 1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {showEvictConfirm && (
        <ConfirmDialog
          title="Evict entity"
          message={`Remove "${entityKey}" from Apollo cache? This will also run garbage collection.`}
          confirmLabel="Evict"
          onConfirm={() => {
            setShowEvictConfirm(false)
            onEvict(entityKey)
          }}
          onCancel={() => setShowEvictConfirm(false)}
        />
      )}
    </div>
  )
}
