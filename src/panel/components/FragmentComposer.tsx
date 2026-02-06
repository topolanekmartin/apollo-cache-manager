import { type FC, useState, useMemo, useCallback } from 'react'
import type { ParsedSchema } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { FragmentPreview } from './FragmentPreview'
import { buildEmptyFormData } from '../utils/defaultValues'
import { buildFragmentString, buildDataForFragment } from '../utils/fragmentBuilder'

interface FragmentComposerProps {
  schema: ParsedSchema
  selectedType: string | null
  onWrite: (fragmentString: string, data: Record<string, unknown>, typeName: string, cacheId: string) => Promise<boolean>
  initialCacheId?: string
}

export const FragmentComposer: FC<FragmentComposerProps> = ({
  schema,
  selectedType,
  onWrite,
  initialCacheId,
}) => {
  const [id, setId] = useState('')
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [writing, setWriting] = useState(false)
  const [writeResult, setWriteResult] = useState<{ success: boolean; message: string } | null>(null)

  const type = useMemo(() => {
    if (!selectedType) return null
    return schema.types.get(selectedType) ?? null
  }, [selectedType, schema])

  const fields = useMemo(() => {
    if (!type || !('fields' in type)) return []
    return type.fields
  }, [type])

  // Reset form when type changes
  const [lastType, setLastType] = useState<string | null>(null)
  if (selectedType !== lastType) {
    setLastType(selectedType)
    setId(initialCacheId ?? '')
    setWriteResult(null)
    if (fields.length > 0) {
      setFormData(buildEmptyFormData(fields, schema))
    } else {
      setFormData({})
    }
  }

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }))
    },
    [],
  )

  const fragmentString = useMemo(() => {
    if (!selectedType || fields.length === 0) return ''
    return buildFragmentString({
      typeName: selectedType,
      fields: formData,
      schema,
    })
  }, [selectedType, formData, fields, schema])

  const fragmentData = useMemo(() => {
    if (!selectedType) return {}
    return buildDataForFragment(formData, selectedType)
  }, [formData, selectedType])

  const handleWrite = useCallback(async () => {
    if (!selectedType || !id.trim()) return
    setWriting(true)
    setWriteResult(null)
    try {
      const success = await onWrite(fragmentString, fragmentData, selectedType, id.trim())
      setWriteResult({
        success,
        message: success ? 'Written to cache!' : 'Write failed',
      })
    } catch (e) {
      setWriteResult({
        success: false,
        message: e instanceof Error ? e.message : 'Write failed',
      })
    } finally {
      setWriting(false)
    }
  }, [selectedType, id, fragmentString, fragmentData, onWrite])

  if (!selectedType || !type) {
    return (
      <div className="flex items-center justify-center h-full text-panel-text-muted text-sm">
        Select a type from the schema explorer
      </div>
    )
  }

  if (!('fields' in type) || type.fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-panel-text-muted text-sm">
        {type.kind === 'SCALAR' || type.kind === 'ENUM'
          ? `${type.kind} types cannot be written directly to cache`
          : 'This type has no fields'}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-2 border-b border-panel-border space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-panel-accent">{selectedType}</span>
          {type.kind === 'OBJECT' && (type as import('../types/schema').ObjectType).isConnection && (
            <span className="text-sm px-1 py-px rounded bg-panel-warning/20 text-panel-warning">
              Connection
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Cache ID (e.g. User:123 or raw-id)"
            className="flex-1 px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
          />
          <button
            onClick={handleWrite}
            disabled={writing || !id.trim()}
            className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {writing ? 'Writing...' : 'Write to Cache'}
          </button>
        </div>

        {writeResult && (
          <div
            className={`px-2 py-1 text-sm rounded ${
              writeResult.success
                ? 'bg-panel-success/10 text-panel-success border border-panel-success/20'
                : 'bg-panel-error/10 text-panel-error border border-panel-error/20'
            }`}
          >
            {writeResult.message}
          </div>
        )}
      </div>

      {/* Form + Preview */}
      <div className="flex-1 flex min-h-0">
        {/* Field Form */}
        <div className="flex-1 overflow-y-auto p-2">
          <TypeFieldForm
            fields={fields}
            data={formData}
            onChange={handleFieldChange}
            schema={schema}
            visited={new Set([selectedType])}
            depth={0}
            maxDepth={3}
          />
        </div>

        {/* Preview */}
        <div className="w-[300px] border-l border-panel-border">
          <FragmentPreview fragmentString={fragmentString} data={fragmentData} />
        </div>
      </div>
    </div>
  )
}
