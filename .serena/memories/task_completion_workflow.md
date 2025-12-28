# Task Completion Workflow

When completing a coding task in this project, follow these steps:

## 1. Code Quality Checks

### Run Linting
```bash
npm run lint
```
If there are errors, fix them with:
```bash
npm run lint:fix
```

### Verify Formatting
Formatting is enforced through ESLint, so `npm run lint` will catch formatting issues.

## 2. Testing

### Run Unit Tests
```bash
npm test
```

### Run E2E Tests (if applicable)
```bash
npm run test:e2e
```

### Check Coverage (optional, for significant changes)
```bash
npm run test:coverage
```

## 3. Build the Project
```bash
npm run build
```
This ensures the TypeScript compiles correctly and creates both CommonJS and ESM distributions.

## 4. Update Documentation (if applicable)
If you changed public APIs:
```bash
npm run docs
```

## 5. Commit Guidelines
Follow Conventional Commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Test additions/changes
- `refactor:` - Code refactoring

Example:
```bash
git commit -m "feat: add ability to customize progress bar colors"
```

## Minimum Requirements Before Commit
✅ `npm run lint` passes (no errors)
✅ `npm test` passes (all unit tests)
✅ `npm run build` succeeds
✅ (Optional) `npm run test:e2e` passes if UI/integration changes were made

## Notes
- E2E tests are slower and run against the playground example
- E2E tests build both the library and the playground before running
- The project uses semantic-release, so proper commit messages are important for versioning
