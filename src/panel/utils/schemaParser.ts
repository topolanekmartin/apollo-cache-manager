import type { IntrospectionQuery } from 'graphql'
import type {
  ParsedSchema,
  ParsedType,
  FieldDef,
  TypeRef,
  EnumValue,
  ObjectType,
} from '../types/schema'

function mapTypeRef(introspectionType: {
  kind: string
  name: string | null
  ofType?: unknown
}): TypeRef {
  const ofType = introspectionType.ofType as typeof introspectionType | null
  return {
    kind: introspectionType.kind as TypeRef['kind'],
    name: introspectionType.name,
    ofType: ofType ? mapTypeRef(ofType) : null,
  }
}

function mapFields(
  fields: ReadonlyArray<{
    name: string
    description?: string | null
    type: { kind: string; name: string | null; ofType?: unknown }
    isDeprecated: boolean
  }> | null,
): FieldDef[] {
  if (!fields) return []
  return fields.map((f) => ({
    name: f.name,
    description: f.description ?? null,
    type: mapTypeRef(f.type),
    isDeprecated: f.isDeprecated,
  }))
}

function isConnectionType(fields: FieldDef[]): boolean {
  const fieldNames = fields.map((f) => f.name)
  return fieldNames.includes('edges') && fieldNames.includes('pageInfo')
}

function isEdgeType(fields: FieldDef[]): boolean {
  const fieldNames = fields.map((f) => f.name)
  return fieldNames.includes('node') && fieldNames.includes('cursor')
}

function isNodeType(interfaces: string[]): boolean {
  return interfaces.includes('Node')
}

export function parseIntrospectionSchema(introspection: IntrospectionQuery): ParsedSchema {
  const schema = introspection.__schema
  const types = new Map<string, ParsedType>()

  for (const type of schema.types) {
    // Skip internal types
    if (type.name.startsWith('__')) continue

    switch (type.kind) {
      case 'SCALAR':
        types.set(type.name, {
          kind: 'SCALAR',
          name: type.name,
          description: type.description ?? null,
        })
        break

      case 'ENUM': {
        const values: EnumValue[] = ('enumValues' in type && type.enumValues
          ? type.enumValues.map((v) => ({
              name: v.name,
              description: v.description ?? null,
              isDeprecated: v.isDeprecated,
            }))
          : [])
        types.set(type.name, {
          kind: 'ENUM',
          name: type.name,
          description: type.description ?? null,
          values,
        })
        break
      }

      case 'OBJECT': {
        const fields = 'fields' in type ? mapFields(type.fields as never) : []
        const interfaces =
          'interfaces' in type && type.interfaces
            ? (type.interfaces as ReadonlyArray<{ name: string }>).map((i) => i.name)
            : []

        const objectType: ObjectType = {
          kind: 'OBJECT',
          name: type.name,
          description: type.description ?? null,
          fields,
          interfaces,
          isConnection: isConnectionType(fields),
          isEdge: isEdgeType(fields),
          isNode: isNodeType(interfaces),
        }
        types.set(type.name, objectType)
        break
      }

      case 'INTERFACE': {
        const fields = 'fields' in type ? mapFields(type.fields as never) : []
        const possibleTypes =
          'possibleTypes' in type && type.possibleTypes
            ? (type.possibleTypes as ReadonlyArray<{ name: string }>).map((t) => t.name)
            : []
        types.set(type.name, {
          kind: 'INTERFACE',
          name: type.name,
          description: type.description ?? null,
          fields,
          possibleTypes,
        })
        break
      }

      case 'UNION': {
        const possibleTypes =
          'possibleTypes' in type && type.possibleTypes
            ? (type.possibleTypes as ReadonlyArray<{ name: string }>).map((t) => t.name)
            : []
        types.set(type.name, {
          kind: 'UNION',
          name: type.name,
          description: type.description ?? null,
          possibleTypes,
        })
        break
      }

      case 'INPUT_OBJECT': {
        const fields = 'inputFields' in type ? mapFields(type.inputFields as never) : []
        types.set(type.name, {
          kind: 'INPUT_OBJECT',
          name: type.name,
          description: type.description ?? null,
          fields,
        })
        break
      }
    }
  }

  return {
    types,
    queryType: schema.queryType?.name ?? null,
    mutationType: schema.mutationType?.name ?? null,
    subscriptionType: schema.subscriptionType?.name ?? null,
  }
}
