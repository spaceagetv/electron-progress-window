import { BrowserWindow, screen } from 'electron'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'
import { merge } from 'lodash'
import TypedEmitter from 'typed-emitter'

import { ProgressItemOptions, ProgressItem } from './ProgressItem'

/**
 * Options for creating/configuring a ProgressWindow
 * @public
 */
export interface ProgressWindowOptions {
  /** Expand height of window as needed? Default: true. Scroll otherwise. */
  variableHeight?: boolean
  /** Expand width of window as needed? Default: false */
  variableWidth?: boolean
  /** Close window automatically when all items complete. Default: true */
  closeOnComplete?: boolean
  /**
   * Hide the window for a moment before closing.
   * Window will pop up faster if a subsequent item is added before delay is finished.
   * True/false or number of milliseconds.
   * Defaults to true, which delays for 3000ms.
   */
  delayBeforeDestroying?: boolean | number
  /** Send 'cancelled' for all current items when closing the window. Default: false */
  cancelOnClose?: boolean
  /** Focus the window when adding a new item. Default: true */
  focusWhenAddingItem?: boolean
  /** Animate when varying the height/width the BrowserWindow (on Mac) */
  animateResize?: boolean
  /** Additional CSS for the window */
  css?: string
  /** Options for the BrowserWindow instance */
  windowOptions?: Partial<Electron.BrowserWindowConstructorOptions>
  /** Default options for new ProgressItem */
  itemDefaults?: Partial<ProgressItemOptions>
  /** @internal - Options for testing */
  testingFixtures?: {
    bw?: typeof Electron.BrowserWindow
    scr?: Electron.Screen
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
export type TypedEmitterProgressWindowInstanceEvents =
  new () => TypedEmitter<ProgressWindowInstanceEvents>

/** @internal */
export const EventEmitterAsTypedEmitterProgressWindowInstanceEvents =
  EventEmitter as TypedEmitterProgressWindowInstanceEvents

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
 *  variableHeight: true,
 *  variableWidth: false,
 *  closeOnComplete: true,
 *  focusWhenAddingItem: true,
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
 *  item1.setProgress(50, { detail: '50% complete' })
 * }, 200)
 * setTimeout(() => {
 *  item1.setProgress(100, { detail: '100% complete' })
 * }, 400)
 *
 * // once the item is complete, it will be removed from the window
 * // once the last item is complete, the window will close
 * ```
 */
export class ProgressWindow extends EventEmitterAsTypedEmitterProgressWindowInstanceEvents {
  /** @internal */
  static _options: ProgressWindowOptions = {}
  /** @internal */
  static _optionsFunction: ProgressWindowOptionsFunction | null = null
  /** @internal */
  static _instance: ProgressWindow | null = null

  /**
   * Static event emitter for ProgressWindow events.
   *
   * @remarks
   *
   * Events:<br/>
   * - `created` - New ProgressWindows has been created. listener: `(progressWindow: ProgressWindow) => void`<br/>
   * - `destroyed` - ProgressWindow has been destroyed. listener: `(progressWindow: ProgressWindow) => void`<br/>
   *
   * @see ProgressWindowStaticEvents
   * @eventProperty
   */
  static readonly emitter =
    new EventEmitter() as TypedEmitter<ProgressWindowStaticEvents>

  /**
   * Readonly convenience to see default options for new ProgressWindows.
   * Override these with ProgressWindow.configure().
   * @see ProgressWindowOptions
   * @readonly
   * @public
   */
  static readonly defaults: ProgressWindowOptions = {
    variableHeight: true,
    variableWidth: false,
    closeOnComplete: true,
    delayBeforeDestroying: true,
    focusWhenAddingItem: true,
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
   *  variableHeight: true,
   *  variableWidth: false,
   *  closeOnComplete: true,
   *  itemDefaults: {
   *    closeOnComplete: false,
   *  },
   *  windowOptions: { // these are Electron BrowserWindow options
   *    width: 300,
   *    height: 60, // variableHeight means this will expand as items are added
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
    if (this._instance) {
      throw new Error(
        'ProgressWindow.configure() must be set before the first ProgressWindow is created'
      )
    }
    if (typeof options === 'function') {
      // if there are functions involved, overwrite the options
      this._optionsFunction = options
    } else {
      // otherwise, merge the options
      merge(this._options, options)
    }
  }

  /**
   * Get the current options for new ProgressWindow instances.
   * @see ProgressWindowOptions
   * @readonly
   * @public
   */
  static get options(): ProgressWindowOptions {
    if (this._optionsFunction) {
      return merge({}, this._options, this._optionsFunction())
    }
    return this._options
  }

  /**
   * Get/create the default ProgressWindow instance.
   */
  static get instance() {
    if (!this._instance) {
      this._instance = new ProgressWindow(this.options)
      this._instance.on('windowClosed', () => {
        this.destroy()
      })
    }
    return this._instance
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
    if (this._instance) {
      this.instance.close()
      this.emitter.emit('destroyed', this._instance)
      this._instance = null
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

  // static updateItem(item: ProgressItem) {
  //   return this.instance.updateItem(item)
  // }

  // static removeItem(id: string) {
  //   return this.instance.removeItem(id)
  // }

  /**
   * Close the default ProgressWindow instance (if open).
   */
  static close(): void {
    if (!this._instance) return
    return this.instance.close()
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
  _screenInstance: typeof Electron.screen

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

  private lastContentDimensions = { width: 0, height: 0 }

  /** @internal */
  private _ready: Promise<ProgressWindow>

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
    const overrides = {
      windowOptions: {
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          navigateOnDragDrop: false,
        },
      },
    } as ProgressWindowOptions
    // logger.debug('ProgressWindow defaults', this.defaults)
    // logger.debug('ProgressWindow overrides', overrides)
    // logger.debug('options', options)
    // logger.debug('ProgressWindow options', this.options)
    this.options = merge(
      {},
      this.defaults,
      ProgressWindow.options,
      options,
      overrides
    )
    // logger.debug('Merged options', this.options)
    // logger.debug('ProgressWindow options', this.options)

    // Are we using BrowserWindow or a mock?
    const bwFunction = this.options.testingFixtures.bw
    // Are we using screen or a mock?
    this._screenInstance = this.options.testingFixtures.scr
    this.itemDefaults = this.options.itemDefaults

    // create the window
    this.browserWindow = new bwFunction(this.options.windowOptions)
    // prevent the window from navigating away from the initial URL
    // istanbul ignore next
    this.browserWindow.webContents.on('will-navigate', (event) => {
      event.preventDefault()
    })
    this._ready = new Promise((resolve) => {
      this.browserWindow.once('ready-to-show', () => {
        // this.browserWindow?.show()
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

    this.browserWindow.loadURL(
      'data:text/html;charset=UTF8,' + encodeURIComponent(htmlWithCss)
    )

    // devtools
    // this.browserWindow.webContents.openDevTools()

    // we're going to get x/y here too... but we'll just ignore them
    this.lastContentDimensions = this.browserWindow.getContentBounds()

    this.browserWindow.on('close', () => {
      if (this.options.cancelOnClose) {
        this.cancelAll()
      } else {
        this.removeAll()
      }
      this.browserWindow.setProgressBar(-1)
    })
    this.browserWindow.on('closed', () => {
      this.browserWindow = null
      this.emit('windowClosed')
    })
    // istanbul ignore next
    this.browserWindow.webContents.ipc.on(
      'progress-update-content-size',
      (_event, dimensions: { width: number; height: number }) => {
        this.updateContentSize(dimensions)
      }
    )
    // istanbul ignore next
    this.browserWindow.webContents.ipc.on(
      'progress-item-cancel',
      (_event, itemId: string) => {
        this.progressItems[itemId].cancel()
      }
    )
    // istanbul ignore next
    this.browserWindow.webContents.ipc.on(
      'progress-item-pause',
      (_event, itemId: string) => {
        this.progressItems[itemId].togglePause()
      }
    )
    ProgressWindow.emitter.emit('created', this)
  }

  /**
   * A promise that resolves when the window is ready to use.
   * @returns a promise which resolves to progressWindow instance when ready
   */
  async whenReady(): Promise<ProgressWindow> {
    await this._ready
    return this
  }

  /**
   * Add a new progress bar to the window
   * @public
   */
  async addItem(options = {} as Partial<ProgressItemOptions> | ProgressItem) {
    // logger.debug('ProgressWindow.addItem()', options)
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error('ProgressWindow.addItem() called without window instance')
    }
    await this.whenReady()

    let item: ProgressItem
    if (options instanceof ProgressItem) {
      item = options
    } else {
      options = merge({}, this.itemDefaults, options)
      item = new ProgressItem(options)
    }
    item.on('update', () => {
      this.updateItem(item)
    })
    item.on('complete', () => {
      this.updateItem(item)
    })
    item.on('pause', () => {
      this.updateItem(item)
    })
    item.on('remove', () => {
      this.removeItem(item.id)
    })
    item.on('cancelled', () => {
      this.emit('itemCancelled', item)
    })
    this.progressItems[item.id] = item
    item.on('show', () => {
      this.browserWindow.webContents.send(
        'progress-item-add',
        item.transferable()
      )
      this.setWindowProgress()
      if (
        this.options.focusWhenAddingItem ||
        Object.keys(this.progressItems).length === 1
      ) {
        this.browserWindow.show()
      } else {
        this.browserWindow.showInactive()
      }
    })
    item.on('hide', () => {
      this.browserWindow.webContents.send(
        'progress-item-remove',
        item.transferable()
      )
      this.setWindowProgress()
      this.maybeCloseWindow()
    })

    this.emit('itemAdded', item)

    return item
  }

  /**
   * Update a ProgressItem (via event)
   * Don't call this directly. There are other methods for updating items.
   * @internal
   */
  private async updateItem(item: ProgressItem) {
    // logger.silly('ProgressWindow.updateItem()', item)
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
    this.setWindowProgress()
    this.maybeCloseWindow()
    return item
  }

  /**
   * Remove an item from the window
   * @param id - the id of the item to remove
   * @returns - resolves when the item has been removed
   */
  async removeItem(id: string) {
    // logger.debug('ProgressWindow.removeItem()', id)
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.removeItem() called without window instance'
      )
    }
    const item = this.progressItems[id]
    item.removeAllListeners()
    delete this.progressItems[id]
    await this.whenReady()
    this.browserWindow?.webContents.send('progress-item-remove', id)
    this.emit('itemRemoved', id)
    this.setWindowProgress()
    this.maybeCloseWindow()
  }

  /**
   * Cancel all items + trigger the 'cancelled' event on each item.
   * Items will be removed after they are cancelled.
   */
  cancelAll() {
    // logger.debug('ProgressWindow.cancelAll()')
    Object.values(this.progressItems).forEach((item) => item.cancel())
  }

  /**
   * Remove all items (without cancelling them)
   */
  removeAll() {
    // logger.debug('ProgressWindow.removeAll()')
    Object.keys(this.progressItems).forEach((id) => this.removeItem(id))
  }

  /** Set the system progress bar via the BrowserWindow instance */
  private setWindowProgress() {
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.setWindowProgress() called before window was created'
      )
    }
    const items = Object.values(this.progressItems)

    // if all items are complete, hide the system progress bar
    const allComplete = items.every((item) => item.isCompleted())
    if (allComplete) {
      this.browserWindow.setProgressBar(-1)
      return
    }

    // if any item is indeterminate, set the progress bar to indeterminate
    const indeterminate = items.some((item) => item.isIndeterminate())
    if (indeterminate) {
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
  private updateContentSize(newDimensions: { width: number; height: number }) {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.updateContentSize() called without browserWindow instance'
      )
    }
    // logger.debug('ProgressWindow.updateContentSize()', dimensions)
    if (!this.options.variableHeight && !this.options.variableWidth) {
      // we shouldn't be resizing the window
      return
    }

    // round the new dimensions to the nearest integer
    newDimensions.width = Math.round(newDimensions.width)
    newDimensions.height = Math.round(newDimensions.height)

    // if only one dimension is variable and it hasn't changed, don't resize
    // istanbul ignore next
    if (
      (!this.options.variableWidth &&
        newDimensions.height === this.lastContentDimensions.height) ||
      (!this.options.variableHeight &&
        newDimensions.width === this.lastContentDimensions.width)
    ) {
      return
    }

    // find the display that the window is currently on
    const display = this._screenInstance.getDisplayMatching(
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
    const { width: oldWidth, height: oldHeight } = this.lastContentDimensions

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
    const contentWidth = this.options.variableWidth
      ? Math.min(newDimensions.width, displayWidth)
      : windowOldWidth
    const contentHeight = this.options.variableHeight
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
    this.lastContentDimensions = bounds
  }

  /** Close the window if all items are completed */
  private maybeCloseWindow() {
    // logger.silly('ProgressWindow.maybeCloseWindow()')
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.maybeCloseWindow() called before window was created'
      )
    }
    if (this.options.closeOnComplete) {
      const items = Object.values(this.progressItems)
      if (items.every((item) => item.isCompleted())) {
        if (this.options.delayBeforeDestroying) {
          this.hideThenCloseIfEmpty()
        } else {
          this.close()
        }
      }
    }
  }

  /** Hide the window. Then, after a delay, close it if there are no items. */
  async hideThenCloseIfEmpty() {
    let delayMs = 3000 // default delay
    if (typeof this.options.delayBeforeDestroying === 'number') {
      delayMs = this.options.delayBeforeDestroying
    }
    // istanbul ignore if
    if (
      typeof this.options.delayBeforeDestroying === 'boolean' &&
      this.options.delayBeforeDestroying === false
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
    this.closeIfEmpty()
  }

  /** Close (destroy) the window if there are no items. */
  closeIfEmpty() {
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
    // logger.debug('ProgressWindow.close()')
    // istanbul ignore next
    if (!this.browserWindow) {
      return
    }
    this.browserWindow.close()
  }
}
