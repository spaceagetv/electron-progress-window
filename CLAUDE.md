# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`electron-progress-window` is a TypeScript library for displaying single or multiple progress bars in an Electron application. It provides a comprehensive solution for showing progress indicators in a dedicated window with features like:
- Multiple progress bars in a single window
- Dynamic adding/removing of progress items
- Determinate and indeterminate progress modes
- Pause/resume and cancel functionality
- Automatic window resizing
- Full TypeScript support with typed event emitters

## Build Commands

```bash
# Build both CommonJS and ESM outputs
npm run build

# Build specific module formats
npm run build:cjs    # CommonJS only
npm run build:esm    # ESM only

# Type checking (useful before commits)
npm run type-check
```

**Important**: The build process includes a `post-build.js` script that preserves `preload.d.ts` in the dist folder. This is critical for proper type exports.

## Testing Commands

```bash
# Unit tests (Vitest)
npm test
npm run test:coverage

# E2E tests (Playwright with Electron)
npm run test:e2e

# Run specific E2E test with grep
npm run test:e2e -- --grep "should pause and resume"
```

**E2E Test Architecture**:
- E2E tests launch the playground example app (examples/playground) via Playwright
- The `test.beforeAll` hook builds both the main library AND the playground app
- A single Electron instance is reused across all tests (see beforeAll/afterAll)
- Each test cleans up progress windows in beforeEach, keeping only the main window
- `EPW_BUNDLED=1 npm run test:e2e` builds the playground's main process with
  esbuild instead of tsc, inlining this library into one file the way a
  consuming app packed with webpack/vite/forge would. CI runs this as one extra
  `bundled: true` entry in the e2e matrix. It is the runtime half of the
  bundler-safety guarantee whose build-time half lives in `post-build.js`: that
  script fails the build if any asset is still read off disk relative to
  `__dirname`, and this proves the result actually runs once bundled.

## Linting

```bash
npm run lint        # Check for errors
npm run lint:fix    # Auto-fix errors and format code
```

Prettier is integrated with ESLint, so `lint:fix` handles both linting and formatting.

Config lives in `eslint.config.mjs` (ESLint 10 flat config). It is `.mjs` rather than
`.js` because the root `package.json` has no `"type": "module"`. The `eslint:recommended`
layer comes from the explicit `@eslint/js` devDependency — ESLint 10 no longer bundles it.

## Code Style

- **No semicolons** (Prettier config)
- **Single quotes** for strings
- **2-space indentation**
- **ES private fields**: Use `#` prefix for private class fields (e.g., `#options`, `#ready`)
- **TypeScript strict mode**: All strict checks enabled, including `noUncheckedIndexedAccess`
- **TSDoc required**: Public APIs must have TSDoc comments (validated by ESLint)

## Core Architecture

### Dual-Package Structure

The library exports both CommonJS and ESM:
- Main: `dist/cjs/index.js` (CommonJS)
- Module: `dist/esm/index.js` (ESM)
- Types: per-condition, via the `exports` map — `dist/esm/index.d.ts` for
  `import`, `dist/cjs/index.d.ts` for `require`

Built via separate tsconfig files: `tsconfig.cjs.json` and `tsconfig.esm.json`.
`post-build.js` then writes `dist/cjs/package.json` (`{"type":"commonjs"}`) and
`dist/esm/package.json` (`{"type":"module"}`). Without those markers Node reads
the root `package.json`, which has no `"type"`, and parses the ESM build as
CommonJS — `SyntaxError: Unexpected token 'export'`.

**Every relative import in `src/` must carry an explicit `.js` extension**
(`import { deepMerge } from './utils.js'`), even though the source file is
`.ts`. Node's ESM loader requires it. The ESM build uses
`moduleResolution: "bundler"`, which permits extensionless specifiers, so
`tsc`, ESLint and the test suite will all happily pass on a missing one and the
package will then fail to load in a consumer's app. `post-build.js` verifies
every emitted relative specifier resolves and fails the build if one does not —
that check is the only thing standing between a dropped extension and a broken
publish, so don't remove it.

`moduleResolution` cannot simply be switched to `nodenext` here: without a root
`"type": "module"`, `nodenext` classifies the sources as CommonJS and emits
`require()` into `dist/esm`.

### Main Classes (src/ProgressWindow/)

**ProgressWindow** (`ProgressWindow.ts`):
- Singleton pattern with static instance management via `instance()` method
- Manages BrowserWindow creation and lifecycle
- Handles adding/removing progress items via `addItem()` and `removeItem()`
- Both static and instance event emitters (see `staticEvents` and instance events)
- Configurable defaults via `configure()` method

**ProgressItem** (`ProgressItem.ts`):
- Represents individual progress bars
- Event emitter for `progress`, `pause`, `cancel`, `completed` events
- State management: paused, cancelled, completed, visible
- CSS customization via `cssVars` property (maps to CSS variables)
- Getter/setter pattern for properties (e.g., `title()`, `value()`, `maxValue()`)

### IPC Communication Pattern

The codebase uses a secure IPC bridge pattern:

1. **Main Process** (`ProgressWindow.ts`):
   - Listens for IPC events: `progress-item-cancel`, `progress-item-pause`, `progress-update-content-size`
   - Sends IPC events: `progress-item-add`, `progress-item-update`, `progress-item-remove`

2. **Preload Script** (`preload.ts`):
   - Uses `contextBridge.exposeInMainWorld()` to expose safe API
   - Prevents memory leaks by replacing listeners instead of accumulating them
   - Exposes `window.progressWindowAPI` with methods: `cancelItem`, `togglePauseItem`, `updateContentSize`, `onItemAdd`, `onItemUpdate`, `onItemRemove`

3. **Renderer Process** (`renderer.ts`):
   - Accesses `window.progressWindowAPI` to communicate with main process
   - Updates DOM based on item changes
   - Sends user actions (pause, cancel) back to main

**Key Pattern**: Data flows from Main → Preload → Renderer via IPC events. User actions flow back Renderer → Preload → Main.

### Event Emitter Pattern

The codebase uses a custom typed event emitter pattern:

```typescript
interface TypedEventEmitter<T> {
  on<K extends keyof T>(event: K, listener: T[K]): void
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void
}
```

Both `ProgressWindow` and `ProgressItem` extend EventEmitter with type-safe event maps.

### Testing Architecture

**Unit Tests** (`test/unit/*.test.ts`):
- Located in `test/unit/` directory
- Run by Vitest (`vitest.config.ts`), with `globals: true`, so `describe`/`it`/`expect`/`vi` need no import
- Use `electron-mocks` to mock Electron APIs without launching a real app
- Import pattern: `import { MockBrowserWindow, MockScreen } from 'electron-mocks'`
- `electron-mocks` builds its fakes on Sinon spies, so `@types/sinon` is a devDependency purely to type those mocks
- Test helpers: `withTimeout.ts` (timeout wrapper), `pause.ts` (async delay)

**E2E Tests** (`test/e2e/*.spec.ts`):
- Located in `test/e2e/` directory
- Launch real Electron app via Playwright's `_electron` API
- Test against the playground example app
- Pattern: Single app instance for all tests, clean up windows between tests
- Helper: `waitForWindowCount()` uses Playwright's polling to wait for window count changes

## Directory Structure

```
electron-progress-window/
├── src/                    # Source code
│   └── ProgressWindow/     # Main module (ProgressWindow & ProgressItem classes)
├── test/                   # All tests
│   ├── unit/              # Unit tests (Vitest with electron-mocks)
│   └── e2e/               # E2E tests (Playwright with real Electron app)
├── examples/              # Example applications
│   └── playground/        # Test playground (used by E2E tests)
├── dist/                  # Build output (gitignored)
│   ├── cjs/              # CommonJS build
│   └── esm/              # ESM build
├── temp/                  # API Extractor intermediate files (gitignored)
├── docs/                  # Generated API documentation
└── test-results/          # Playwright test results (gitignored)
```

## Important Files

- `src/ProgressWindow/index.ts` - Main exports
- `post-build.js` - Post-build script that preserves `preload.d.ts`
- `examples/playground/` - Example Electron app used for E2E tests
- `playwright.config.ts` - Playwright config (timeout: 60s, workers: 1, no parallel execution)

## Singleton Pattern Usage

`ProgressWindow` uses static instance management:

```typescript
// Access the singleton instance
const progressWindow = ProgressWindow.instance()

// Or use static methods directly
await ProgressWindow.addItem({ title: 'Loading...' })
```

The instance is created lazily on first access and stored in a static private field `#instance`.

## CSS Customization

Progress items support CSS variable customization via the `cssVars` property:

```typescript
progressItem.cssVars({
  itemBackground: '#4ecdc4',
  textColor: '#ffffff',
  progressForeground: '#ff6b6b'
})
```

CSS variables are mapped via `itemCssMap` in `ProgressItem.ts` and applied to the progress item element.
