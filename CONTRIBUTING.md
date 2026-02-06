# Contributing to Apollo Cache Manager

Thanks for your interest in contributing! This guide will help you get started.

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/topolanekmartin/apollo-cache-manager/issues/new?template=bug_report.md) with:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
- Screenshots if applicable

### Suggesting Features

Have an idea? [Open a feature request](https://github.com/topolanekmartin/apollo-cache-manager/issues/new?template=feature_request.md) and describe:

- What problem it solves
- How you envision it working
- Any alternatives you've considered

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Test the extension manually:
   - Run `bun run build`
   - Load the `dist/` folder as an unpacked extension in Chrome
   - Verify all three tabs (Cache, Mock, Presets) work correctly
5. Run type checking:
   ```bash
   bun run typecheck
   ```
6. Commit with a clear message describing the change
7. Push and open a PR against `main`

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/apollo-cache-manager.git
cd apollo-cache-manager

# Install dependencies
bun install

# Start dev build (watches for changes)
bun run dev

# Load dist/ folder in chrome://extensions (Developer mode)
```

## Code Style

- TypeScript with strict mode
- React functional components with hooks
- Tailwind CSS for styling (no CSS modules or styled-components)
- No semicolons (project uses no-semicolon style)
- Single quotes for strings
- Use existing patterns in the codebase as reference

## Project Structure

```
src/
  background/    # Service worker (message routing)
  content/       # Content script (page <-> extension relay)
  injected/      # Bridge script (direct Apollo Client access)
  panel/         # React DevTools panel UI
    components/  # UI components
    hooks/       # Custom React hooks
    types/       # TypeScript type definitions
    utils/       # Utility functions
  shared/        # Shared types between all layers
```

## Questions?

Feel free to open an issue for any questions about contributing.
