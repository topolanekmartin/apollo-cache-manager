# Design: Delete Entity from Cache & Parameterized Cache Key Mapping

## Problem Statement

Two issues in the Apollo Cache Mocker extension:

1. **No way to delete individual entities from cache** - entities can only be edited, not evicted. The bridge layer already supports `EVICT_CACHE` but no UI triggers it.

2. **Nested structures not visible in entity views** - Apollo cache stores fields with query arguments in the key (e.g., `favorites:{"workspaceId":"abc"}` instead of `favorites`). This causes:
   - Preview form view: parameterized fields show with ugly key names or don't map to schema fields
   - Edit form view: schema-driven form can't find data under parameterized keys, so fields show as null/empty instead of pre-populated with existing cache data

## Feature 1: Delete Entity from Cache

### Approach
Add a trash icon button in the EntityDetail header that triggers `cache.evict()` + `gc()`.

### UI
- Red trash icon button in EntityDetail header, next to Edit toggle
- Always visible (works in both preview and edit mode)
- Click opens ConfirmDialog: "Evict {entityKey} from cache? This will also run garbage collection."

### Flow
1. User clicks trash icon
2. ConfirmDialog opens for confirmation
3. On confirm: send `EVICT_CACHE` message via bridge (already implemented in bridge.ts)
4. Bridge executes `client.cache.evict({ id: cacheId })` + `client.cache.gc()`
5. On success: remove entity from draft if present (`removeDraftEntity`), refresh cache data, select next entity or show empty state
6. Show Toast notification "Entity evicted"

### Edge Cases
- Entity in draft: also remove from draft via `removeDraftEntity`
- Last entity in list: show "Select an entity" placeholder
- Evict during edit mode: remove from draft, keep edit mode active if other draft entities exist

### Files to Modify
- `src/panel/components/EntityDetail.tsx` - add delete button + handler
- `src/panel/components/CacheTab.tsx` - wire up evict callback (currently suppressed with `suppressWithVoid`)

## Feature 2: Parameterized Cache Key Mapping

### Approach
Create a utility function to strip field arguments from cache keys, then apply it in data adapters and display logic.

### Utility Function

```ts
// stripFieldArguments.ts
// "favorites:{"workspaceId":"abc"}" → "favorites"
// "notifications({"first":10})" → "notifications"
// "normalField" → "normalField"
function stripFieldArguments(key: string): string
```

Handles two Apollo cache formats:
- `field:{"arg":"val"}` (field policies with keyArgs)
- `field({"arg":"val"})` (default without field policy)

### Where Mapping Applies

**1. `cacheDataToFormData` (edit mode pre-population)**
- When looking for schema field `favorites` in cache data:
  - Try direct match `cacheEntry["favorites"]` first
  - If not found, scan cache entry keys for one whose stripped version matches
  - Use found value to pre-populate the form
- Result: edit form shows existing cache data instead of empty defaults

**2. Preview form view in EntityDetail**
- When rendering `Object.entries(displayData)`: display stripped key as label
- Show full parameterized key as tooltip for debugging context

**3. `renderValue` depth enhancement**
- Increase depth limit from 2 to 3 for preview, so connection→edges→node structures render properly
- For `__ref` objects at depth limit: show clickable entity link instead of JSON string

### Data Flow

```
Cache extract (raw keys: "favorites:{"ws":"abc"}")
  ↓ stripFieldArguments mapping
Form data (clean keys: "favorites")
  ↓ TypeFieldForm renders with schema fields
UI (edit/preview with proper data)
```

### Edge Cases
- Multiple parameterized variants of same field: use first found match
- Both bare field and parameterized field exist: prioritize direct match
- Stripped key collides with existing key: keep original, skip parameterized

### Files to Modify
- New: `src/panel/utils/stripFieldArguments.ts` - utility function
- `src/panel/utils/cacheDataAdapter.ts` - use mapping in `cacheDataToFormData`
- `src/panel/components/EntityDetail.tsx` - use stripped keys in preview, increase renderValue depth
