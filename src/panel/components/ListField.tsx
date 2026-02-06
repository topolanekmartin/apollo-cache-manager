import { type FC, useCallback } from 'react'
import type { TypeRef, ParsedSchema } from '../types/schema'
import { getDefaultValueForType } from '../utils/defaultValues'
import { TypeFieldInput } from './TypeFieldInput'

interface ListFieldProps {
  itemTypeRef: TypeRef
  value: unknown[]
  onChange: (value: unknown[]) => void
  schema: ParsedSchema
  visited: Set<string>
  depth: number
  maxDepth: number
}

// Unwrap NON_NULL and LIST wrappers to get the inner type
function unwrapListType(typeRef: TypeRef): TypeRef {
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return unwrapListType(typeRef.ofType)
  }
  if (typeRef.kind === 'LIST' && typeRef.ofType) {
    return typeRef.ofType
  }
  return typeRef
}

export const ListField: FC<ListFieldProps> = ({
  itemTypeRef,
  value,
  onChange,
  schema,
  visited,
  depth,
  maxDepth,
}) => {
  const innerType = unwrapListType(itemTypeRef)

  const handleAdd = useCallback(() => {
    const defaultValue = getDefaultValueForType(innerType, schema, new Set(visited), depth, maxDepth)
    onChange([...value, defaultValue])
  }, [innerType, schema, visited, depth, maxDepth, value, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [value, onChange],
  )

  const handleItemChange = useCallback(
    (index: number, newValue: unknown) => {
      const updated = [...value]
      updated[index] = newValue
      onChange(updated)
    },
    [value, onChange],
  )

  return (
    <div className="space-y-1">
      {value.map((item, index) => (
        <div key={index} className="flex items-start gap-1">
          <span className="text-sm text-panel-text-muted pt-1 min-w-[16px] text-right">
            {index}
          </span>
          <div className="flex-1">
            <TypeFieldInput
              typeRef={innerType}
              value={item}
              onChange={(v) => handleItemChange(index, v)}
              schema={schema}
              visited={visited}
              depth={depth}
              maxDepth={maxDepth}
            />
          </div>
          <button
            onClick={() => handleRemove(index)}
            className="px-1 text-sm text-panel-error hover:text-panel-error/80 transition-colors"
            title="Remove item"
          >
            x
          </button>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="px-2 py-0.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 transition-colors"
      >
        + Add item
      </button>
    </div>
  )
}
