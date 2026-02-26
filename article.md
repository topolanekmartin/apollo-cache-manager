# I Built a Chrome Extension to Tame the Apollo Client Cache

*Inspecting, mocking, and managing Apollo Client cache data in real-time — without touching your source code.*

---

If you work with Apollo Client and GraphQL, you know the feeling. You open Apollo DevTools, stare at the normalized cache, and try to figure out what is actually stored there. Or worse — you need to test how your UI behaves with a slightly different cache state, and you find yourself writing temporary `writeFragment` calls, hardcoded mock data, or entire test fixtures just to see what happens when one field changes.

I got tired of that workflow. So I built **Apollo Cache Manager** — a Chrome DevTools extension that lets you inspect, edit, and mock Apollo Client cache data in real-time, directly from the browser.

## The Problem

Apollo Client's normalized cache is powerful. It deduplicates data, keeps your UI consistent, and avoids unnecessary network requests. But when it comes to debugging and testing, working with the cache is not exactly a smooth experience.

Here's what I kept running into:

- **Inspecting the cache was painful.** The raw `extract()` output is a flat key-value map full of `__ref` pointers. Navigating between related entities means jumping back and forth through a JSON blob.
- **Testing edge cases required code changes.** Want to see how the UI handles a missing field? A different enum value? A null reference? You either mock the entire API response or inject data directly into the cache from your source code.
- **Reproducing cache states was tedious.** When a QA engineer reports a bug tied to a specific cache state, recreating that state manually takes time. And once you refresh the page, it's gone.

## What Apollo Cache Manager Does

The extension adds a new tab to Chrome DevTools called **ACM**. When you open it on any page running Apollo Client, it automatically detects the client instance and pulls the current cache state.

From there, you get three core capabilities:

### Cache Inspection

All cache entries are displayed in a structured sidebar, grouped by type. You can search, filter, and click any entity to see its full data. References (`__ref` fields) are interactive — clicking one navigates you to the referenced entity, so you can trace relationships without digging through raw JSON.

### Cache Editing with Drafts

This is where it gets interesting. You can switch any entity into edit mode and modify its fields directly. The extension supports two editing modes:

- **Form mode** — if a GraphQL schema is available (auto-introspected or loaded manually), the extension renders a schema-aware form with proper inputs for scalars, enums, nested objects, and even union types.
- **JSON mode** — for quick raw edits when you just want to change a value fast.

Your changes are collected in a **Draft panel** — a staging area that shows all modified entities. Nothing touches the actual cache until you explicitly hit "Apply". This gives you full control. You can review, adjust, or discard changes before they take effect.

When applied, the extension writes the data to Apollo Client's cache using `writeFragment`, which means your entire UI reacts to the change immediately — just as it would with real server data.

### Scenarios

Once you've set up a useful cache state in the draft, you can save it as a **Scenario**. Scenarios are reusable, exportable, and importable. You can:

- Save a cache configuration and give it a descriptive name.
- Share scenarios with your team as JSON files.
- Replay a scenario with one click to instantly restore a specific cache state.

This is incredibly useful for testing edge cases repeatedly, sharing bug reproductions, or preparing demo states for presentations.

## How It Works Under the Hood

The extension follows a multi-layer architecture required by Chrome Extension Manifest V3:

```
DevTools Panel (React) <-> Background Service Worker <-> Content Script <-> Injected Bridge <-> Apollo Client
```

The key piece is the **Injected Bridge** — a script that runs in the page's JavaScript context (the `MAIN` world) and has direct access to the Apollo Client instance. It detects Apollo Client through multiple strategies — `window.__APOLLO_CLIENT__`, the `__APOLLO_CLIENTS__` array, or the `Symbol.for('apollo.devtools')` marker — so it works regardless of how your app exposes the client.

All communication between the panel UI and the bridge happens through message passing — `window.postMessage` between the page and content script, and `chrome.runtime` messaging between the content script and the DevTools panel. This keeps the architecture clean and respects Chrome's security boundaries.

For schema introspection, the extension uses a two-stage strategy: it first tries to run an introspection query through the Apollo Client itself, and if that fails (for example, due to auth middleware), it falls back to detecting the GraphQL endpoint from the link chain and fetching the schema directly. You can also load a schema manually from a URL, a JSON file, or an SDL file.

The DevTools panel itself is built with React 19, TypeScript, and Tailwind CSS. State management relies purely on React hooks — no external state libraries needed.

## Who Is It For?

- **Frontend developers** who work with Apollo Client daily and want faster cache debugging.
- **QA engineers** who need to reproduce specific application states without developer assistance.
- **Teams** who want to share and standardize cache state fixtures for testing or demos.

## Try It Out

Apollo Cache Manager is open-source under the MIT license. You can find the source code, installation instructions, and contribution guidelines on GitHub:

[github.com/topolanekmartin/apollo-cache-manager](https://github.com/topolanekmartin/apollo-cache-manager)

To install it, clone the repo, run `bun install && bun run build`, load the `dist/` folder as an unpacked extension in Chrome, and open DevTools on any page with Apollo Client. You'll see the **ACM** tab right away.

---

I built this extension because I needed it myself. Working on projects that rely heavily on Apollo Client's cache, I spent too much time on repetitive debugging tasks that could be done more efficiently. Apollo Cache Manager is the tool I wish I had from the start. I hope it helps you too.
