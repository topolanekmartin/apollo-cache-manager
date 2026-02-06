import { type FC, useState, useCallback, useMemo } from 'react'
import type { ParsedSchema } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { buildEmptyFormData } from '../utils/defaultValues'

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
  const currentTypeName = (value?.__typename as string) ?? ''
  const [expanded, setExpanded] = useState(false)

  const currentType = useMemo(() => {
    if (!currentTypeName) return null
    return schema.types.get(currentTypeName) ?? null
  }, [currentTypeName, schema])

  const handleTypeChange = useCallback(
    (typeName: string) => {
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
    [schema, onChange],
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
          value={currentTypeName}
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
        {currentType && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
      </div>

      {expanded && currentType && 'fields' in currentType && value && (
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
    </div>
  )
}
