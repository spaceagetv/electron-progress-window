# Contributing to electron-progress-window

Thank you for your interest in contributing to electron-progress-window! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/electron-progress-window.git
   cd electron-progress-window
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development

### Building

```bash
npm run build
```

This builds both CommonJS and ESM versions and runs post-build processing.

### Running Tests

```bash
npm test
```

For test coverage:

```bash
npm run test:coverage
```

### Linting

```bash
npm run lint
```

To auto-fix linting issues:

```bash
npm run lint:fix
```

### Documentation

To regenerate API documentation:

```bash
npm run docs
```

## Code Style

- We use ESLint and Prettier for code formatting
- TypeScript is required for all source files
- Follow existing patterns in the codebase
- Add TSDoc comments for public APIs

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update documentation if you're adding or changing features
3. Add tests for new functionality
4. Keep commits focused and use clear commit messages following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `chore:` for maintenance tasks
   - `test:` for test additions/changes
5. Submit your pull request with a clear description of the changes

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Electron version, OS, Node.js version)
- Any relevant code snippets or error messages

## Security

If you discover a security vulnerability, please do NOT open a public issue. Instead, please email the maintainers directly so we can address it before public disclosure.

## License

By contributing to electron-progress-window, you agree that your contributions will be licensed under the MIT License.
