import type { ParsedSchema, FieldDef, TypeRef } from '../types/schema'
import { getBaseTypeName, isList } from '../types/schema'

interface FragmentBuildOptions {
  typeName: string
  fields: Record<string, unknown>
  schema: ParsedSchema
  fragmentName?: string
}

export function buildFragmentString(options: FragmentBuildOptions): string {
  const { typeName, fields, schema, fragmentName } = options
  const name = fragmentName ?? `${typeName}Mock`

  const type = schema.types.get(typeName)
  if (!type || (type.kind !== 'OBJECT' && type.kind !== 'INTERFACE')) {
    return `fragment ${name} on ${typeName} {\n  __typename\n}`
  }

  const fieldDefs = type.fields
  const selections = buildSelections(fields, fieldDefs, schema, new Set(), 0, 3)

  return `fragment ${name} on ${typeName} {\n${selections}\n}`
}

function buildSelections(
  data: Record<string, unknown>,
  fieldDefs: FieldDef[],
  schema: ParsedSchema,
  visited: Set<string>,
  depth: number,
  maxDepth: number,
  indent = '  ',
): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(data)) {
    if (key === '__typename') continue
    if (value === undefined) continue

    const fieldDef = fieldDefs.find((f) => f.name === key)
    if (!fieldDef) {
      lines.push(`${indent}${key}`)
      continue
    }

    const baseName = getBaseTypeName(fieldDef.type)
    const type = schema.types.get(baseName)

    if (!type || type.kind === 'SCALAR' || type.kind === 'ENUM') {
      lines.push(`${indent}${key}`)
      continue
    }

    if (depth >= maxDepth || visited.has(baseName)) {
      lines.push(`${indent}${key}`)
      continue
    }

    const nextVisited = new Set(visited)
    nextVisited.add(baseName)

    if (type.kind === 'UNION' || type.kind === 'INTERFACE') {
      const nestedData = getNestedObjectData(value, fieldDef.type)
      if (nestedData && typeof nestedData === 'object') {
        const typedData = nestedData as Record<string, unknown>
        const concreteTypeName = typedData.__typename as string | undefined
        if (concreteTypeName) {
          const concreteType = schema.types.get(concreteTypeName)
          if (concreteType && 'fields' in concreteType) {
            const nested = buildSelections(
              typedData,
              concreteType.fields,
              schema,
              nextVisited,
              depth + 1,
              maxDepth,
              indent + '  ',
            )
            lines.push(`${indent}${key} {`)
            lines.push(`${indent}  ... on ${concreteTypeName} {`)
            lines.push(nested)
            lines.push(`${indent}  }`)
            lines.push(`${indent}}`)
            continue
          }
        }
      }
      lines.push(`${indent}${key}`)
      continue
    }

    // Object type
    if (type.kind === 'OBJECT' || type.kind === 'INPUT_OBJECT') {
      const nestedData = getNestedObjectData(value, fieldDef.type)
      if (nestedData && typeof nestedData === 'object') {
        const nested = buildSelections(
          nestedData as Record<string, unknown>,
          'fields' in type ? type.fields : [],
          schema,
          nextVisited,
          depth + 1,
          maxDepth,
          indent + '  ',
        )
        lines.push(`${indent}${key} {`)
        lines.push(nested)
        lines.push(`${indent}}`)
      } else {
        lines.push(`${indent}${key}`)
      }
      continue
    }

    lines.push(`${indent}${key}`)
  }

  return lines.join('\n')
}

function getNestedObjectData(
  value: unknown,
  typeRef: TypeRef,
): Record<string, unknown> | null {
  if (isList(typeRef)) {
    // For lists, use the first element as template
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      if (first && typeof first === 'object') return first as Record<string, unknown>
    }
    return null
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

export function buildDataForFragment(
  formData: Record<string, unknown>,
  typeName: string,
): Record<string, unknown> {
  return {
    __typename: typeName,
    ...formData,
  }
}
