# Codebase Structure

## Directory Layout
```
electron-progress-window/
├── src/                        # Source code
│   ├── ProgressWindow/         # Main module
│   │   ├── ProgressWindow.ts   # Main window management class
│   │   ├── ProgressItem.ts     # Individual progress item class
│   │   ├── preload.ts          # Electron preload script
│   │   ├── renderer.ts         # Renderer process logic
│   │   ├── index.html          # Progress window HTML
│   │   ├── index.ts            # Module exports
│   │   └── utils.ts            # Utility functions
│   ├── index.ts                # Main entry point
│   └── logger.ts               # Logging utilities
├── test/                       # Unit tests (Mocha/Chai/Sinon)
│   ├── ProgressWindow.test.ts
│   ├── ProgressItem.test.ts
│   ├── withTimeout.ts          # Test helper
│   └── pause.ts                # Test helper
├── e2e/                        # E2E tests (Playwright)
│   └── progress-window.spec.ts
├── examples/                   # Example applications
│   └── playground/             # Playground app for testing
├── dist/                       # Build output (gitignored)
│   ├── cjs/                    # CommonJS build
│   └── esm/                    # ESM build
├── docs/                       # Generated API docs
├── .github/                    # GitHub workflows
├── tsconfig.json               # Base TypeScript config
├── tsconfig.cjs.json           # CommonJS build config
├── tsconfig.esm.json           # ESM build config
├── playwright.config.ts        # Playwright configuration
├── post-build.js               # Post-build script
└── package.json                # Package configuration
```

## Key Files

### Source Entry Points
- `src/index.ts` - Main library export (currently empty, re-exports from ProgressWindow/index.ts)
- `src/ProgressWindow/index.ts` - Exports ProgressWindow and ProgressItem classes

### Main Classes
- `ProgressWindow` - Singleton window manager with static and instance methods
- `ProgressItem` - Individual progress bar with event emitter capabilities

### Build Configuration
- `tsconfig.cjs.json` - Builds to `dist/cjs/` with CommonJS modules
- `tsconfig.esm.json` - Builds to `dist/esm/` with ES modules
- `post-build.js` - Preserves `preload.d.ts` in dist after build

### Testing
- Unit tests use `electron-mocks` for mocking Electron APIs
- E2E tests launch the playground Electron app via Playwright
- Test helpers in `test/withTimeout.ts` and `test/pause.ts`

## Module Exports
The package exports:
- Named exports: `ProgressWindow`, `ProgressItem`, and related types
- Dual package (CommonJS + ESM) via package.json exports field
- Type definitions included for full TypeScript support

## Build Process Flow
1. TypeScript compilation to both CJS and ESM
2. Post-build script runs to preserve preload.d.ts
3. Type declarations generated alongside JS files
4. Files in `dist/` are what gets published to npm
