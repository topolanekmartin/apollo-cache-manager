export type TypeKind = 'SCALAR' | 'ENUM' | 'OBJECT' | 'INTERFACE' | 'UNION' | 'INPUT_OBJECT'

export interface TypeRef {
  kind: 'SCALAR' | 'ENUM' | 'OBJECT' | 'INTERFACE' | 'UNION' | 'INPUT_OBJECT' | 'LIST' | 'NON_NULL'
  name: string | null
  ofType: TypeRef | null
}

export interface FieldDef {
  name: string
  description: string | null
  type: TypeRef
  isDeprecated: boolean
}

export interface EnumValue {
  name: string
  description: string | null
  isDeprecated: boolean
}

export interface ScalarType {
  kind: 'SCALAR'
  name: string
  description: string | null
}

export interface EnumType {
  kind: 'ENUM'
  name: string
  description: string | null
  values: EnumValue[]
}

export interface ObjectType {
  kind: 'OBJECT'
  name: string
  description: string | null
  fields: FieldDef[]
  interfaces: string[]
  isConnection: boolean
  isEdge: boolean
  isNode: boolean
}

export interface InterfaceType {
  kind: 'INTERFACE'
  name: string
  description: string | null
  fields: FieldDef[]
  possibleTypes: string[]
}

export interface UnionType {
  kind: 'UNION'
  name: string
  description: string | null
  possibleTypes: string[]
}

export interface InputObjectType {
  kind: 'INPUT_OBJECT'
  name: string
  description: string | null
  fields: FieldDef[]
}

export type ParsedType =
  | ScalarType
  | EnumType
  | ObjectType
  | InterfaceType
  | UnionType
  | InputObjectType

export interface ParsedSchema {
  types: Map<string, ParsedType>
  queryType: string | null
  mutationType: string | null
  subscriptionType: string | null
}

// Utility to unwrap NonNull/List wrappers and get the base type name
export function getBaseTypeName(typeRef: TypeRef): string {
  if (typeRef.name) return typeRef.name
  if (typeRef.ofType) return getBaseTypeName(typeRef.ofType)
  return 'Unknown'
}

export function isNonNull(typeRef: TypeRef): boolean {
  return typeRef.kind === 'NON_NULL'
}

export function isList(typeRef: TypeRef): boolean {
  if (typeRef.kind === 'LIST') return true
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) return isList(typeRef.ofType)
  return false
}

export function getTypeDisplayName(typeRef: TypeRef): string {
  switch (typeRef.kind) {
    case 'NON_NULL':
      return typeRef.ofType ? `${getTypeDisplayName(typeRef.ofType)}!` : 'Unknown!'
    case 'LIST':
      return typeRef.ofType ? `[${getTypeDisplayName(typeRef.ofType)}]` : '[Unknown]'
    default:
      return typeRef.name ?? 'Unknown'
  }
}
