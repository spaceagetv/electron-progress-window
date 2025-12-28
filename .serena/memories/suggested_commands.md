# Suggested Commands

## Building
```bash
npm run build              # Build both CommonJS and ESM, then run post-build
npm run build:cjs          # Build CommonJS only
npm run build:esm          # Build ESM only
npm run post-build         # Post-build processing (preserves preload.d.ts)
```

## Testing
```bash
npm test                   # Run unit tests with Mocha
npm run test:coverage      # Run tests with coverage report (nyc)
npm run test:e2e           # Run E2E tests with Playwright
```

## Linting and Formatting
```bash
npm run lint               # Check for lint errors
npm run lint:fix           # Auto-fix lint errors
```
Note: Prettier is integrated with ESLint, so `npm run lint:fix` will also format code.

## Documentation
```bash
npm run docs               # Generate API documentation
npm run docs:extract       # Extract API with API Extractor
npm run docs:generate      # Generate markdown docs with API Documenter
npm run build:docs         # Build + generate docs
```

## Release
```bash
npm run semantic-release   # Create a semantic release (CI only)
```

## macOS System Commands
Since the project runs on Darwin (macOS), these standard Unix commands are available:
- `git` - Version control
- `ls` - List files
- `grep` - Search file contents
- `find` - Find files
- `cat` - Display file contents
- `cd` - Change directory

All standard Unix/BSD commands work on macOS.
