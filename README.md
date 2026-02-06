<p align="center">
  <img src="public/icons/logo.svg" alt="Apollo Cache Manager" width="128" height="128" />
</p>

<h1 align="center">Apollo Cache Manager</h1>

<p align="center">
  A Chrome DevTools extension for inspecting, mocking, and managing Apollo Client cache in real-time.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://github.com/topolanekmartin/apollo-cache-manager/releases"><img src="https://img.shields.io/github/v/release/topolanekmartin/apollo-cache-manager" alt="Version" /></a>
  <a href="https://github.com/topolanekmartin/apollo-cache-manager/stargazers"><img src="https://img.shields.io/github/stars/topolanekmartin/apollo-cache-manager" alt="Stars" /></a>
</p>

---

## Features

**Cache Viewer** - Browse all Apollo Client cache entries in a structured tree view. Search, filter, expand nested objects, and inspect references. Edit values inline or evict individual entries.

**Fragment Composer** - Build GraphQL fragments visually with full schema awareness. Select types from the schema explorer sidebar, fill in field values with smart inputs, and write mock data directly to the cache.

**Schema Explorer** - Auto-introspects your GraphQL schema via Apollo Client or manual endpoint configuration. Browse types, fields, enums, and unions in a collapsible sidebar.

**Presets** - Save cache mock configurations as reusable presets. Export/import presets as JSON to share with your team. Apply presets with one click to restore cache states.

**Auto-detection** - Automatically detects Apollo Client instances on the page, including apps using `connectToDevTools`, `__APOLLO_CLIENT__`, and the Apollo DevTools symbol.

## Installation

### Chrome Web Store

<!-- TODO: Add Chrome Web Store link after publishing -->
Install from the [Chrome Web Store](https://chrome.google.com/webstore) (coming soon).

### Manual Installation (Developer Mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/topolanekmartin/apollo-cache-manager.git
   cd apollo-cache-manager
   ```

2. Install dependencies and build:
   ```bash
   bun install
   bun run build
   ```

3. Open Chrome and navigate to `chrome://extensions`

4. Enable **Developer mode** (toggle in the top right)

5. Click **Load unpacked** and select the `dist/` folder

6. Open DevTools (F12) on any page with Apollo Client - you'll see the **Apollo Cache Manager** tab

## Usage

1. **Open DevTools** on a page that uses Apollo Client
2. Navigate to the **Apollo Cache Manager** tab
3. The **Cache** tab shows all current cache entries - click any entry to expand and inspect
4. Switch to the **Mock** tab to create mock data using the fragment composer (schema auto-introspects)
5. Use the **Presets** tab to save and restore cache configurations

## Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+) or Node.js (v18+)

### Setup

```bash
# Clone the repo
git clone https://github.com/topolanekmartin/apollo-cache-manager.git
cd apollo-cache-manager

# Install dependencies
bun install

# Start development build (watches for changes)
bun run dev

# Production build
bun run build

# Build Chrome Web Store ZIP
bun run build:zip

# Type checking
bun run typecheck
```

### Architecture

The extension follows a multi-layer Chrome Extension (MV3) architecture:

```
Panel (React UI) <-> Background (Service Worker) <-> Content Script <-> Injected Bridge <-> Apollo Client
```

- **Panel** (`src/panel/`) - React UI with Tailwind CSS, runs in DevTools
- **Background** (`src/background/`) - Service worker routing messages between panel and content scripts
- **Content** (`src/content/`) - Relays messages between the injected script and the extension
- **Injected Bridge** (`src/injected/`) - Runs in the page's MAIN world with direct Apollo Client access

### Tech Stack

- React 19, TypeScript 5.7, Tailwind CSS 4, Vite 6
- GraphQL (introspection & fragment parsing)
- Chrome Extension APIs (Manifest V3)

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

## License

[MIT](LICENSE) - Martin Topolanek
