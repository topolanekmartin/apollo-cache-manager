import { type FC, useState, useMemo, useCallback, useEffect } from 'react'
import type { ParsedSchema } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { CacheDataProvider } from '../contexts/CacheDataContext'
import { cacheDataToFormData } from '../utils/cacheDataAdapter'

interface CacheEntry {
  id: string
  typename: string
  data: Record<string, unknown>
}

interface CacheEditDialogProps {
  entry: CacheEntry
  mode: 'edit' | 'duplicate'
  schema: ParsedSchema | null
  cacheData: Record<string, unknown> | null
  onSave: (cacheId: string, data: Record<string, unknown>, typeName: string) => Promise<boolean>
  onClose: () => void
}

export const CacheEditDialog: FC<CacheEditDialogProps> = ({
  entry,
  mode,
  schema,
  cacheData,
  onSave,
  onClose,
}) => {
  const typeName = (entry.data.__typename as string) ?? entry.typename
  const [cacheId, setCacheId] = useState(mode === 'duplicate' ? `${entry.id}-copy` : entry.id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine if form view is available
  const schemaType = useMemo(() => {
    if (!schema) return null
    const t = schema.types.get(typeName)
    if (!t || !('fields' in t) || t.fields.length === 0) return null
    return t
  }, [schema, typeName])

  const formAvailable = schemaType !== null

  const [viewMode, setViewMode] = useState<'form' | 'json'>(formAvailable ? 'form' : 'json')

  // Form data state
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (schemaType && schema && 'fields' in schemaType) {
      return cacheDataToFormData(entry.data, schemaType.fields, schema)
    }
    return { ...entry.data }
  })

  // JSON text state
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(entry.data, null, 2),
  )

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }))
    },
    [],
  )

  // Toggle to JSON: serialize current formData
  const handleSwitchToJson = useCallback(() => {
    const dataWithTypename = { __typename: typeName, ...formData }
    setJsonText(JSON.stringify(dataWithTypename, null, 2))
    setViewMode('json')
    setError(null)
  }, [formData, typeName])

  // Toggle to Form: parse JSON, load into formData
  const handleSwitchToForm = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('JSON must be an object')
        return
      }
      if (schemaType && schema && 'fields' in schemaType) {
        setFormData(cacheDataToFormData(parsed as Record<string, unknown>, schemaType.fields, schema))
      } else {
        setFormData(parsed as Record<string, unknown>)
      }
      setViewMode('form')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }, [jsonText, schemaType, schema])

  const handleSave = useCallback(async () => {
    setError(null)
    setSaving(true)
    try {
      let data: Record<string, unknown>
      if (viewMode === 'json') {
        const parsed = JSON.parse(jsonText)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('JSON must be an object')
          setSaving(false)
          return
        }
        data = parsed as Record<string, unknown>
      } else {
        data = { __typename: typeName, ...formData }
      }

      const saveTypeName = (data.__typename as string) ?? typeName
      const success = await onSave(cacheId, data, saveTypeName)
      if (!success) {
        setError('Write failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [viewMode, jsonText, formData, typeName, cacheId, onSave])

  const fields = schemaType && 'fields' in schemaType ? schemaType.fields : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-panel-bg border border-panel-border rounded-lg shadow-2xl flex flex-col"
        style={{ width: '90%', maxWidth: 640, maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <span className="text-sm font-medium text-panel-text">
            {mode === 'edit' ? 'Edit' : 'Duplicate'}{' '}
            <span className="text-panel-accent">{entry.id}</span>
          </span>
          <button
            onClick={onClose}
            className="text-panel-text-muted hover:text-panel-text transition-colors text-lg leading-none"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Duplicate: cache ID input */}
        {mode === 'duplicate' && (
          <div className="px-4 py-2 border-b border-panel-border">
            <label className="text-sm text-panel-text-muted block mb-1">New Cache ID</label>
            <input
              type="text"
              value={cacheId}
              onChange={(e) => setCacheId(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
              autoFocus
            />
          </div>
        )}

        {/* View toggle */}
        {formAvailable && (
          <div className="flex gap-1 px-4 py-2 border-b border-panel-border">
            <button
              onClick={viewMode === 'json' ? handleSwitchToForm : undefined}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'form'
                  ? 'bg-panel-accent text-panel-bg font-medium'
                  : 'bg-panel-border text-panel-text-muted hover:text-panel-text'
              }`}
            >
              Form
            </button>
            <button
              onClick={viewMode === 'form' ? handleSwitchToJson : undefined}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'json'
                  ? 'bg-panel-accent text-panel-bg font-medium'
                  : 'bg-panel-border text-panel-text-muted hover:text-panel-text'
              }`}
            >
              JSON
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {viewMode === 'form' && schema ? (
            <CacheDataProvider value={cacheData}>
              <TypeFieldForm
                fields={fields}
                data={formData}
                onChange={handleFieldChange}
                schema={schema}
                visited={new Set([typeName])}
                depth={0}
                maxDepth={3}
              />
            </CacheDataProvider>
          ) : (
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-64 px-2 py-1 text-sm font-mono rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent resize-y"
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-panel-border">
          <button
            onClick={handleSave}
            disabled={saving || (mode === 'duplicate' && !cacheId.trim())}
            className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text transition-colors"
          >
            Cancel
          </button>
          {error && (
            <span className="text-sm text-panel-error ml-2">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}
