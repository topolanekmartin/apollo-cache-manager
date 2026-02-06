import { type FC, useState, useCallback } from 'react'
import type { ParsedSchema, FieldDef } from '../types/schema'
import { TypeFieldForm } from './TypeFieldForm'
import { buildEmptyFormData } from '../utils/defaultValues'

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
  const [expanded, setExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    if (!expanded && !value) {
      // Initialize with defaults on first expand
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

  const isCircular = visited.has(typeName) || depth >= maxDepth

  if (isCircular) {
    return (
      <div className="flex items-center gap-2">
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
          placeholder={`${typeName} (circular ref - enter ID or JSON)`}
          className="flex-1 px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-warning placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent font-mono"
        />
      </div>
    )
  }

  return (
    <div className="border-l border-panel-border pl-2">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={handleToggle}
          className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
        >
          {expanded ? '\u25BC' : '\u25B6'} {typeName}
        </button>
        {value && (
          <button
            onClick={handleSetNull}
            className="text-sm text-panel-error hover:text-panel-error/80 transition-colors"
          >
            null
          </button>
        )}
      </div>

      {expanded && value && (
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
    </div>
  )
}
