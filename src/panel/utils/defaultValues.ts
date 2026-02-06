import type { TypeRef, ParsedSchema, ParsedType, FieldDef } from '../types/schema'
import { getBaseTypeName, isList } from '../types/schema'

const SCALAR_DEFAULTS: Record<string, unknown> = {
  String: '',
  Int: 0,
  Float: 0.0,
  Boolean: false,
  ID: '',
  Date: new Date().toISOString().split('T')[0],
  DateTime: new Date().toISOString(),
  Time: '12:00:00',
  JSON: '{}',
  JSONObject: '{}',
  BigInt: '0',
  Long: 0,
  Decimal: '0.00',
  URL: 'https://example.com',
  URI: 'https://example.com',
  Email: 'user@example.com',
  UUID: '00000000-0000-0000-0000-000000000000',
}

export function getScalarDefault(typeName: string): unknown {
  return SCALAR_DEFAULTS[typeName] ?? ''
}

export function getDefaultValueForType(
  typeRef: TypeRef,
  schema: ParsedSchema,
  visited = new Set<string>(),
  depth = 0,
  maxDepth = 2,
): unknown {
  const baseName = getBaseTypeName(typeRef)

  if (isList(typeRef)) {
    return []
  }

  const type = schema.types.get(baseName)
  if (!type) {
    return getScalarDefault(baseName)
  }

  return getDefaultForParsedType(type, schema, visited, depth, maxDepth)
}

export function getDefaultForParsedType(
  type: ParsedType,
  schema: ParsedSchema,
  visited = new Set<string>(),
  depth = 0,
  maxDepth = 2,
): unknown {
  switch (type.kind) {
    case 'SCALAR':
      return getScalarDefault(type.name)

    case 'ENUM':
      return type.values.length > 0 ? type.values[0].name : ''

    case 'OBJECT':
    case 'INPUT_OBJECT': {
      if (visited.has(type.name) || depth >= maxDepth) {
        return null
      }

      const nextVisited = new Set(visited)
      nextVisited.add(type.name)

      const obj: Record<string, unknown> = { __typename: type.name }
      for (const field of type.fields) {
        if (field.name === '__typename') continue
        obj[field.name] = getDefaultValueForType(
          field.type,
          schema,
          nextVisited,
          depth + 1,
          maxDepth,
        )
      }
      return obj
    }

    case 'INTERFACE':
    case 'UNION': {
      if (type.possibleTypes.length === 0) return null
      const firstType = schema.types.get(type.possibleTypes[0])
      if (!firstType) return null
      return getDefaultForParsedType(firstType, schema, visited, depth, maxDepth)
    }

    default:
      return null
  }
}

export function buildEmptyFormData(
  fields: FieldDef[],
  schema: ParsedSchema,
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.name === '__typename') continue
    data[field.name] = getDefaultValueForType(field.type, schema)
  }
  return data
}
