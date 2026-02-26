import type { FieldDef, ParsedSchema } from '../types/schema'
import { getDefaultValueForType } from './defaultValues'
import { stripFieldArguments } from './stripFieldArguments'

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

  // Copy extra fields not in the schema (preserves data visible in JSON mode)
  for (const key of Object.keys(cacheEntry)) {
    if (key === '__typename') continue
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
