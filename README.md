# electron-progress-window

Display multiple progress bars in an Electron window.

[![npm version](https://img.shields.io/npm/v/@spaceagetv/electron-progress-window)](https://www.npmjs.com/package/@spaceagetv/electron-progress-window)
[![npm downloads](https://img.shields.io/npm/dm/@spaceagetv/electron-progress-window)](https://www.npmjs.com/package/@spaceagetv/electron-progress-window)
[![Tests](https://github.com/spaceagetv/electron-progress-window/actions/workflows/pull_request.yml/badge.svg)](https://github.com/spaceagetv/electron-progress-window/actions/workflows/pull_request.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/@spaceagetv/electron-progress-window)](https://nodejs.org/)

## Advantages

* Full Typescript support, including event types
* Zero runtime dependencies
* Full [documentation](docs/electron-progress-window.md)
* [Example](examples) playground to try it out in an Electron app 
* Progress bars are displayed in a single window (or multiple windows if you prefer)
* ProgressWindows and ProgressItems are event emitters
* Progress items can be added and removed dynamically
* Progress items can be updated dynamically
* Progress bars can be indeterminate (no value) or determinate (with value)
* Window can adjust size automatically as progress items are added and removed
* Automatically close window when all progress items are complete (or not)
* Configure default options for ProgressWindow and ProgressItem instances
* Choose whether individual progress bars are removed from window when complete
* Individual progress bars can be paused and resumed, sending 'pause' event
* Progress bars can be cancelled, sending 'will-cancel' and 'cancelled' event
* Ability to add custom CSS or HTML (in title or detail)
* Ability to fully customize the Electron BrowserWindow options
* Full test coverage

![Screenshot](images/electron-progress-window.png)

## Installation

```bash
npm install @spaceagetv/electron-progress-window
```

## Usage

```javascript
const { ProgressWindow } = require('@spaceagetv/electron-progress-window')

// Configure the settings for ProgressWindow
ProgressWindow.configure({
  closeOnComplete: true,
  focusOnAdd: true,
  windowOptions: { // these are Electron BrowserWindow options
    title: 'Progress',
    width: 300,
    height: 60,
    backgroundColor: '#f00',
  },
})

async function somethingThatTakesTime(progressCallback) {
  const state = {
    paused: false,
    cancelled: false,
  }
  for (let i = 0; i < 100; i++) {
    while (state.paused && !state.cancelled) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (state.cancelled) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    progressCallback(Math.round((i + 1) / 100 * 100))
  }
  const setPause = (isPaused) => {
    state.paused = isPaused
  }
  const cancel = () => {
    state.cancelled = true
  }
  return { setPause, cancel }
}

async function start() {
  const progressItem = await ProgressWindow.addItem({
    title: 'Something that takes time',
    detail: '0% complete',
    value: 0,
    maxValue: 100,
    pauseable: true,
    cancellable: true,
  })

  const updateProgress = (progress) => {
    progressItem.value = progress
    progressItem.detail = `${progress}% complete`
  }

  const { setPause, cancel } = await somethingThatTakesTime(updateProgress)

  progressItem.on('paused', (isPaused) => {
    setPause(isPaused)
  })
  progressItem.on('cancelled', () => {
    cancel()
  })
}

start()

```
