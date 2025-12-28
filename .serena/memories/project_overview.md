# Project Overview: electron-progress-window

## Purpose
`electron-progress-window` is a TypeScript library for displaying single or multiple progress bars in an Electron application. It provides a comprehensive solution for showing progress indicators in a dedicated window with features like:
- Multiple progress bars in a single window
- Dynamic adding/removing of progress items
- Determinate and indeterminate progress modes
- Pause/resume and cancel functionality
- Automatic window resizing
- Full TypeScript support with event emitters
- Customizable styling via CSS variables

## Tech Stack
- **Language**: TypeScript (strict mode enabled)
- **Target Environment**: Electron (peer dependency)
- **Build System**: TypeScript compiler with dual module output (CommonJS + ESM)
- **Testing**:
  - Unit tests: Mocha + Chai + Sinon
  - E2E tests: Playwright
  - Coverage: nyc
- **Linting**: ESLint with TypeScript and Prettier integration
- **Documentation**: API Extractor + API Documenter
- **Release**: Semantic Release with conventional commits

## Module Structure
The library exports both CommonJS and ESM formats:
- Main entry: `dist/cjs/index.js` (CommonJS)
- ESM entry: `dist/esm/index.js`
- Type definitions: `dist/cjs/index.d.ts`

## Core Architecture
The codebase is organized around two main classes in `src/ProgressWindow/`:

1. **ProgressWindow** (`ProgressWindow.ts`):
   - Main class for managing the progress window
   - Singleton pattern with static instance management
   - Manages BrowserWindow creation and lifecycle
   - Handles adding/removing progress items
   - Implements both static and instance event emitters
   - Configurable via `configure()` method for setting defaults

2. **ProgressItem** (`ProgressItem.ts`):
   - Represents individual progress bars
   - Event emitter for progress, pause, cancel events
   - Properties: title, detail, value, maxValue, theme, etc.
   - State management: paused, cancelled, completed, visible
   - CSS customization via CSS variables

3. **Renderer** (`renderer.ts`, `preload.ts`, `index.html`):
   - Browser window rendering logic
   - IPC communication between main and renderer processes
   - Preload script for secure context bridging

## Testing Strategy
- **Unit tests** (`test/*.test.ts`): Uses electron-mocks to test without a real Electron environment
- **E2E tests** (`e2e/*.spec.ts`): Uses Playwright with real Electron app (via playground example)
- Tests use helper utilities in `test/withTimeout.ts` and `test/pause.ts`
