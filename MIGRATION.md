# Migration Guide: v1 to v2

This document describes the breaking changes between v1 and v2 of `@spaceagetv/electron-progress-window`.

## Overview

Version 2 focuses on improving the developer experience with more intuitive API naming conventions, consistent patterns, and better TypeScript support. All changes are breaking changes to the public API.

## ProgressItem Changes

### Property Renames

| v1 | v2 | Description |
|---|---|---|
| `enableCancel` | `cancellable` | Whether cancel button is shown |
| `enablePause` | `pauseable` | Whether pause button is shown |
| `autoComplete` | `completeAutomatically` | Auto-complete when value >= maxValue |
| `removeOnComplete` | `autoRemove` | Auto-remove from window when completed |

**Before (v1):**
```javascript
const item = await ProgressWindow.addItem({
  enableCancel: true,
  enablePause: true,
  autoComplete: true,
  removeOnComplete: false,
})
```

**After (v2):**
```javascript
const item = await ProgressWindow.addItem({
  cancellable: true,
  pauseable: true,
  completeAutomatically: true,
  autoRemove: false,
})
```

### Method Changes

#### Removed: `setProgress(value)`

Use direct property assignment or `update()` instead.

**Before (v1):**
```javascript
item.setProgress(50)
```

**After (v2):**
```javascript
item.value = 50
// or
item.update({ value: 50 })
```

#### Removed: `pause()`, `resume()`, `togglePause()`

Use the `paused` property setter instead.

**Before (v1):**
```javascript
item.pause()
item.resume()
item.togglePause()
```

**After (v2):**
```javascript
item.paused = true   // pause
item.paused = false  // resume
item.paused = !item.paused  // toggle
```

#### Renamed: `setCompleted()` → `complete()`

**Before (v1):**
```javascript
item.setCompleted()
```

**After (v2):**
```javascript
item.complete()
```

### State Methods → Properties

All `isXxx()` methods are now property getters:

| v1 | v2 |
|---|---|
| `item.isCompleted()` | `item.completed` |
| `item.isInProgress()` | `item.inProgress` |
| `item.isVisible()` | `item.visible` |

Note: `indeterminate` was already a property, not a method.

**Before (v1):**
```javascript
if (item.isCompleted()) { ... }
if (item.isInProgress()) { ... }
if (item.isVisible()) { ... }
```

**After (v2):**
```javascript
if (item.completed) { ... }
if (item.inProgress) { ... }
if (item.visible) { ... }
```

### Event Name Changes

Event names are now consistently camelCase:

| v1 | v2 |
|---|---|
| `'will-cancel'` | `'willCancel'` |
| `'pause'` | `'paused'` |

**Before (v1):**
```javascript
item.on('will-cancel', (event) => {
  event.preventDefault()
})
item.on('pause', (isPaused) => {
  console.log('Paused:', isPaused)
})
```

**After (v2):**
```javascript
item.on('willCancel', (event) => {
  event.preventDefault()
})
item.on('paused', (isPaused) => {
  console.log('Paused:', isPaused)
})
```

## ProgressWindow Changes

### Configuration Option Renames

| v1 | v2 | Description |
|---|---|---|
| `variableHeight` | `autoHeight` | Auto-resize height based on content |
| `variableWidth` | `autoWidth` | Auto-resize width based on content |
| `delayBeforeDestroying` | `hideDelay` | Delay before destroying window |
| `focusWhenAddingItem` | `focusOnAdd` | Focus window when adding items |

**Before (v1):**
```javascript
ProgressWindow.configure({
  variableHeight: true,
  variableWidth: false,
  delayBeforeDestroying: 3000,
  focusWhenAddingItem: true,
})
```

**After (v2):**
```javascript
ProgressWindow.configure({
  autoHeight: true,
  autoWidth: false,
  hideDelay: 3000,
  focusOnAdd: true,
})
```

### Static Event Emitter Rename

The static event emitter has been renamed for clarity:

| v1 | v2 |
|---|---|
| `ProgressWindow.emitter` | `ProgressWindow.staticEvents` |

**Before (v1):**
```javascript
ProgressWindow.emitter.on('created', (progressWindow) => {
  console.log('Window created')
})
```

**After (v2):**
```javascript
ProgressWindow.staticEvents.on('created', (progressWindow) => {
  console.log('Window created')
})
```

**Note:** `staticEvents` is for listening to events on the ProgressWindow class itself (e.g., when any window is created). For events on a specific ProgressWindow instance, use the instance's `on()` method directly.

### Internal Properties/Methods

Internal properties and methods are now truly private using JavaScript private class fields (`#`). These were previously prefixed with `_` and accessible. If you were accessing internal state directly, use the public API instead.

**Testing utilities have been added:**
- `ProgressWindow.resetConfiguration()` - Reset static configuration (for tests)
- `ProgressWindow.hasInstance` - Check if a default instance exists (for tests)

## Bundler Compatibility

This package is compatible with:
- **Webpack** (including electron-forge with webpack template)
- **Vite**
- **esbuild**
- **Parcel**
- **Rollup**

The preload script is embedded in the package and extracted at runtime to a temporary file. This approach ensures compatibility with bundlers that have difficulty with external file references in Electron's contextBridge.

### Webpack Notes

When using Webpack with Electron (e.g., electron-forge webpack template), the package handles preload script injection automatically. No special configuration is required.

## Quick Migration Checklist

1. **ProgressItem options:** Rename `enableCancel` → `cancellable`, `enablePause` → `pauseable`, `autoComplete` → `completeAutomatically`, `removeOnComplete` → `autoRemove`

2. **ProgressItem methods:** Replace `setProgress(n)` with `item.value = n`, replace `pause()`/`resume()` with `paused` setter, replace `setCompleted()` with `complete()`

3. **ProgressItem state:** Replace `isCompleted()` → `completed`, `isInProgress()` → `inProgress`, `isVisible()` → `visible`

4. **Events:** Replace `'will-cancel'` → `'willCancel'`, `'pause'` → `'paused'`

5. **ProgressWindow options:** Rename `variableHeight` → `autoHeight`, `variableWidth` → `autoWidth`, `delayBeforeDestroying` → `hideDelay`, `focusWhenAddingItem` → `focusOnAdd`

6. **Static emitter:** Replace `ProgressWindow.emitter` → `ProgressWindow.staticEvents`

7. **Internal access:** Stop accessing `_`-prefixed properties; use public API or new test utilities

## TypeScript

All types have been updated to reflect the new API. TypeScript will flag any usage of the old API as errors, making migration straightforward.
