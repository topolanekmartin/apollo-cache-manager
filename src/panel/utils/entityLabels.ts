import type { ParsedSchema } from '../types/schema'

const PRIORITY_FIELDS = ['name', 'title', 'label', 'displayName', 'username', 'email', 'slug', 'code']
const EXCLUDED_KEYS = new Set(['__typename', 'id', '__ref'])
const ROOT_KEYS = new Set(['ROOT_QUERY', 'ROOT_MUTATION', '__META'])

export function getEntityLabel(cacheId: string, entity: Record<string, unknown>): string {
  // Try priority fields first
  for (const field of PRIORITY_FIELDS) {
    const val = entity[field]
    if (val != null && typeof val !== 'object') {
      return `${val} (${cacheId})`
    }
  }

  // Fallback: first 2 non-excluded scalar field values
  const scalars: string[] = []
  for (const [key, val] of Object.entries(entity)) {
    if (EXCLUDED_KEYS.has(key)) continue
    if (val != null && typeof val !== 'object') {
      scalars.push(String(val))
      if (scalars.length >= 2) break
    }
  }

  if (scalars.length > 0) {
    return `${scalars.join(', ')} (${cacheId})`
  }

  // Last resort: just the cache ID
  return cacheId
}

interface EntityOption {
  cacheId: string
  entity: Record<string, unknown>
  label: string
}

export function getEntitiesForType(
  cacheData: Record<string, unknown> | null,
  typeName: string,
  schema: ParsedSchema,
): EntityOption[] {
  if (!cacheData) return []

  // Collect all valid typenames for this type (including possibleTypes for INTERFACE/UNION)
  const validTypes = new Set<string>()
  validTypes.add(typeName)

  const type = schema.types.get(typeName)
  if (type && ('possibleTypes' in type)) {
    for (const pt of type.possibleTypes) {
      validTypes.add(pt)
    }
  }

  const results: EntityOption[] = []

  for (const [id, data] of Object.entries(cacheData)) {
    if (ROOT_KEYS.has(id)) continue
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue

    const entry = data as Record<string, unknown>
    const entryTypename = (entry.__typename as string) ?? id.split(':')[0]

    if (!entryTypename || !validTypes.has(entryTypename)) continue

    results.push({
      cacheId: id,
      entity: entry,
      label: getEntityLabel(id, entry),
    })
  }

  results.sort((a, b) => a.label.localeCompare(b.label))
  return results
}
