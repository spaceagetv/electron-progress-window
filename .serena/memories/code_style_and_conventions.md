# Code Style and Conventions

## TypeScript Configuration
- **Strict mode enabled**: All strict type checking options are on
- **Additional strictness**:
  - `noUncheckedIndexedAccess: true` - safer array/object access
  - `noUnusedLocals: true` - no unused variables
  - `noUnusedParameters: true` - no unused function parameters
  - Unused parameters can be prefixed with `_` to ignore the rule
- **Target**: ES6
- **Module**: CommonJS (base), with separate ESM build
- **Source maps and declarations**: Always generated

## Formatting (Prettier)
- **No semicolons** (`semi: false`)
- **Single quotes** for strings
- **Tab width**: 2 spaces
- **No tabs**: Use spaces
- **Line endings**: LF (Unix-style)

## Linting (ESLint)
- TypeScript ESLint parser and plugin
- Prettier integration (formatting errors are lint errors)
- TSDoc syntax validation enabled
- Unused vars are errors, except those starting with `_`

## Naming Conventions
From the codebase analysis:
- **Classes**: PascalCase (e.g., `ProgressWindow`, `ProgressItem`, `CancelableEvent`)
- **Interfaces**: PascalCase (e.g., `ProgressWindowOptions`, `TypedEventEmitter`)
- **Variables/Constants**: camelCase (e.g., `itemCssMap`, `preloadPath`)
- **Private fields**: Prefixed with `#` (ES private fields, e.g., `#options`, `#instance`)
- **Methods**: camelCase (e.g., `addItem`, `removeItem`, `whenReady`)
- **Type aliases**: PascalCase or camelCase depending on context

## Documentation
- **TSDoc comments required** for public APIs
- The project uses API Extractor to generate API documentation
- TSDoc syntax is linted and warnings are shown

## Event Emitters
The codebase uses a typed event emitter pattern:
- `TypedEventEmitter` interface for type-safe events
- Events are defined as const objects with event names as keys
- Both static and instance events are supported (e.g., `ProgressWindow.staticEvents` and instance events)

## File Organization
- Source code in `src/`
- Main classes in `src/ProgressWindow/`
- Tests mirror source structure in `test/` (unit) and `e2e/` (E2E)
- Distribution files in `dist/cjs/` and `dist/esm/`
- Examples in `examples/` directory
