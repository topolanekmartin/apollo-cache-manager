import { type FC, useCallback, useState } from 'react'
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

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  const handleMove = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= value.length) return
      const updated = [...value]
      const temp = updated[index]
      updated[index] = updated[targetIndex]
      updated[targetIndex] = temp
      onChange(updated)
    },
    [value, onChange],
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      setDragIndex(index)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    },
    [],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      setDragOverIndex(index)
    },
    [],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }
      const updated = [...value]
      const [removed] = updated.splice(dragIndex, 1)
      updated.splice(targetIndex, 0, removed)
      onChange(updated)
      setDragIndex(null)
      setDragOverIndex(null)
    },
    [dragIndex, value, onChange],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  return (
    <div className="space-y-1">
      {value.map((item, index) => (
        <div
          key={index}
          className={`flex items-start gap-1 ${dragIndex === index ? 'opacity-40' : ''} ${dragOverIndex === index && dragIndex !== index ? 'ring-1 ring-panel-accent' : ''}`}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
        >
          <span
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            className={`shrink-0 select-none pt-1 text-sm text-panel-text-muted hover:text-panel-text transition-colors ${dragIndex === index ? 'cursor-grabbing' : 'cursor-grab'}`}
            title="Drag to reorder"
          >
            ⠿
          </span>
          <span className="shrink-0 text-sm text-panel-text-muted pt-1 min-w-[16px] text-right">
            {index}
          </span>
          <div className="flex-1 min-w-0">
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
            onClick={() => handleMove(index, -1)}
            disabled={index === 0}
            className="shrink-0 px-1 text-sm text-panel-text-muted hover:text-panel-text disabled:opacity-30 disabled:cursor-default transition-colors"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => handleMove(index, 1)}
            disabled={index === value.length - 1}
            className="shrink-0 px-1 text-sm text-panel-text-muted hover:text-panel-text disabled:opacity-30 disabled:cursor-default transition-colors"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={() => handleRemove(index)}
            className="shrink-0 px-1 text-sm text-panel-error hover:text-panel-error/80 transition-colors"
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
