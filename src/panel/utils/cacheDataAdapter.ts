import type { FieldDef, ParsedSchema } from '../types/schema'
import { getDefaultValueForType } from './defaultValues'

/**
 * Converts a cache entry's data into form-compatible data by aligning it
 * with the schema's field definitions. Existing values are preserved as-is,
 * missing fields get defaults, and extra fields not in the schema are kept.
 */
export function cacheDataToFormData(
  cacheEntry: Record<string, unknown>,
  fields: FieldDef[],
  schema: ParsedSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Copy extra fields not in the schema (preserves data visible in JSON mode)
  for (const key of Object.keys(cacheEntry)) {
    if (key === '__typename') continue
    result[key] = cacheEntry[key]
  }

  // Ensure every schema field exists, filling defaults for missing ones
  for (const field of fields) {
    if (field.name === '__typename') continue
    if (field.name in cacheEntry) {
      result[field.name] = cacheEntry[field.name]
    } else {
      result[field.name] = getDefaultValueForType(field.type, schema)
    }
  }

  return result
}
