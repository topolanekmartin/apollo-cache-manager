# Delete Entity & Parameterized Cache Keys — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add entity deletion from Apollo cache and fix nested structure display by mapping parameterized cache keys to schema field names.

**Architecture:** Two independent features. Feature 1 wires existing bridge evict support to a new UI button in EntityDetail. Feature 2 creates a utility to strip Apollo's parameterized field keys (e.g., `favorites:{"ws":"abc"}` → `favorites`) and integrates it into both the form data adapter and preview rendering.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Chrome Extension APIs, Apollo Client cache

---

### Task 1: Wire up `onEvict` in CacheTab and pass to EntityDetail

**Files:**
- Modify: `src/panel/components/CacheTab.tsx`
- Modify: `src/panel/components/EntityDetail.tsx`

**Step 1: Update CacheTab to use onEvict**

In `src/panel/components/CacheTab.tsx`:

1. Remove the suppressed `_onEvict` and `_onResetCache` aliases (lines 31, 43-44). Use `onEvict` directly.
2. Add state for toast and a confirm dialog trigger.
3. Create `handleEvict` callback that:
   - Calls `onEvict(entityKey)`
   - On success: calls `draft.removeDraftEntity(entityKey)`, calls `onRefresh()`, calls `onSelectEntity(null)`, sets toast "Entity evicted"
4. Pass `onEvict={handleEvict}` to `EntityDetail`.

Replace lines 31-32 and 43-44:
```tsx
// Before:
  onEvict: _onEvict,
  onResetCache: _onResetCache,
// ...
  void _onEvict
  void _onResetCache

// After:
  onEvict,
  onResetCache: _onResetCache,
// ...
  void _onResetCache
```

Add the evict handler after `handleApplyDraft`:
```tsx
const handleEvict = useCallback(async (entityKey: string) => {
  const success = await onEvict(entityKey)
  if (success) {
    draft.removeDraftEntity(entityKey)
    await onRefresh()
    onSelectEntity(null)
    setToast('Entity evicted')
  }
}, [onEvict, draft, onRefresh, onSelectEntity])
```

Pass to EntityDetail:
```tsx
<EntityDetail
  entityKey={selectedEntityKey}
  cacheData={cacheData}
  schema={schema}
  draft={draft}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  onRequestDisableEditMode={handleRequestDisableEditMode}
  onSelectEntity={handleSelectEntity}
  onEvict={handleEvict}
/>
```

**Step 2: Add onEvict prop and delete button to EntityDetail**

In `src/panel/components/EntityDetail.tsx`:

1. Add `onEvict: (entityKey: string) => Promise<void>` to `EntityDetailProps` interface.
2. Add `const [showEvictConfirm, setShowEvictConfirm] = useState(false)` state.
3. Import `ConfirmDialog` from `./ConfirmDialog`.
4. Add a red trash button in the header (after the Edit toggle label):

```tsx
<button
  onClick={() => setShowEvictConfirm(true)}
  className="px-1.5 py-0.5 text-sm text-panel-error hover:text-panel-error/80 transition-colors"
  title="Evict from cache"
>
  🗑
</button>
```

5. Add ConfirmDialog at the bottom of the component return (before closing `</div>`):

```tsx
{showEvictConfirm && (
  <ConfirmDialog
    title="Evict entity"
    message={`Remove "${entityKey}" from Apollo cache? This will also run garbage collection.`}
    confirmLabel="Evict"
    onConfirm={() => {
      setShowEvictConfirm(false)
      onEvict(entityKey)
    }}
    onCancel={() => setShowEvictConfirm(false)}
  />
)}
```

**Step 3: Verify**

Run: `npm run typecheck`
Expected: No type errors

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/panel/components/CacheTab.tsx src/panel/components/EntityDetail.tsx
git commit -m "feat: add entity eviction button to EntityDetail header"
```

---

### Task 2: Create `stripFieldArguments` utility

**Files:**
- Create: `src/panel/utils/stripFieldArguments.ts`

**Step 1: Write the utility**

Create `src/panel/utils/stripFieldArguments.ts`:

```ts
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
```

**Step 2: Verify**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/panel/utils/stripFieldArguments.ts
git commit -m "feat: add stripFieldArguments utility for parameterized cache keys"
```

---

### Task 3: Integrate key mapping into `cacheDataToFormData`

**Files:**
- Modify: `src/panel/utils/cacheDataAdapter.ts`

**Step 1: Update cacheDataToFormData**

In `src/panel/utils/cacheDataAdapter.ts`, import `stripFieldArguments` and modify the function to find parameterized key matches for schema fields.

```ts
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
```

**Step 2: Verify**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/panel/utils/cacheDataAdapter.ts
git commit -m "feat: map parameterized cache keys to schema fields in form adapter"
```

---

### Task 4: Update EntityDetail preview to use stripped keys and deeper rendering

**Files:**
- Modify: `src/panel/components/EntityDetail.tsx`

**Step 1: Import and use stripFieldArguments in preview rendering**

In `src/panel/components/EntityDetail.tsx`:

1. Import: `import { stripFieldArguments } from '../utils/stripFieldArguments'`
2. In the preview form view (the `Object.entries(displayData)` block around line 349), use stripped key for display and show full key as tooltip.
3. Increase `renderValue` depth limit from 2 to 4 (line 201: `if (depth > 2)` → `if (depth > 4)`).

Update the preview form view rendering (around lines 347-360):

```tsx
{displayData && (
  <div className="ml-3 border-l border-panel-border/50 pl-2">
    {Object.entries(displayData as Record<string, unknown>).map(([k, v]) => {
      const displayKey = stripFieldArguments(k)
      const isParameterized = displayKey !== k

      return (
        <div key={k} className="flex items-start gap-1 text-sm py-px">
          {modifiedFields.has(k) && (
            <span className="w-1.5 h-1.5 rounded-full bg-panel-warning flex-shrink-0 mt-1" />
          )}
          <span
            className="text-panel-text-muted shrink-0"
            title={isParameterized ? k : undefined}
          >
            {displayKey}:
          </span>
          <span className="min-w-0">{renderValue(v, 1)}</span>
        </div>
      )
    })}
  </div>
)}
```

Update depth limit in `renderValue` (line 201):
```tsx
// Before:
if (depth > 2) {

// After:
if (depth > 4) {
```

Also update the array depth check (line 219):
```tsx
// Before:
if (depth > 2) {

// After:
if (depth > 4) {
```

**Step 2: Verify**

Run: `npm run typecheck`
Expected: No type errors

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/panel/components/EntityDetail.tsx
git commit -m "feat: display stripped field names in preview and increase nesting depth"
```

---

### Task 5: Final build verification

**Step 1: Full typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: Both pass without errors

**Step 2: Manual testing checklist**

Load the extension in Chrome and verify:
- [ ] Entity detail header shows red trash button
- [ ] Clicking trash opens confirm dialog
- [ ] Confirming evicts entity from cache and refreshes list
- [ ] Entity is removed from draft if it was being edited
- [ ] Preview form view shows `favorites` instead of `favorites:{"workspaceId":"..."}`
- [ ] Hovering stripped field name shows full parameterized key as tooltip
- [ ] Edit form pre-populates connection fields (edges, pageInfo) with existing cache data
- [ ] Nested structures (connection→edges→node) render deeper in preview
