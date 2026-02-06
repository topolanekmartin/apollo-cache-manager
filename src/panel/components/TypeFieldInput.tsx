import type { FC } from 'react'
import type { TypeRef, ParsedSchema } from '../types/schema'
import { getBaseTypeName, isList } from '../types/schema'
import { ScalarInput } from './ScalarInput'
import { EnumSelect } from './EnumSelect'
import { ListField } from './ListField'
import { ObjectField } from './ObjectField'
import { UnionField } from './UnionField'

interface TypeFieldInputProps {
  typeRef: TypeRef
  value: unknown
  onChange: (value: unknown) => void
  schema: ParsedSchema
  visited: Set<string>
  depth: number
  maxDepth: number
  required?: boolean
}

export const TypeFieldInput: FC<TypeFieldInputProps> = ({
  typeRef,
  value,
  onChange,
  schema,
  visited,
  depth,
  maxDepth,
  required,
}) => {
  // Handle NON_NULL wrapper
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return (
      <TypeFieldInput
        typeRef={typeRef.ofType}
        value={value}
        onChange={onChange}
        schema={schema}
        visited={visited}
        depth={depth}
        maxDepth={maxDepth}
        required
      />
    )
  }

  // Handle LIST
  if (isList(typeRef)) {
    return (
      <ListField
        itemTypeRef={typeRef}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        schema={schema}
        visited={visited}
        depth={depth}
        maxDepth={maxDepth}
      />
    )
  }

  const baseName = getBaseTypeName(typeRef)
  const type = schema.types.get(baseName)

  if (!type) {
    // Unknown type, treat as scalar
    return (
      <ScalarInput
        typeName={baseName}
        value={value}
        onChange={onChange}
        required={required}
      />
    )
  }

  switch (type.kind) {
    case 'SCALAR':
      return (
        <ScalarInput
          typeName={type.name}
          value={value}
          onChange={onChange}
          required={required}
        />
      )

    case 'ENUM':
      return (
        <EnumSelect
          values={type.values}
          value={value}
          onChange={onChange}
          required={required}
        />
      )

    case 'OBJECT':
    case 'INPUT_OBJECT':
      return (
        <ObjectField
          typeName={type.name}
          fields={type.fields}
          value={value as Record<string, unknown> | null}
          onChange={onChange as (value: Record<string, unknown> | null) => void}
          schema={schema}
          visited={visited}
          depth={depth}
          maxDepth={maxDepth}
        />
      )

    case 'INTERFACE':
      return (
        <UnionField
          possibleTypes={type.possibleTypes}
          value={value as Record<string, unknown> | null}
          onChange={onChange as (value: Record<string, unknown> | null) => void}
          schema={schema}
          visited={visited}
          depth={depth}
          maxDepth={maxDepth}
        />
      )

    case 'UNION':
      return (
        <UnionField
          possibleTypes={type.possibleTypes}
          value={value as Record<string, unknown> | null}
          onChange={onChange as (value: Record<string, unknown> | null) => void}
          schema={schema}
          visited={visited}
          depth={depth}
          maxDepth={maxDepth}
        />
      )

    default:
      return (
        <ScalarInput
          typeName={baseName}
          value={value}
          onChange={onChange}
          required={required}
        />
      )
  }
}
