/**
 * Strips Apollo cache parameterized field arguments from a key.
 *
 * Apollo stores fields with arguments in two formats:
 * - Field policies with keyArgs: "favorites:{"workspaceId":"abc"}"
 * - Default (no field policy):  "notifications({"first":10})"
 *
 * This function returns the base field name:
 * - "favorites:{"workspaceId":"abc"}" → "favorites"
 * - "notifications({"first":10})"     → "notifications"
 * - "normalField"                     → "normalField"
 * - "__typename"                      → "__typename"
 */
export function stripFieldArguments(key: string): string {
  // Format 1: field({"arg":"val"}) — parenthesized arguments
  const parenIndex = key.indexOf('(')
  if (parenIndex > 0 && key[parenIndex + 1] === '{') {
    return key.slice(0, parenIndex)
  }

  // Format 2: field:{"arg":"val"} — colon + JSON object
  // Must distinguish from entity cache IDs like "User:123"
  // Parameterized keys have :{ while entity IDs have :alphanumeric
  const colonBraceIndex = key.indexOf(':{')
  if (colonBraceIndex > 0) {
    return key.slice(0, colonBraceIndex)
  }

  return key
}

/**
 * Given a cache entity's data object, returns a new object where
 * parameterized keys are mapped to their base field names.
 *
 * If a base field name already exists as a direct key, the direct key
 * takes priority and the parameterized variant is skipped.
 *
 * Original parameterized keys are preserved alongside the mapped ones
 * so that cache write operations can still use the full key.
 */
export function normalizeEntityFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // First pass: copy all entries as-is
  for (const [key, value] of Object.entries(data)) {
    result[key] = value
  }

  // Second pass: add stripped aliases for parameterized keys
  for (const key of Object.keys(data)) {
    const stripped = stripFieldArguments(key)
    if (stripped !== key && !(stripped in result)) {
      result[stripped] = data[key]
    }
  }

  return result
}
