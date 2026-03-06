import type { FieldDef, ParsedSchema, TypeRef } from '../types/schema'
import { getDefaultValueForType } from './defaultValues'
import { stripFieldArguments } from './stripFieldArguments'

/**
 * Infers a TypeRef from a runtime cache value.
 * Used to create synthetic FieldDefs for cache-only fields not in the schema.
 */
export function inferTypeFromValue(value: unknown, schema: ParsedSchema | null): TypeRef {
  if (value == null) return { kind: 'SCALAR', name: 'JSON', ofType: null }
  if (typeof value === 'string') return { kind: 'SCALAR', name: 'String', ofType: null }
  if (typeof value === 'number') return { kind: 'SCALAR', name: 'Float', ofType: null }
  if (typeof value === 'boolean') return { kind: 'SCALAR', name: 'Boolean', ofType: null }
  if (Array.isArray(value)) {
    const itemType =
      value.length > 0
        ? inferTypeFromValue(value[0], schema)
        : { kind: 'SCALAR' as const, name: 'JSON', ofType: null }
    return { kind: 'LIST', name: null, ofType: itemType }
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('__ref' in obj && typeof obj.__ref === 'string') {
      const typeName = (obj.__ref as string).split(':')[0]
      if (schema?.types.has(typeName)) return { kind: 'OBJECT', name: typeName, ofType: null }
    }
    if ('__typename' in obj && typeof obj.__typename === 'string') {
      return { kind: 'OBJECT', name: obj.__typename as string, ofType: null }
    }
    return { kind: 'SCALAR', name: 'JSON', ofType: null }
  }
  return { kind: 'SCALAR', name: 'JSON', ofType: null }
}

/**
 * Converts a cache entry's data into form-compatible data by aligning it
 * with the schema's field definitions. Existing values are preserved as-is,
 * missing fields get defaults, and extra fields not in the schema are kept.
 *
 * Handles Apollo's parameterized cache keys (e.g., "favorites:{"ws":"abc"}")
 * by mapping them to their base field names for schema matching.
 */
export function cacheDataToFormData(
  cacheEntry: Record<string, unknown>,
  fields: FieldDef[],
  schema: ParsedSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Build a lookup: stripped key → original key, for parameterized field matching
  const strippedKeyMap = new Map<string, string>()
  for (const key of Object.keys(cacheEntry)) {
    const stripped = stripFieldArguments(key)
    if (stripped !== key && !strippedKeyMap.has(stripped)) {
      strippedKeyMap.set(stripped, key)
    }
  }

  // Build set of schema field names for quick lookup
  const schemaFieldNames = new Set(fields.map((f) => f.name))

  // Copy extra fields not in the schema (preserves data visible in JSON mode)
  // Skip parameterized keys whose stripped version matches a schema field
  // (those will be added under the clean name in the next loop)
  for (const key of Object.keys(cacheEntry)) {
    if (key === '__typename') continue
    const stripped = stripFieldArguments(key)
    if (stripped !== key && schemaFieldNames.has(stripped)) continue
    result[key] = cacheEntry[key]
  }

  // Ensure every schema field exists, filling defaults for missing ones
  for (const field of fields) {
    if (field.name === '__typename') continue

    if (field.name in cacheEntry) {
      // Direct match
      result[field.name] = cacheEntry[field.name]
    } else if (strippedKeyMap.has(field.name)) {
      // Parameterized key match: "favorites:{"ws":"abc"}" → "favorites"
      const originalKey = strippedKeyMap.get(field.name)!
      result[field.name] = cacheEntry[originalKey]
    } else {
      result[field.name] = getDefaultValueForType(field.type, schema)
    }
  }

  return result
}
