# Apollo Cache Manager — Chrome Web Store Description

Apollo Cache Manager is a Chrome DevTools extension that gives you full control over your Apollo Client cache during development.

## What it does

- **Cache Inspector:** Browse all Apollo Client cache entries in a three-panel layout. Search, filter, and group entities by type. Click into any entity to inspect fields, follow cache references, and view nested data. Edit values inline using a schema-aware form or raw JSON editor.
- **Draft Editing:** Modify multiple cache entities before applying changes. Draft panel tracks all pending edits, letting you review, discard, or apply them in batch — or save them as a reusable scenario.
- **Scenarios:** Save cache states as named scenarios with descriptions. Apply a scenario with one click to restore a specific cache state. Export and import scenarios as JSON to share setups with your team.
- **Schema Loading:** Auto-introspects your GraphQL schema via Apollo Client with a two-stage fallback strategy. Alternatively, provide a custom endpoint URL or upload a schema file (JSON introspection or SDL).
- **Auto-detection:** Automatically detects Apollo Client instances on the page, including apps using connectToDevTools, __APOLLO_CLIENT__, and the Apollo DevTools symbol.

## How to use

- Open DevTools (F12) on any page with Apollo Client
- Navigate to the "Apollo Cache Manager" tab
- Browse the cache, edit entities, and manage scenarios

## Privacy

No data is collected. No remote servers. Everything runs locally in your browser.

## Open Source

https://github.com/nicetomyou/apollo-cache-manager
