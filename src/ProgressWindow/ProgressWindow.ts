import {
  BrowserWindow,
  screen,
  type BrowserWindowConstructorOptions,
} from 'electron'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'

import {
  ProgressItemOptions,
  ProgressItem,
  TypedEventEmitter,
} from './ProgressItem'
import { deepMerge } from './utils'

/**
 * PRELOAD SCRIPT HANDLING
 *
 * Electron's webPreferences.preload option requires a file path - it cannot accept
 * inline content or data URLs. To ensure compatibility with bundlers like Webpack
 * (which can break __dirname), we:
 *
 * 1. BUILD TIME: post-build.js embeds the preload script content as a string literal
 *    into getPreloadContent(), replacing the fs.readFileSync call below.
 *
 * 2. RUNTIME: getPreloadPath() writes that embedded content to a temp file and
 *    returns the path. The file uses a content-based hash in its name, so:
 *    - It's only written once per unique version of the preload script
 *    - Multiple instances/apps can safely share the same temp file
 *    - The file persists in temp until the OS cleans it up
 *
 * This approach ensures the library works regardless of how the consuming
 * application is bundled, while minimizing filesystem writes.
 */

/** Cached preload script content and path */
let preloadContent: string | null = null
let preloadPath: string | null = null

/**
 * Get the preload script content.
 * At build time, post-build.js replaces this function body to return
 * the embedded preload script content as a string literal.
 * @internal
 */
function getPreloadContent(): string {
  if (!preloadContent) {
    // NOTE: This fs.readFileSync is replaced at build time with embedded content.
    // It only runs during development/testing when preload.js exists as a file.
    preloadContent = fs.readFileSync(
      path.resolve(__dirname, 'preload.js'),
      'utf8'
    )
  }
  return preloadContent
}

/**
 * Get the path to the preload script file.
 * Writes the embedded preload content to a temp file on first call.
 * Uses content hash in filename for cache invalidation across versions.
 * @internal
 */
function getPreloadPath(): string {
  if (!preloadPath) {
    const content = getPreloadContent()
    // Hash ensures unique filename per preload script version
    const hash = crypto
      .createHash('md5')
      .update(content)
      .digest('hex')
      .slice(0, 8)
    preloadPath = path.join(
      os.tmpdir(),
      `electron-progress-window-preload-${hash}.js`
    )

    // Only write if this version's file doesn't already exist
    if (!fs.existsSync(preloadPath)) {
      fs.writeFileSync(preloadPath, content, 'utf8')
    }
  }
  return preloadPath
}

/**
 * Options for creating/configuring a ProgressWindow
 * @public
 */
export interface ProgressWindowOptions {
  /** Automatically adjust window height as items are added/removed. Default: true */
  autoHeight?: boolean
  /** Automatically adjust window width as needed. Default: false */
  autoWidth?: boolean
  /** Close window automatically when all items complete. Default: true */
  closeOnComplete?: boolean
  /**
   * Delay (in ms) before closing the window after all items complete.
   * This allows the window to reappear quickly if a new item is added.
   * Set to `true` for default 3000ms, `false` to close immediately, or a number for custom delay.
   * Default: true (3000ms)
   */
  hideDelay?: boolean | number
  /** Send 'cancelled' for all current items when closing the window. Default: false */
  cancelOnClose?: boolean
  /** Focus the window when adding a new item. Default: true */
  focusOnAdd?: boolean
  /** Animate window resize (macOS only). Default: false */
  animateResize?: boolean
  /** Additional CSS to inject into the window */
  css?: string
  /** Options passed to Electron's BrowserWindow constructor */
  windowOptions?: Partial<BrowserWindowConstructorOptions>
  /** Default options for new ProgressItem instances */
  itemDefaults?: Partial<ProgressItemOptions>
  /** @internal - Options for testing */
  testingFixtures?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bw?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scr?: any
  }
}

/**
 * Use a function that returns ProgressWindowOptions to allow for dynamic options.
 * @public
 * @see ProgressWindowOptions
 */
export type ProgressWindowOptionsFunction = () => ProgressWindowOptions

/**
 * Events emitted by ProgressWindow.emitter
 *
 * @remarks
 *
 * Events:<br/>
 * - `created` - New ProgressWindows has been created. listener: `(progressWindow: ProgressWindow) => void`<br/>
 * - `destroyed` - ProgressWindow has been destroyed. listener: `(progressWindow: ProgressWindow) => void`<br/>
 *
 * @public
 */
export type ProgressWindowStaticEvents = {
  /** New ProgressWindows has been created */
  created: (progressWindow: ProgressWindow) => void
  /** ProgressWindow has been destroyed */
  destroyed: (progressWindow: ProgressWindow) => void
}

/**
 * Events emitted by ProgressWindow instances
 *
 * @remarks
 *
 * Events:<br/>
 * - `ready` - New window has been created and is ready. listener: `() => void`<br/>
 * - `itemAdded` - New item has been added. listener: `(item: ProgressItem) => void`<br/>
 * - `itemUpdated` - Item has been updated. listener: `(item: ProgressItem) => void`<br/>
 * - `itemRemoved` - Item has been removed. listener: `(itemId: string) => void`<br/>
 * - `itemCancelled` - Item has been cancelled. listener: `(item: ProgressItem) => void`<br/>
 * - `windowClosed` - BrowserWindow has closed. listener: `() => void`<br/>
 *
 * @public
 */
export type ProgressWindowInstanceEvents = {
  /** New window has been created and is ready. */
  ready: () => void
  /** New item has been added. */
  itemAdded: (item: ProgressItem) => void
  /** Item has been updated. */
  itemUpdated: (item: ProgressItem) => void
  /** Item has been removed. */
  itemRemoved: (itemId: string) => void
  /** Item has been cancelled. */
  itemCancelled: (item: ProgressItem) => void
  /** BrowserWindow has closed. */
  windowClosed: () => void
}

/** @internal */
export const ProgressWindowInstanceEventsEmitter =
  EventEmitter as new () => TypedEventEmitter<ProgressWindowInstanceEvents>

/**
 * An Electron Window that displays progress items.
 * This class has a singleton instance that is created on demand,
 * and gets destroyed when the window is closed and/or all of its
 * ProgressItems have completed.
 *
 * It has static methods for configuring the window and adding items
 * to the default instance.
 *
 * However, you can create multiple instances, if you want to create multiple
 * windows, or if you want to have multiple windows with different configurations.
 * @public
 *
 * @example
 * ```ts
 * // configure the default instance
 * ProgressWindow.configure({
 *  autoHeight: true,
 *  autoWidth: false,
 *  closeOnComplete: true,
 *  focusOnAdd: true,
 *  windowOptions: { // these are Electron BrowserWindow options
 *   width: 300,
 *   height: 60,
 *   backgroundColor: '#f00',
 *  },
 * })
 *
 * const item1 = await ProgressWindow.addItem({
 *   title: 'My Progress Item',
 *   detail: '0% complete',
 *   maxValue: 100,
 * })
 *
 * setTimeout(() => {
 *  item1.value = 50
 *  item1.detail = '50% complete'
 * }, 200)
 * setTimeout(() => {
 *  item1.value = 100
 *  item1.detail = '100% complete'
 * }, 400)
 *
 * // once the item is complete, it will be removed from the window
 * // once the last item is complete, the window will close
 * ```
 */
export class ProgressWindow extends ProgressWindowInstanceEventsEmitter {
  /** @internal */
  static #options: ProgressWindowOptions = {}
  /** @internal */
  static #optionsFunction: ProgressWindowOptionsFunction | null = null
  /** @internal */
  static #instance: ProgressWindow | null = null

  /**
   * Static event emitter for ProgressWindow class-level events.
   * Use this to listen for window creation/destruction across all instances.
   *
   * @remarks
   * This emitter fires events at the class level, not instance level.
   * For instance-level events (ready, itemAdded, etc.), use the instance directly.
   *
   * Events:<br/>
   * - `created` - A new ProgressWindow has been created. listener: `(progressWindow: ProgressWindow) => void`<br/>
   * - `destroyed` - A ProgressWindow has been destroyed. listener: `(progressWindow: ProgressWindow) => void`<br/>
   *
   * @example
   * ```ts
   * ProgressWindow.staticEvents.on('created', (win) => {
   *   console.log('New window created')
   * })
   * ```
   *
   * @see ProgressWindowStaticEvents
   * @eventProperty
   */
  static readonly staticEvents =
    new EventEmitter() as TypedEventEmitter<ProgressWindowStaticEvents>

  /**
   * Readonly convenience to see default options for new ProgressWindows.
   * Override these with ProgressWindow.configure().
   * @see ProgressWindowOptions
   * @readonly
   * @public
   */
  static readonly defaults: ProgressWindowOptions = {
    autoHeight: true,
    autoWidth: false,
    closeOnComplete: true,
    hideDelay: true,
    focusOnAdd: true,
    animateResize: false,
    windowOptions: {
      width: 300,
      height: 60,
      backgroundColor: '#fff',
      fullscreenable: false,
      maximizable: false,
      resizable: false,
      show: false,
      acceptFirstMouse: true,
    },
    itemDefaults: {},
    css: '',
    testingFixtures: {
      // default to using the real BrowserWindow
      bw: BrowserWindow,
      scr: screen,
    },
  }

  /**
   * Configure new ProgressWindow instances with these options.
   * @see ProgressWindowOptions
   * @public
   *
   * @example
   * ```ts
   * ProgressWindow.configure({
   *  autoHeight: true,
   *  autoWidth: false,
   *  closeOnComplete: true,
   *  itemDefaults: {
   *    autoRemove: false,
   *  },
   *  windowOptions: { // these are Electron BrowserWindow options
   *    width: 300,
   *    height: 60, // autoHeight means this will expand as items are added
   *    backgroundColor: '#0f0',
   *  },
   *  css: `
   *   .progress-item {
   *     background-color: #f0f;
   *   }
   *  `,
   * })
   * ```
   */
  static configure(
    options: ProgressWindowOptions | ProgressWindowOptionsFunction
  ) {
    if (this.#instance) {
      throw new Error(
        'ProgressWindow.configure() must be set before the first ProgressWindow is created'
      )
    }
    if (typeof options === 'function') {
      // if there are functions involved, overwrite the options
      this.#optionsFunction = options
    } else {
      // otherwise, merge the options
      deepMerge(this.#options, options)
    }
  }

  /**
   * Get the current options for new ProgressWindow instances.
   * @see ProgressWindowOptions
   * @readonly
   * @public
   */
  static get options(): ProgressWindowOptions {
    if (this.#optionsFunction) {
      return deepMerge(
        {},
        this.#options,
        this.#optionsFunction()
      ) as ProgressWindowOptions
    }
    return this.#options
  }

  /**
   * Get/create the default ProgressWindow instance.
   */
  static get instance() {
    if (!this.#instance) {
      this.#instance = new ProgressWindow(this.options)
      this.#instance.on('windowClosed', () => {
        this.destroy()
      })
    }
    return this.#instance
  }

  /**
   * Asynchronously create the ProgressWindow instance
   * @returns a promise which resolves with the current ProgressWindow instance when it is ready.
   */
  static async create() {
    return await this.instance.whenReady()
  }

  /**
   * Destroy the ProgressWindow instance.
   */
  static destroy() {
    if (this.#instance) {
      this.instance.close()
      this.staticEvents.emit('destroyed', this.#instance)
      this.#instance = null
    }
  }

  /**
   * Add a new item to the default ProgressWindow instance.
   * If the window is not yet created, it will be created.
   * @param options - options for the new item
   * @returns a promise that resolves to the new ProgressItem.
   * Use the returned item to update the progress, or change the title or detail.
   */
  static addItem(
    options = {} as Partial<ProgressItemOptions> | ProgressItem
  ): Promise<ProgressItem> {
    return this.instance.addItem(options)
  }

  /**
   * Close the default ProgressWindow instance (if open).
   */
  static close(): void {
    if (!this.#instance) return
    return this.instance.close()
  }

  /**
   * Reset all configuration to defaults.
   * Useful for testing. Must be called after destroy().
   * @internal
   */
  static resetConfiguration(): void {
    if (this.#instance) {
      throw new Error(
        'ProgressWindow.resetConfiguration() must be called after destroy()'
      )
    }
    this.#options = {}
    this.#optionsFunction = null
  }

  /**
   * Check if there's currently an active instance.
   * @returns true if there's an active instance
   */
  static get hasInstance(): boolean {
    return this.#instance !== null
  }

  /**
   * @readonly defaults for the current instance
   */
  readonly defaults = ProgressWindow.defaults

  /**
   * The Electron BrowserWindow instance.
   * @see https://www.electronjs.org/docs/api/browser-window
   *
   * Use this to access the BrowserWindow directly, for example to set the window title.
   */
  browserWindow: BrowserWindow | null = null

  /**
   * The options used to create this ProgressWindow instance.
   * @see ProgressWindowOptions
   */
  options: ProgressWindowOptions

  /** @internal - used for testing */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #screenInstance: any

  /**
   * Default values for new ProgressItems added to this ProgressWindow instance.
   */
  itemDefaults: Partial<ProgressItemOptions>

  /**
   * The current ProgressItems in this ProgressWindow instance.
   * This is is an object, keyed by the item id.
   * @see ProgressItem
   */
  progressItems: {
    [id: string]: ProgressItem
  } = {}

  #lastContentDimensions = { width: 0, height: 0 }

  /** @internal */
  #ready: Promise<ProgressWindow>

  /**
   * If you want to work with a single window, you won't need to call this directly.
   * Call ProgressWindow.addItem() and things will "just work".
   *
   * However, if you want to create multiple windows, you can use this constructor
   * to create a new ProgressWindow instance.
   *
   * @param options - options for this ProgressWindow instance
   * @see ProgressWindowOptions
   * @see ProgressWindow.configure()
   */
  constructor(options = {} as ProgressWindowOptions) {
    super()
    // Check if we're using mocks for testing (check both constructor options and static config)
    const isUsingMocks =
      options.testingFixtures?.bw !== undefined ||
      ProgressWindow.options.testingFixtures?.bw !== undefined

    const overrides = {
      windowOptions: {
        show: false,
        webPreferences: {
          // Security: Use context isolation to prevent renderer from accessing Node.js
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          // The preload script exposes only the necessary IPC methods via contextBridge
          // Skip preload when using mocks for testing
          ...(isUsingMocks ? {} : { preload: getPreloadPath() }),
          navigateOnDragDrop: false,
        },
      },
    } as ProgressWindowOptions
    this.options = deepMerge(
      {},
      this.defaults,
      ProgressWindow.options,
      options,
      overrides
    ) as ProgressWindowOptions

    // Are we using BrowserWindow or a mock?
    // testingFixtures is always defined via defaults
    const bwFunction = this.options.testingFixtures!.bw!
    // Are we using screen or a mock?
    this.#screenInstance = this.options.testingFixtures!.scr
    this.itemDefaults = this.options.itemDefaults ?? {}

    // create the window
    this.browserWindow = new bwFunction(this.options.windowOptions)
    // prevent the window from navigating away from the initial URL
    // istanbul ignore next
    this.browserWindow!.webContents.on('will-navigate', (event) => {
      event.preventDefault()
    })
    this.#ready = new Promise((resolve) => {
      this.browserWindow!.once('ready-to-show', () => {
        this.emit('ready')
        resolve(this)
      })
    })
    const htmlContent = fs.readFileSync(
      path.resolve(__dirname, 'index.html'),
      'utf8'
    )
    const htmlWithCss = this.options.css
      ? htmlContent.replace(
          '/** additional styles insert point */',
          this.options.css
        )
      : htmlContent

    this.browserWindow!.loadURL(
      'data:text/html;charset=UTF8,' + encodeURIComponent(htmlWithCss)
    )

    // we're going to get x/y here too... but we'll just ignore them
    this.#lastContentDimensions = this.browserWindow!.getContentBounds()

    this.browserWindow!.on('close', () => {
      if (this.options.cancelOnClose) {
        this.cancelAll()
      } else {
        this.removeAll()
      }
      this.browserWindow?.setProgressBar(-1)
    })
    this.browserWindow!.on('closed', () => {
      this.browserWindow = null
      this.emit('windowClosed')
    })
    // istanbul ignore next
    this.browserWindow!.webContents.ipc.on(
      'progress-update-content-size',
      (_event, dimensions: { width: number; height: number }) => {
        this.#updateContentSize(dimensions)
      }
    )
    // istanbul ignore next
    this.browserWindow!.webContents.ipc.on(
      'progress-item-cancel',
      (_event, itemId: string) => {
        this.progressItems[itemId]?.cancel()
      }
    )
    // istanbul ignore next
    this.browserWindow!.webContents.ipc.on(
      'progress-item-pause',
      (_event, itemId: string) => {
        const item = this.progressItems[itemId]
        if (item) item.paused = !item.paused
      }
    )
    ProgressWindow.staticEvents.emit('created', this)
  }

  /**
   * A promise that resolves when the window is ready to use.
   * @returns a promise which resolves to progressWindow instance when ready
   */
  async whenReady(): Promise<ProgressWindow> {
    await this.#ready
    return this
  }

  /**
   * Add a new progress bar to the window
   * @public
   */
  async addItem(options = {} as Partial<ProgressItemOptions> | ProgressItem) {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error('ProgressWindow.addItem() called without window instance')
    }
    await this.whenReady()

    let item: ProgressItem
    if (options instanceof ProgressItem) {
      item = options
    } else {
      options = deepMerge(
        {},
        this.itemDefaults,
        options
      ) as Partial<ProgressItemOptions>
      item = new ProgressItem(options)
    }
    item.on('update', () => {
      this.#updateItem(item)
    })
    item.on('complete', () => {
      this.#updateItem(item)
    })
    item.on('paused', () => {
      this.#updateItem(item)
    })
    item.on('remove', () => {
      this.removeItem(item.id)
    })
    item.on('cancelled', () => {
      this.emit('itemCancelled', item)
    })
    this.progressItems[item.id] = item
    item.on('show', () => {
      if (!this.browserWindow) return
      this.browserWindow.webContents.send(
        'progress-item-add',
        item.transferable()
      )
      this.#setWindowProgress()
      if (
        this.options.focusOnAdd ||
        Object.keys(this.progressItems).length === 1
      ) {
        this.browserWindow.show()
      } else {
        this.browserWindow.showInactive()
      }
    })
    item.on('hide', () => {
      if (!this.browserWindow) return
      this.browserWindow.webContents.send(
        'progress-item-remove',
        item.transferable()
      )
      this.#setWindowProgress()
      this.#maybeCloseWindow()
    })

    this.emit('itemAdded', item)

    return item
  }

  /**
   * Update a ProgressItem (via event)
   * Don't call this directly. There are other methods for updating items.
   * @internal
   */
  async #updateItem(item: ProgressItem) {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.updateItem() called without window instance'
      )
    }
    await this.whenReady()
    this.browserWindow.webContents.send(
      'progress-item-update',
      item.transferable()
    )
    this.emit('itemUpdated', item)
    this.#setWindowProgress()
    this.#maybeCloseWindow()
    return item
  }

  /**
   * Remove an item from the window
   * @param id - the id of the item to remove
   * @returns - resolves when the item has been removed
   */
  async removeItem(id: string) {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.removeItem() called without window instance'
      )
    }
    const item = this.progressItems[id]
    if (!item) return
    item.removeAllListeners()
    delete this.progressItems[id]
    await this.whenReady()
    this.browserWindow?.webContents.send('progress-item-remove', id)
    this.emit('itemRemoved', id)
    this.#setWindowProgress()
    this.#maybeCloseWindow()
  }

  /**
   * Cancel all items + trigger the 'cancelled' event on each item.
   * Items will be removed after they are cancelled.
   */
  cancelAll() {
    Object.values(this.progressItems).forEach((item) => item.cancel())
  }

  /**
   * Remove all items (without cancelling them)
   */
  removeAll() {
    Object.keys(this.progressItems).forEach((id) => this.removeItem(id))
  }

  /** Set the system progress bar via the BrowserWindow instance */
  #setWindowProgress() {
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.setWindowProgress() called before window was created'
      )
    }
    const items = Object.values(this.progressItems)

    // if all items are complete, hide the system progress bar
    const allComplete = items.every((item) => item.completed)
    if (allComplete) {
      this.browserWindow.setProgressBar(-1)
      return
    }

    // if any item is indeterminate, set the progress bar to indeterminate
    const hasIndeterminate = items.some((item) => item.indeterminate)
    if (hasIndeterminate) {
      // istanbul ignore next
      if (process.platform === 'win32') {
        this.browserWindow.setProgressBar(2, { mode: 'indeterminate' })
      } else {
        this.browserWindow.setProgressBar(2)
      }
      return
    }
    // normalize all progress values to 0-1
    const values = items.map(
      (item) => Math.min(item.value, item.maxValue) / item.maxValue
    )

    // get the average
    const average = values.reduce((a, b) => a + b, 0) / values.length
    if (process.platform === 'win32') {
      // istanbul ignore next
      this.browserWindow.setProgressBar(average, { mode: 'normal' })
    } else {
      this.browserWindow.setProgressBar(average)
    }
  }

  /**
   * Update the window size based on the content size
   * received through ipc('progress-update-content-size) from the renderer
   *
   * @internal
   */
  #updateContentSize(newDimensions: { width: number; height: number }) {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.updateContentSize() called without browserWindow instance'
      )
    }
    if (!this.options.autoHeight && !this.options.autoWidth) {
      // we shouldn't be resizing the window
      return
    }

    // round the new dimensions to the nearest integer
    newDimensions.width = Math.round(newDimensions.width)
    newDimensions.height = Math.round(newDimensions.height)

    // if only one dimension is variable and it hasn't changed, don't resize
    // istanbul ignore next
    if (
      (!this.options.autoWidth &&
        newDimensions.height === this.#lastContentDimensions.height) ||
      (!this.options.autoHeight &&
        newDimensions.width === this.#lastContentDimensions.width)
    ) {
      return
    }

    // find the display that the window is currently on
    const display = this.#screenInstance.getDisplayMatching(
      this.browserWindow.getBounds()
    )
    // get the display's work area
    const {
      width: displayWidth,
      height: displayHeight,
      x: displayX,
      y: displayY,
    } = display.workArea
    // get the bounds of the Progress window
    const { width: oldWidth, height: oldHeight } = this.#lastContentDimensions

    const {
      x: windowOldX,
      y: windowOldY,
      width: windowOldWidth,
      height: windowOldHeight,
    } = this.browserWindow.getContentBounds()

    // get the height of the title bar
    const titleBarHeight =
      this.browserWindow.getNormalBounds().height -
      this.browserWindow.getContentBounds().height

    // calculate the new window size
    const contentWidth = this.options.autoWidth
      ? Math.min(newDimensions.width, displayWidth)
      : windowOldWidth
    const contentHeight = this.options.autoHeight
      ? Math.min(newDimensions.height, displayHeight - titleBarHeight)
      : windowOldHeight

    // negative if smaller, positive if larger
    const widthDiff = contentWidth - oldWidth
    const heightDiff = contentHeight - oldHeight

    // istanbul ignore next
    if (widthDiff === 0 && heightDiff === 0) {
      // no change in size
      return
    }

    const proposedX = windowOldX - widthDiff / 2
    const proposedY = windowOldY - heightDiff / 2

    // make sure window isn't overlapping edge of display
    const x = Math.min(
      Math.max(proposedX, displayX),
      displayX + displayWidth - contentWidth
    )
    const y = Math.min(
      Math.max(proposedY, displayY),
      displayY + displayHeight - contentHeight
    )

    const bounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(contentWidth),
      height: Math.round(contentHeight),
    }
    this.browserWindow.setContentBounds(bounds, this.options.animateResize)
    this.#lastContentDimensions = bounds
  }

  /** Close the window if all items are completed */
  #maybeCloseWindow() {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.maybeCloseWindow() called before window was created'
      )
    }
    if (this.options.closeOnComplete) {
      const items = Object.values(this.progressItems)
      if (items.every((item) => item.completed)) {
        if (this.options.hideDelay) {
          this.#hideThenCloseIfEmpty()
        } else {
          this.close()
        }
      }
    }
  }

  /** Hide the window. Then, after a delay, close it if there are no items. */
  async #hideThenCloseIfEmpty() {
    let delayMs = 3000 // default delay
    if (typeof this.options.hideDelay === 'number') {
      delayMs = this.options.hideDelay
    }
    // istanbul ignore if
    if (
      typeof this.options.hideDelay === 'boolean' &&
      this.options.hideDelay === false
    ) {
      delayMs = 0
    }

    // istanbul ignore next
    if (!this.browserWindow) {
      return
    }
    this.browserWindow.hide()
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    this.#closeIfEmpty()
  }

  /** Close (destroy) the window if there are no items. */
  #closeIfEmpty() {
    // istanbul ignore next
    if (!this.browserWindow) {
      return
    }
    if (Object.keys(this.progressItems).length === 0) {
      this.browserWindow.destroy()
    }
  }

  /** Close the window */
  close() {
    // istanbul ignore next
    if (!this.browserWindow) {
      return
    }
    this.browserWindow.close()
  }
}
