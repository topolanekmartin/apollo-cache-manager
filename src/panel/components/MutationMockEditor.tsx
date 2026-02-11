import { type FC, useState, useMemo, useCallback, useEffect } from 'react'
import type { MutationMockDef } from '../../shared/messageTypes'
import type { ParsedSchema } from '../types/schema'
import { getBaseTypeName } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { buildEmptyFormData } from '../utils/defaultValues'

interface MutationMockEditorProps {
  mock: MutationMockDef | null // null = creating new
  schema: ParsedSchema | null
  onSave: (mock: MutationMockDef) => void
  onClose: () => void
}

export const MutationMockEditor: FC<MutationMockEditorProps> = ({
  mock,
  schema,
  onSave,
  onClose,
}) => {
  const isNew = mock === null

  const [operationName, setOperationName] = useState(mock?.operationName ?? '')
  const [delay, setDelay] = useState(mock?.delay ?? 0)
  const [returnTypeName, setReturnTypeName] = useState(mock?.returnTypeName ?? '')
  const [viewMode, setViewMode] = useState<'form' | 'json'>('json')
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(mock?.response ?? {}, null, 2),
  )
  const [formData, setFormData] = useState<Record<string, unknown>>(
    () => mock?.response ?? {},
  )
  const [error, setError] = useState<string | null>(null)

  // Get available mutations from schema
  const mutations = useMemo(() => {
    if (!schema?.mutationType) return []
    const mutType = schema.types.get(schema.mutationType)
    if (!mutType || !('fields' in mutType)) return []
    return mutType.fields
  }, [schema])

  // Get the return type fields for form mode
  const returnTypeInfo = useMemo(() => {
    if (!returnTypeName || !schema) return null
    const t = schema.types.get(returnTypeName)
    if (!t || !('fields' in t) || t.fields.length === 0) return null
    return t
  }, [returnTypeName, schema])

  const formAvailable = returnTypeInfo !== null

  // When selecting a mutation from dropdown, auto-fill return type
  const handleSelectMutation = useCallback(
    (name: string) => {
      setOperationName(name)
      if (!schema?.mutationType) return

      const mutType = schema.types.get(schema.mutationType)
      if (!mutType || !('fields' in mutType)) return

      const field = mutType.fields.find((f) => f.name === name)
      if (!field) return

      const baseName = getBaseTypeName(field.type)
      setReturnTypeName(baseName)

      // Build default response from return type
      const retType = schema.types.get(baseName)
      if (retType && 'fields' in retType) {
        const defaults = buildEmptyFormData(retType.fields, schema)
        defaults.__typename = baseName
        setFormData(defaults)
        setJsonText(JSON.stringify(defaults, null, 2))
      }
    },
    [schema],
  )

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }, [])

  const handleSwitchToJson = useCallback(() => {
    const data = returnTypeName
      ? { __typename: returnTypeName, ...formData }
      : formData
    setJsonText(JSON.stringify(data, null, 2))
    setViewMode('json')
    setError(null)
  }, [formData, returnTypeName])

  const handleSwitchToForm = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('JSON must be an object')
        return
      }
      setFormData(parsed as Record<string, unknown>)
      setViewMode('form')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }, [jsonText])

  const handleSave = useCallback(() => {
    if (!operationName.trim()) {
      setError('Operation name is required')
      return
    }

    let response: Record<string, unknown>
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(jsonText)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('JSON must be an object')
          return
        }
        response = parsed as Record<string, unknown>
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid JSON')
        return
      }
    } else {
      response = returnTypeName
        ? { __typename: returnTypeName, ...formData }
        : { ...formData }
    }

    onSave({
      id: mock?.id ?? Date.now().toString(36),
      operationName: operationName.trim(),
      response,
      active: mock?.active ?? true,
      delay,
      returnTypeName: returnTypeName || undefined,
    })
  }, [operationName, viewMode, jsonText, formData, returnTypeName, delay, mock, onSave])

  const fields = returnTypeInfo && 'fields' in returnTypeInfo ? returnTypeInfo.fields : []

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
            {isNew ? 'New Mutation Mock' : 'Edit Mutation Mock'}
          </span>
          <button
            onClick={onClose}
            className="text-panel-text-muted hover:text-panel-text transition-colors text-lg leading-none"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Operation name */}
        <div className="px-4 py-2 border-b border-panel-border space-y-2">
          <label className="text-sm text-panel-text-muted block">Operation Name</label>
          {mutations.length > 0 ? (
            <div className="space-y-1">
              <select
                value={mutations.some((m) => m.name === operationName) ? operationName : ''}
                onChange={(e) => {
                  if (e.target.value) handleSelectMutation(e.target.value)
                }}
                className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent"
              >
                <option value="">Select from schema...</option>
                {mutations.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={operationName}
                onChange={(e) => setOperationName(e.target.value)}
                placeholder="Or type custom operation name"
                className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
              />
            </div>
          ) : (
            <input
              type="text"
              value={operationName}
              onChange={(e) => setOperationName(e.target.value)}
              placeholder="e.g. createUser"
              className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
              autoFocus
            />
          )}
        </div>

        {/* Delay */}
        <div className="px-4 py-2 border-b border-panel-border">
          <label className="text-sm text-panel-text-muted block mb-1">Delay (ms)</label>
          <input
            type="number"
            value={delay}
            onChange={(e) => setDelay(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            step={100}
            className="w-24 px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent"
          />
        </div>

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

        {/* Response editor */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <label className="text-sm text-panel-text-muted block mb-2">Mock Response Data</label>
          {viewMode === 'form' && schema && returnTypeInfo ? (
            <TypeFieldForm
              fields={fields}
              data={formData}
              onChange={handleFieldChange}
              schema={schema}
              visited={new Set(returnTypeName ? [returnTypeName] : [])}
              depth={0}
              maxDepth={3}
            />
          ) : (
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-64 px-2 py-1 text-sm font-mono rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent resize-y"
              spellCheck={false}
              placeholder='{"fieldName": "value"}'
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-panel-border">
          <button
            onClick={handleSave}
            disabled={!operationName.trim()}
            className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
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
