# Open Source Readiness Review Plan

## Executive Summary

This document outlines issues found during the code review and proposes a plan to address them before open sourcing. Issues are categorized by severity and grouped into logical work areas.

---

## Critical Issues (Must Fix Before Release)

### 1. Security: Insecure Electron Configuration

**Location:** `src/ProgressWindow/ProgressWindow.ts:387-389`

```typescript
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
  // ...
}
```

**Problem:** This is a significant security vulnerability. With `nodeIntegration: true` and `contextIsolation: false`, any JavaScript that runs in the renderer (including injected via HTML in title/detail fields) has full Node.js access. This violates Electron's security best practices.

**Recommendation:**
- Enable `contextIsolation: true` (default since Electron 12)
- Disable `nodeIntegration: false` (default since Electron 5)
- Create a preload script to expose only necessary IPC methods via `contextBridge`
- Use `webContents.send()` from main → renderer and `ipcRenderer.invoke()` or `ipcRenderer.send()` from renderer → main

**Risk Level:** HIGH - Users who allow user-generated content in title/detail could be vulnerable to XSS.

---

### 2. Missing Runtime Dependencies

**Location:** `package.json`

**Problems:**
- `lodash` is used at runtime but NOT listed in dependencies (only `@types/lodash` is in devDependencies)
- `typed-emitter` is used at runtime but listed in devDependencies instead of dependencies

**Current (broken):**
```json
"devDependencies": {
  "@types/lodash": "^4.14.194",
  "typed-emitter": "^2.1.0"
}
```

**Fix:**
```json
"dependencies": {
  "lodash": "^4.17.21",
  "typed-emitter": "^2.1.0"
},
"devDependencies": {
  "@types/lodash": "^4.14.194"
}
```

**Alternative:** Remove lodash entirely (see item #8).

---

### 3. Package.json: Restricted Publishing

**Location:** `package.json:77`

```json
"publishConfig": {
  "access": "restricted"
}
```

**Problem:** This prevents the package from being published publicly to npm.

**Fix:** Change to `"access": "public"` for open source release.

---

### 4. Incorrect Package Keywords

**Location:** `package.json:30-38`

```json
"keywords": [
  "electron",
  "mocks",
  "testing",
  "unit testing",
  "stubbing",
  "spies",
  "sinon"
]
```

**Problem:** These keywords describe a testing library, not a progress window library. This appears to be copy-pasted from another project.

**Fix:**
```json
"keywords": [
  "electron",
  "progress",
  "progress-bar",
  "window",
  "dialog",
  "typescript"
]
```

---

### 5. README Contains Invalid JavaScript

**Location:** `README.md:66-72`

```javascript
const setPause(isPaused) {  // ← Invalid syntax
  state.paused = isPaused
}
const cancel() {            // ← Invalid syntax
  state.cancelled = true
}
return { setPause, cancel }
```

**Problem:** This is not valid JavaScript and will confuse users trying to use the library.

**Also:** Line 76 calls `ProgressWindow.addProgressItem()` but the actual method is `addItem()`.

---

## High Priority Issues

### 6. CSS Variable Naming Mismatch

**Location:**
- `src/ProgressWindow/ProgressItem.ts:57` - defines `progressForeground: '--progress-foreground'`
- `src/ProgressWindow/index.html:17` - uses `--progress-foreground-color`

**Problem:** The CSS variable names don't match between the TypeScript mapping and the actual CSS. Users setting `cssVars.progressForeground` won't see any effect.

**Fix:** Align the names. Either:
- Change HTML to use `--progress-foreground` (breaking change if anyone uses raw CSS)
- Change the map to use `--progress-foreground-color`

---

### 7. No Modern Package.json `exports` Field

**Problem:** Modern Node.js (12.7+) uses the `exports` field for conditional exports. This is especially important for dual ESM/CJS packages.

**Recommendation:** Add exports field:
```json
"exports": {
  ".": {
    "import": "./dist/esm/index.js",
    "require": "./dist/cjs/index.js",
    "types": "./dist/cjs/index.d.ts"
  }
}
```

---

### 8. Lodash Dependency for 2 Functions

**Location:** Uses `merge` and `isEqual` from lodash

**Problem:** lodash adds ~72KB to the bundle for just 2 utility functions.

**Options:**
1. Use `lodash-es` with tree-shaking
2. Import only needed functions: `import merge from 'lodash/merge'`
3. Replace with native JavaScript:
   - `merge` → `structuredClone` + spread (or custom deep merge)
   - `isEqual` → Custom implementation or `fast-deep-equal` package (1KB)

**Recommendation:** Option 3 - reduces dependencies and bundle size.

---

### 9. Missing Engine Requirements

**Location:** `package.json`

**Problem:** No `engines` field to indicate required Node.js/Electron versions.

**Recommendation:**
```json
"engines": {
  "node": ">=16.0.0"
},
"peerDependencies": {
  "electron": ">=15.0.0"
}
```

---

## Medium Priority Issues

### 10. TypeScript Strictness

**Location:** `tsconfig.json`

**Current:** Only `noImplicitAny: true` is enabled.

**Recommendation:** Enable stricter checks:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

### 11. Event Type Compatibility

**Location:** `src/ProgressWindow/ProgressItem.ts:500`

```typescript
const event = new Event('will-cancel', { cancelable: true })
```

**Problem:** The `Event` constructor is a browser API. While it works in Electron's main process (due to Chromium), it's not available in pure Node.js. This limits testability and could cause issues in some environments.

**Recommendation:** Create a custom event object or use a Node.js EventEmitter-compatible pattern.

---

### 12. Null Safety in IPC Handlers

**Location:** `src/ProgressWindow/ProgressWindow.ts:528-550`

```typescript
item.on('show', () => {
  this.browserWindow.webContents.send(...)  // browserWindow could be null
})
```

**Problem:** `browserWindow` is typed as `BrowserWindow | null` but accessed without null checks in event handlers.

**Recommendation:** Add null guards or use the non-null assertion operator with a comment explaining why it's safe.

---

### 13. Test Infrastructure Coupling

**Location:** `test/ProgressWindow.test.ts:59-60`

```typescript
ProgressWindow._options = {}
ProgressWindow._optionsFunction = null
```

**Problem:** Tests directly access private/internal properties. This couples tests to implementation details.

**Recommendation:** Add a static `reset()` method for testing:
```typescript
/** @internal - For testing only */
static reset() {
  this._options = {}
  this._optionsFunction = null
  this._instance = null
}
```

---

### 14. Commented-Out Code

**Locations:**
- `src/ProgressWindow/ProgressWindow.ts` - commented logger calls throughout
- `src/ProgressWindow/ProgressItem.ts` - commented logger imports
- `src/ProgressWindow/renderer.ts` - commented console.log calls

**Recommendation:** Remove all commented-out code. Use git history if needed later.

---

## Low Priority / Nice-to-Have

### 15. Missing Documentation Files

**Items needed for open source:**
- [ ] `LICENSE` file (MIT mentioned in package.json but file may be missing)
- [ ] `CONTRIBUTING.md` - guidelines for contributors
- [ ] `CODE_OF_CONDUCT.md` - community standards
- [ ] `.github/ISSUE_TEMPLATE/` - bug report and feature request templates
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`

---

### 16. API Design Considerations

**Observations:**
- `configure()` throws if called after instance creation - consider making it work anytime
- Static `instance` getter auto-creates - consider making this more explicit
- `delayBeforeDestroying` accepts `boolean | number` - consider using only `number` (0 for disabled)

These are design choices, not bugs, but worth considering for API clarity.

---

### 17. HTML Template XSS via Title/Detail

**Location:** `src/ProgressWindow/renderer.ts:132-138`

```typescript
this.element.innerHTML = `
  <div class="progress-item-title">${item.title}</div>
  ...
  <div class="progress-item-detail">${item.detail}</div>
`
```

**Problem:** If users pass user-generated content to `title` or `detail`, it could execute as HTML/JavaScript.

**Note:** With context isolation fixed (Issue #1), this becomes XSS without Node.js access. Still worth sanitizing or using `textContent`.

**Recommendation:** Use `textContent` instead of `innerHTML` for title/detail, or provide a `htmlTitle`/`htmlDetail` option for those who need HTML.

---

## Implementation Plan

### Phase 1: Critical Fixes (Required for Release)

1. Fix runtime dependencies (lodash, typed-emitter)
2. Change publishConfig to public
3. Fix package keywords
4. Fix README example code
5. Fix CSS variable naming mismatch

### Phase 2: Security Hardening

1. Implement context isolation with preload script
2. Sanitize title/detail content or use textContent

### Phase 3: Modern Best Practices

1. Add package.json `exports` field
2. Add engine requirements
3. Enable strict TypeScript mode
4. Remove lodash dependency (or use tree-shaking)
5. Clean up commented code

### Phase 4: Developer Experience

1. Add missing documentation files (LICENSE, CONTRIBUTING, etc.)
2. Add GitHub issue/PR templates
3. Add static `reset()` method for testing
4. Review and improve API documentation

### Phase 5: Polish

1. Consider API design improvements
2. Add more comprehensive examples
3. Create migration guide if any breaking changes

---

## Bugs Found

### Bug 1: CSS Variable Not Applied
The `progressForeground` CSS variable doesn't work because of the naming mismatch described in Issue #6.

### Bug 2: Potential Crash on IPC
If the window is closed while an item event is being processed, accessing `this.browserWindow.webContents` will throw.

### Bug 3: Items Can Update After Removal
In `ProgressItem.update()`, the `removed` check returns early but the item's listeners may still fire events to the window.

---

## Questions to Resolve

1. **Minimum Electron version?** - Needed for engines field and security features
2. **Breaking changes acceptable?** - Some fixes require breaking changes (CSS variable names, security model)
3. **Tree-shaking vs. bundle?** - Should we bundle for simpler consumption or keep ESM for tree-shaking?

---

## Summary

The library is well-architected with good TypeScript support and comprehensive tests. The main concerns are:

1. **Security** - The Electron security model needs updating
2. **Dependencies** - Missing runtime dependencies will cause install failures
3. **Documentation** - README has errors, package.json has wrong metadata

Once these issues are addressed, this will be a solid open source library.
