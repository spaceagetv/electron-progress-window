import { BrowserWindow, screen } from 'electron'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { merge } from 'lodash'
import TypedEmitter from 'typed-emitter'

// import { logger } from '../logger'
import { ProgressItemOptions, ProgressItem } from './ProgressItem'

// create a dummy instance for logger

// const logger = {
//   log: console.log,
//   error: console.error,
//   warn: console.warn,
//   info: console.info,
//   debug: console.debug,
//   silly: console.debug,
// }

interface ProgressWindowOptions {
  /** Expand height of window as needed? Default: true. Scroll otherwise. */
  variableHeight?: boolean
  /** Expand width of window as needed? Default: false */
  variableWidth?: boolean
  /** Close window automatically when all items complete. Default: true */
  closeOnComplete?: boolean
  /** Send 'cancelled' for all current items when closing the window. Default: false */
  cancelOnClose?: boolean
  /** Focus the window when adding a new item. Default: true */
  focusWhenAddingItem?: boolean
  /** Additional CSS for the window */
  css?: string
  /** Options for the BrowserWindow instance */
  windowOptions?: Partial<Electron.BrowserWindowConstructorOptions>
  /** Default options for new ProgressItem */
  itemDefaults?: Partial<ProgressItemOptions>
  /** Options for testing */
  testingFixtures?: {
    bw?: typeof Electron.BrowserWindow
    scr?: Electron.Screen
  }
}

type ProgressWindowStaticEvents = {
  /** New ProgressWindows has been created */
  created: (progressWindow: ProgressWindow) => void
}

type ProgressWindowInstanceEvents = {
  ready: () => void
  itemAdded: (item: ProgressItem) => void
  itemUpdated: (item: ProgressItem) => void
  itemRemoved: (itemId: string) => void
  itemCancelled: (item: ProgressItem) => void
  windowClosed: () => void
}

export class ProgressWindow extends (EventEmitter as new () => TypedEmitter<ProgressWindowInstanceEvents>) {
  static _options = {} as ProgressWindowOptions
  static _instance: ProgressWindow | null = null

  static readonly emitter =
    new EventEmitter() as TypedEmitter<ProgressWindowStaticEvents>

  static readonly defaults: ProgressWindowOptions = {
    variableHeight: true,
    variableWidth: false,
    closeOnComplete: true,
    focusWhenAddingItem: true,
    windowOptions: {
      width: 300,
      height: 60,
      backgroundColor: '#fff',
      fullscreenable: false,
      maximizable: false,
      show: false,
    },
    css: '',
    testingFixtures: {
      // default to using the real BrowserWindow
      bw: BrowserWindow,
      scr: screen,
    },
  }

  static configure(options: ProgressWindowOptions) {
    if (this._instance) {
      throw new Error(
        'ProgressWindow.configure() must be set before the first ProgressWindow is created'
      )
    }
    merge(this._options, options)
  }

  static get instance() {
    if (!this._instance) {
      this._instance = new ProgressWindow(this._options)
      this._instance.on('windowClosed', () => {
        this._instance = null
      })
    }
    return this._instance
  }

  /**
   * Asynchronously create a the ProgressWindow instance
   * @returns {Promise<ProgressWindow>} - resolves when the window is ready
   */
  static async create() {
    return await this.instance.whenReady()
  }

  static destroy() {
    if (this._instance) {
      this.instance.close()
      this._instance = null
    }
  }

  static addItem(options = {} as Partial<ProgressItemOptions>) {
    return this.instance.addItem(options)
  }

  // static updateItem(item: ProgressItem) {
  //   return this.instance.updateItem(item)
  // }

  // static removeItem(id: string) {
  //   return this.instance.removeItem(id)
  // }

  static close() {
    if (!this._instance) return
    return this.instance.close()
  }

  readonly defaults = ProgressWindow.defaults

  browserWindow: BrowserWindow | null = null
  options: ProgressWindowOptions

  _screenInstance: typeof Electron.screen

  itemDefaults: Partial<ProgressItemOptions>

  progressItems: {
    [id: string]: ProgressItem
  } = {}

  private _ready: Promise<ProgressWindow>

  constructor(options = {} as ProgressWindowOptions) {
    super()
    const overrides = {
      windowOptions: {
        webPreferences: {
          preload: require.resolve('./preload'),
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
      ProgressWindow._options,
      options,
      overrides
    )
    // logger.debug('Merged options', this.options)
    // logger.debug('ProgressWindow options', this.options)
    const bwFunction = this.options.testingFixtures.bw
    this._screenInstance = this.options.testingFixtures.scr
    this.itemDefaults = this.options.itemDefaults
    this.browserWindow = new bwFunction(this.options.windowOptions)
    this._ready = new Promise((resolve) => {
      this.browserWindow.on('ready-to-show', () => {
        this.browserWindow?.show()
        this.emit('ready')
        resolve(this)
      })
    })
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../index.html'),
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

  async whenReady() {
    await this._ready
    return this
  }

  /** Add a new progress bar to the window */
  async addItem(options = {} as Partial<ProgressItemOptions>) {
    // logger.debug('ProgressWindow.addItem()', options)
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error('ProgressWindow.addItem() called without window instance')
    }
    await this.whenReady()
    options = merge({}, this.itemDefaults, options)
    const item = new ProgressItem(options)
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
    this.browserWindow.webContents.send(
      'progress-item-add',
      item.transferable()
    )
    this.emit('itemAdded', item)
    this.setWindowProgress()
    if (this.options.focusWhenAddingItem) {
      this.browserWindow.focus()
    }
    return item
  }

  /** Update a ProgressItem (via event) */
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

  cancelAll() {
    // logger.debug('ProgressWindow.cancelAll()')
    Object.values(this.progressItems).forEach((item) => item.cancel())
  }

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
      (item) => Math.min(item._value, item.maxValue) / item.maxValue
    )
    // if all items are complete, hide the system progress bar
    const allComplete = items.every((item) => item.isCompleted())

    if (allComplete) {
      this.browserWindow.setProgressBar(-1)
      return
    }

    // get the average
    const average = values.reduce((a, b) => a + b, 0) / values.length
    if (process.platform === 'win32') {
      // istanbul ignore next
      this.browserWindow.setProgressBar(average, { mode: 'normal' })
    } else {
      this.browserWindow.setProgressBar(average)
    }
  }

  /** Update the window size based on the content size */
  private updateContentSize(dimensions: { width: number; height: number }) {
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.updateContentSize() called without browserWindow instance'
      )
    }
    // logger.debug('ProgressWindow.updateContentSize()', dimensions)
    if (!this.options.variableHeight && !this.options.variableWidth) {
      return
    }
    const display = this._screenInstance.getDisplayMatching(
      this.browserWindow.getBounds()
    )
    const { width: displayWidth, height: displayHeight } = display.workAreaSize
    const { width: oldWidth, height: oldHeight } =
      this.browserWindow.getBounds()
    const width = this.options.variableWidth
      ? Math.min(dimensions.width, displayWidth)
      : oldWidth
    const height = this.options.variableHeight
      ? Math.min(dimensions.height, displayHeight)
      : oldHeight
    const widthDiff = width - oldWidth
    const heightDiff = height - oldHeight
    const { x, y } = this.browserWindow.getContentBounds()
    const bounds = {
      x: Math.round(x - widthDiff / 2),
      y: Math.round(y - heightDiff / 2),
      width: Math.round(width),
      height: Math.round(height),
    }
    this.browserWindow.setContentBounds(bounds, true)
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
        this.close()
      }
    }
  }

  /** Close the window */
  close() {
    // logger.debug('ProgressWindow.close()')
    // istanbul ignore next
    if (!this.browserWindow) {
      throw new Error(
        'ProgressWindow.closeWindow() called before window was created'
      )
    }
    this.browserWindow.close()
  }
}
