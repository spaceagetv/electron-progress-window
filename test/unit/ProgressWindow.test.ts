import { vi } from 'vitest'
import type { SinonSpy } from 'sinon'
import { MockBrowserWindow, MockScreen } from 'electron-mocks'
import { ProgressItem, ProgressWindow } from '../../src/ProgressWindow'
import { withTimeout } from './withTimeout'
import { pause } from './pause'

describe('ProgressWindow', () => {
  // Store the handler so we can remove it in afterAll
  const createdHandler = async (progressWindow: ProgressWindow) => {
    const screen = progressWindow.options.testingFixtures?.scr
    if (!screen) throw new Error('screen not found')
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) throw new Error('browserWindow not found')

    // center the window on the screen
    const screenBounds = screen.getPrimaryDisplay().workArea
    const windowBounds = browserWindow.getBounds()
    browserWindow.setBounds({
      x: Math.round(
        screenBounds.x + (screenBounds.width - windowBounds.width) / 2
      ),
      y: Math.round(
        screenBounds.y + (screenBounds.height - windowBounds.height) / 2
      ),
    })

    // emulate the preload script sending ipc 'progress-update-content-size'
    // when items are added or removed, or when delayed items become visible
    const setContentSize = async () => {
      // Check if window is still valid before proceeding
      if (!progressWindow.browserWindow) return
      try {
        await progressWindow.whenReady()
      } catch {
        return // Window was destroyed
      }
      // Small delay to allow item's show event to fire first (via setImmediate)
      // This emulates the real renderer behavior where content size update
      // happens after the item is rendered in the DOM
      await new Promise((resolve) => setTimeout(resolve, 5))
      const browserWindow = progressWindow.browserWindow
      if (!browserWindow) return
      // emulate the item resizing the window - only count VISIBLE items
      const bounds = browserWindow.getBounds()
      const visibleItemCount = Object.values(
        progressWindow.progressItems
      ).filter((item) => item.visible).length
      const height = visibleItemCount * 60 + 20
      browserWindow.webContents.ipc.emit('progress-update-content-size', null, {
        height,
        width: bounds.width,
      })
    }
    // Listen for itemAdded to hook into item's 'show' event for delayed items
    progressWindow.on('itemAdded', (item) => {
      // For initially visible items, setContentSize will be triggered immediately
      // For delayed items, we need to trigger when they become visible
      item.on('show', setContentSize)
      // Trigger immediately in case item is already visible
      if (item.visible) {
        setContentSize()
      }
    })
    progressWindow.on('itemRemoved', setContentSize)
  }

  beforeAll(() => {
    ProgressWindow.staticEvents.on('created', createdHandler)
  })

  afterAll(() => {
    ProgressWindow.staticEvents.off('created', createdHandler)
  })

  beforeEach(async () => {
    ProgressWindow.destroy()
    // reset the defaults
    ProgressWindow.resetConfiguration()
    // set the testing fixtures
    // Disable minimumDisplayMs by default for faster tests
    // (tests that need to verify minimumDisplayMs behavior can override)
    ProgressWindow.configure({
      testingFixtures: {
        bw: MockBrowserWindow,
        scr: new MockScreen(),
      },
      minimumDisplayMs: false,
    })
  })

  it('should destroy() the default instance', async () => {
    const progressWindow = ProgressWindow.instance
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    ProgressWindow.destroy()
    expect(ProgressWindow.instance === progressWindow).toBe(false)
  })

  it('should be able to configure the ProgressWindow', () => {
    expect(ProgressWindow.options.testingFixtures?.bw).toBeTruthy()
    expect(ProgressWindow.options.testingFixtures?.bw).toBe(MockBrowserWindow)
  })

  it('should be able to configure the ProgressWindow with configure()', () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 100, backgroundColor: '#F00' },
    })
    expect(ProgressWindow.options.windowOptions).toBeTruthy()
    expect(ProgressWindow.options.windowOptions).toEqual({
      width: 400,
      height: 100,
      backgroundColor: '#F00',
    })
  })

  it('should be able to configure the ProgressWindow with a function', () => {
    ProgressWindow.configure(() => {
      return {
        windowOptions: {
          width: 410,
          height: 110,
          backgroundColor: '#F01',
        },
      }
    })
    expect(ProgressWindow.options.windowOptions).toBeTruthy()
    expect(ProgressWindow.options.windowOptions).toEqual({
      width: 410,
      height: 110,
      backgroundColor: '#F01',
    })
  })

  it('should create the default instance', () => {
    const progressWindow = ProgressWindow.instance
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
  })

  it('should be able to create a new window', () => {
    const progressWindow = new ProgressWindow()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
  })

  it('should create a window with the default options', async () => {
    const progressWindow = new ProgressWindow()
    await progressWindow.whenReady()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    expect(progressWindow.browserWindow).toBeTruthy()
    expect(progressWindow.browserWindow).toBeInstanceOf(MockBrowserWindow)
    if (!progressWindow.browserWindow) return
    expect((progressWindow.browserWindow.loadURL as SinonSpy).called).toBe(true)
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).toBe(300)
    expect(bounds.height).toBe(60)
  })

  it('should create a window with the specified configuration', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 536, height: 124, backgroundColor: '#F12' },
    })
    const progressWindow = new ProgressWindow()
    await progressWindow.whenReady()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) return
    expect((progressWindow.browserWindow.loadURL as SinonSpy).called).toBe(true)
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).toBe(536)
    expect(bounds.height).toBe(124)
    expect(progressWindow.browserWindow.getBackgroundColor()).toBe('#F12')
  })

  it('should create a window with the specified configuration function', async () => {
    ProgressWindow.configure(() => {
      return {
        windowOptions: { width: 516, height: 324, backgroundColor: '#F11' },
      }
    })
    const progressWindow = new ProgressWindow()
    await progressWindow.whenReady()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) return
    expect((progressWindow.browserWindow.loadURL as SinonSpy).called).toBe(true)
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).toBe(516)
    expect(bounds.height).toBe(324)
    expect(progressWindow.browserWindow.getBackgroundColor()).toBe('#F11')
  })

  it('should create a window with the specified options', async () => {
    const progressWindow = new ProgressWindow({
      windowOptions: { width: 400, height: 100, backgroundColor: '#F00' },
    })
    await progressWindow.whenReady()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) return
    expect((progressWindow.browserWindow.loadURL as SinonSpy).called).toBe(true)
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).toBe(400)
    expect(bounds.height).toBe(100)
    expect(progressWindow.browserWindow.getBackgroundColor()).toBe('#F00')
  })

  it('should create an instance with create()', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
  })

  it('closing window should destroy the instance', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) return
    browserWindow.close()
    // let event emitters fire
    await pause(0)
    expect(ProgressWindow.hasInstance).toBe(false)
  })

  it('window should be hidden when no item has been added', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) return
    await pause(0)
    expect(browserWindow.isVisible()).toBe(false)
  })

  it('should create ProgressWindow instance with addItem()', async () => {
    ProgressWindow.addItem()
    expect(ProgressWindow.hasInstance).toBe(true)
  })

  it('should addItem()', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(item1.maxValue).toBe(100)
    expect(item1.completeAutomatically).toBe(true)
    expect(item1.autoRemove).toBe(true)
    expect(item1.cancelled).toBe(false)
    expect(item1.removed).toBe(false)
    expect(item1.id).toBeTruthy()
    expect(typeof item1.id).toBe('string')
    expect(item1.id.length).toBeGreaterThan(0)
    const progressWindow = ProgressWindow.instance
    expect(progressWindow).toBeTruthy()
    expect(progressWindow.progressItems).toBeTruthy()
    const progressItems = Object.entries(progressWindow.progressItems)
    expect(progressItems.length).toBe(1)
  })

  it('window should be visible after item is added', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) return
    expect(browserWindow.isVisible()).toBe(false)

    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()

    // let event emitters fire
    await pause(20)

    expect(browserWindow.isVisible()).toBe(true)
  })

  it('should set the progress of an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    const updatePromise = new Promise<void>((resolve) => {
      item1.on('update', resolve)
    })
    item1.value = 50
    await expect(updatePromise).resolves.toBeUndefined()
    await pause(20)
    const browserWindow = ProgressWindow.instance.browserWindow
    expect(browserWindow).toBeTruthy()
    if (!browserWindow) return
    const setProgressBarSpy = browserWindow.setProgressBar as SinonSpy
    expect(setProgressBarSpy.callCount).toBe(2)
    expect(setProgressBarSpy.calledWith(0.5)).toBe(true)
  })

  it('ProgressWindow should go away when last item is removed', async function () {
    ProgressWindow.configure({
      hideDelay: false,
    })
    const item1 = await ProgressWindow.addItem({
      maxValue: 100,
      completeAutomatically: true,
      autoRemove: true,
    })
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(ProgressWindow.hasInstance).toBe(true)
    await ProgressWindow.instance.whenReady()
    const windowClosedPromise = new Promise<void>((resolve, reject) => {
      if (!ProgressWindow.instance.browserWindow) {
        reject(new Error('ProgressWindow.instance.browserWindow is null'))
        return
      }
      ProgressWindow.instance.browserWindow.on('closed', resolve)
    })
    const itemUpdatePromise = new Promise<void>((resolve) => {
      item1.on('update', resolve)
    })
    const itemCompletePromise = new Promise<void>((resolve) => {
      item1.on('complete', resolve)
    })
    const itemRemovePromise = new Promise<void>((resolve) => {
      item1.on('remove', resolve)
    })
    item1.value = 110

    await withTimeout(itemUpdatePromise, 1000, 'itemUpdatePromise timeout')
    await withTimeout(itemCompletePromise, 1000, 'itemCompletePromise timeout')
    await withTimeout(itemRemovePromise, 1000, 'itemRemovePromise timeout')
    await withTimeout(windowClosedPromise, 1000, 'windowClosedPromise timeout')
  })

  it('should cancel an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(item1.cancelled).toBe(false)
    expect(item1.removed).toBe(false)
    const cancelPromise = new Promise<void>((resolve) => {
      item1.on('cancelled', () => resolve())
    })
    const removePromise = new Promise<void>((resolve) => {
      item1.on('remove', () => resolve())
    })
    item1.cancel()
    await cancelPromise
    await removePromise
    expect(item1.cancelled).toBe(true)
    expect(item1.removed).toBe(true)
    expect(ProgressWindow.instance?.browserWindow?.isVisible()).toBe(false)
  })

  it('should remove an item', async () => {
    ProgressWindow.configure({
      hideDelay: false,
    })
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    item1.remove()
    // let event emitters fire
    await pause(40)
    expect(item1.removed).toBe(true)
    expect(ProgressWindow.hasInstance).toBe(false)
  })

  it('should pause an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(item1.paused).toBe(false)
    const pausePromise = new Promise<boolean>((resolve) => {
      item1.on('paused', (bool) => resolve(bool))
    })
    item1.paused = true
    await expect(pausePromise).resolves.toBe(true)
    expect(item1.paused).toBe(true)
    const resumePromise = new Promise<boolean>((resolve) => {
      item1.on('paused', (bool) => resolve(bool))
    })
    item1.paused = false
    await expect(resumePromise).resolves.toBe(false)
    expect(item1.paused).toBe(false)
  })

  it('indeterminate progress should call correctly', async () => {
    const item1 = await ProgressWindow.addItem({ indeterminate: true })
    const showSpy = vi.fn()
    item1.on('show', showSpy)

    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(item1.indeterminate).toBe(true)
    item1.value = 50 // should be ignored for indeterminate items since update only applies when value changes
    // let event emitters fire
    await pause(20)

    expect(showSpy).toHaveBeenCalledTimes(1)

    expect(item1.indeterminate).toBe(true)
    expect(item1.value).toBe(50) // value is set even for indeterminate
    const browserWindow = ProgressWindow.instance.browserWindow
    expect(browserWindow).toBeTruthy()
    if (!browserWindow) return
    // setProgressBar is called when item is shown and when value updates
    // For indeterminate items, it always passes 2 (indeterminate mode)
    const setProgressBarSpy = browserWindow.setProgressBar as SinonSpy
    expect(setProgressBarSpy.calledWith(2)).toBe(true)
    item1.complete()
    // let event emitters fire
    await pause(0)
    expect(item1.indeterminate).toBe(true)
    expect(item1.completed).toBe(true)
    expect(setProgressBarSpy.calledWith(-1)).toBe(true)
  })

  it('ProgressWindow.close()', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)
    ProgressWindow.close()
    // let event emitters fire
    await pause(0)
    expect(ProgressWindow.hasInstance).toBe(false)
  })

  it('ProgressWindow.close() should not throw if no instance', async () => {
    expect(ProgressWindow.hasInstance).toBe(false)
    expect(() => ProgressWindow.close()).not.toThrow()
  })

  it('Cancel all without removing if removeOnComplete is false', async () => {
    ProgressWindow.configure({
      cancelOnClose: true,
    })
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(item1.cancelled).toBe(false)
    expect(item1.removed).toBe(false)
    const cancelPromise = new Promise<void>((resolve) => {
      item1.on('cancelled', () => resolve())
    })
    const removePromise = new Promise<void>((resolve) => {
      item1.on('remove', () => resolve())
    })
    ProgressWindow.close()
    await expect(cancelPromise).resolves.toBeUndefined()
    await expect(removePromise).resolves.toBeUndefined()
  })

  it('should reuse existing window if delayClosing is true', async () => {
    ProgressWindow.configure({
      hideDelay: true, // should wait 3000ms before closing
      minimumDisplayMs: false, // disable minimum display time for this test
    })
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).toBeInstanceOf(ProgressWindow)

    expect(ProgressWindow.hasInstance).toBe(true)
    expect(ProgressWindow.instance).toBe(progressWindow)

    const itemAddedSpy = vi.fn()
    progressWindow.on('itemAdded', itemAddedSpy)

    const item1 = await progressWindow.addItem({ title: 'item1' })
    expect(item1).toBeTruthy()

    expect(itemAddedSpy).toHaveBeenCalledTimes(1)

    const itemRemovedSpy = vi.fn()
    item1.on('remove', itemRemovedSpy)

    const windowHideSpy = vi.fn()
    if (!progressWindow.browserWindow) throw new Error('browserWindow is null')
    progressWindow.browserWindow.on('hide', windowHideSpy)

    const windowClosedSpy = vi.fn()
    progressWindow.browserWindow.on('closed', windowClosedSpy)

    item1.complete()

    // let event emitters fire
    await pause(50)

    expect(itemRemovedSpy).toHaveBeenCalledTimes(1)
    expect(windowHideSpy).toHaveBeenCalled()
    expect(windowClosedSpy).not.toHaveBeenCalled()
    expect(itemAddedSpy).toHaveBeenCalledTimes(1)

    expect(ProgressWindow.hasInstance).toBe(true)
    expect(ProgressWindow.instance).toBe(progressWindow)
    expect(progressWindow.browserWindow).toBeTruthy()
    expect(progressWindow.browserWindow.isVisible()).toBe(false)

    const item2 = await progressWindow.addItem({ title: 'item2' })
    expect(item2).toBeTruthy()
    expect(itemAddedSpy).toHaveBeenCalledTimes(2)

    // let event emitters fire
    await pause(50)
    expect(ProgressWindow.hasInstance).toBe(true)
    expect(ProgressWindow.instance?.browserWindow).toBeTruthy()
    expect(ProgressWindow.instance?.browserWindow?.isVisible()).toBe(true)
  })

  it('should destroy window after delayClosing delay', async () => {
    ProgressWindow.configure({
      hideDelay: 500, // 500ms before closing
      minimumDisplayMs: false, // disable minimum display time for this test
    })
    const progressWindow = await ProgressWindow.create()

    expect(ProgressWindow.hasInstance).toBe(true)
    expect(ProgressWindow.instance).toBe(progressWindow)

    const itemAddedSpy = vi.fn()
    progressWindow.on('itemAdded', itemAddedSpy)

    const item1 = await progressWindow.addItem({ title: 'item1' })
    expect(item1).toBeTruthy()

    expect(itemAddedSpy).toHaveBeenCalledTimes(1)

    const itemRemovedSpy = vi.fn()
    item1.on('remove', itemRemovedSpy)

    const windowHideSpy = vi.fn()
    if (!progressWindow.browserWindow) throw new Error('browserWindow is null')
    progressWindow.browserWindow.on('hide', windowHideSpy)

    const windowClosedSpy = vi.fn()
    progressWindow.browserWindow.on('closed', windowClosedSpy)

    item1.complete()

    // let event emitters fire
    await pause(50)

    expect(itemRemovedSpy).toHaveBeenCalledTimes(1)
    expect(windowHideSpy).toHaveBeenCalled()
    expect(windowClosedSpy).not.toHaveBeenCalled()
    expect(itemAddedSpy).toHaveBeenCalledTimes(1)

    expect(ProgressWindow.hasInstance).toBe(true)
    expect(ProgressWindow.instance).toBe(progressWindow)
    expect(progressWindow.browserWindow).toBeTruthy()
    expect(progressWindow.browserWindow.isVisible()).toBe(false)

    // wait for window to close
    await pause(600)
    expect(ProgressWindow.hasInstance).toBe(false)
    expect(windowClosedSpy).toHaveBeenCalledTimes(1)
  })

  it('configure() should throw if instance already exists', async () => {
    await ProgressWindow.create()
    expect(() => ProgressWindow.configure({})).toThrow()
  })

  it('should resize window when adding/removing items', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 50 },
    })
    const progressWindow = await ProgressWindow.create()
    await progressWindow.whenReady()
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')

    expect(progressWindow.browserWindow.getSize()).toEqual([400, 50])
    const resizePromise = new Promise<void>((resolve) => {
      progressWindow.browserWindow?.on('resized', () => resolve())
    })
    const item1 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await withTimeout(resizePromise, 1000, 'resize event never fired')
    expect(item1).toBeTruthy()
    expect(progressWindow.browserWindow.getSize()).toEqual([
      400,
      // 60 is the default height of a progress item
      // 20 is the default padding
      // 22 is the default height of the title bar
      60 * 1 + 20 + 22,
    ])
    const item2 = await ProgressWindow.addItem()
    // wait for async setContentSize to complete
    await pause(20)
    expect(item2).toBeTruthy()
    expect(progressWindow.browserWindow.getSize()).toEqual([
      400,
      60 * 2 + 20 + 22,
    ])
    const item3 = await ProgressWindow.addItem()
    // wait for async setContentSize to complete
    await pause(20)
    expect(item3).toBeTruthy()
    expect(progressWindow.browserWindow.getSize()).toEqual([
      400,
      60 * 3 + 20 + 22,
    ])
    item1.cancel()
    // wait for async setContentSize to complete
    await pause(20)
    expect(progressWindow.browserWindow.getSize()).toEqual([
      400,
      60 * 2 + 20 + 22,
    ])
  })

  it('should not resize window when adding/removing items if resizeWindow is false', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 123 },
      autoHeight: false,
      autoWidth: false,
    })
    const progressWindow = await ProgressWindow.create()
    await progressWindow.whenReady()
    expect(progressWindow.options.autoHeight).toBe(false)
    expect(progressWindow.options.autoWidth).toBe(false)
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')
    expect(progressWindow.browserWindow.getSize()).toEqual([400, 123])
    const item1 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(10)
    expect(item1).toBeTruthy()
    expect(progressWindow.browserWindow.getSize()).toEqual([400, 123])
    const item2 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(item2).toBeTruthy()
    expect(progressWindow.browserWindow.getSize()).toEqual([400, 123])
    const item3 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(item3).toBeTruthy()
    expect(progressWindow.browserWindow.getSize()).toEqual([400, 123])
    item1.cancel()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(progressWindow.browserWindow.getSize()).toEqual([400, 123])
  })

  it('should keep window centered on old position when adding/removing items', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 50 },
    })
    const progressWindow = await ProgressWindow.create()
    await progressWindow.whenReady()
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')
    // add a single item
    await ProgressWindow.addItem()
    // wait for async setContentSize to complete
    await pause(20)

    // center the window on the display
    const screen = progressWindow.options.testingFixtures?.scr
    if (!screen) throw new Error('no screen')
    const display = screen.getAllDisplays()[0]
    const displayBounds = display.bounds
    const windowBounds = progressWindow.browserWindow.getBounds()
    const x = displayBounds.x + displayBounds.width / 2 - windowBounds.width / 2
    const y =
      displayBounds.y + displayBounds.height / 2 - windowBounds.height / 2
    progressWindow.browserWindow.setPosition(x, y)

    // get the current bounds
    const bounds1 = { ...progressWindow.browserWindow.getBounds() }
    expect(bounds1).toBeTruthy()
    expect(bounds1).toEqual({
      x: 760,
      y: 489,
      width: 400,
      height: 60 + 20 + 22,
    })

    // add a second item
    await ProgressWindow.addItem()
    // wait for async setContentSize to complete
    await pause(20)
    // get the current bounds
    const bounds2 = { ...progressWindow.browserWindow.getBounds() }
    expect(bounds2).toBeTruthy()
    expect(bounds2.y < bounds1.y).toBe(true)
    expect(bounds2).toEqual({
      x: 760,
      y: 459,
      width: 400,
      height: 60 * 2 + 20 + 22,
    })

    // the amount that the top bounds2 moved up compared to bounds1
    const topOffset = bounds1.y - bounds2.y

    // the amount that the bottom bounds2 moved down compared to bounds1
    const bottomOffset = bounds2.height + bounds2.y - bounds1.height - bounds1.y

    // the top and bottom should have moved the same amount
    expect(topOffset).toBe(bottomOffset)
  })

  it('should set item values in various ways', async () => {
    ProgressWindow.configure({
      itemDefaults: {
        value: 0,
        title: 'Hello World',
        pauseable: true,
        maxValue: 1,
      },
    })
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.value).toBe(0)
    expect(item1.title).toBe('Hello World')
    expect(item1.pauseable).toBe(true)
    expect(item1.paused).toBe(false)
    expect(item1.completed).toBe(false)
    expect(item1.inProgress).toBe(true)
    expect(item1.indeterminate).toBe(false)
    expect(item1.maxValue).toBe(1)
    expect(item1.cancelled).toBe(false)
    expect(item1.removed).toBe(false)
    const updatePromise = new Promise<void>((resolve) => {
      item1.on('update', () => resolve())
    })
    item1.value = 0.1
    await withTimeout(updatePromise, 1000, 'update event never fired')
    expect(item1.value).toBe(0.1)

    const pausePromise = new Promise<boolean>((resolve) => {
      item1.once('paused', (isPaused) => resolve(isPaused))
    })
    item1.paused = true
    await withTimeout(pausePromise, 300, 'paused event never fired')
    expect(item1.paused).toBe(true)
    expect(item1.completed).toBe(false)
    expect(item1.inProgress).toBe(true)

    const resumePromise = new Promise<boolean>((resolve) => {
      item1.once('paused', (isPaused) => resolve(isPaused))
    })
    item1.paused = false
    await withTimeout(resumePromise, 300, 'paused event never fired')
    expect(item1.paused).toBe(false)
    expect(item1.completed).toBe(false)
    expect(item1.inProgress).toBe(true)

    const togglePromise = new Promise<boolean>((resolve) => {
      item1.once('paused', (isPaused) => resolve(isPaused))
    })
    item1.paused = !item1.paused
    await withTimeout(togglePromise, 300, 'paused event never fired')
    expect(item1.paused).toBe(true)

    const completedPromise = new Promise<void>((resolve) => {
      item1.once('complete', () => resolve())
    })
    item1.complete()
    await withTimeout(completedPromise, 1000, 'complete event never fired')
    expect(item1.value).toBe(1)
    expect(item1.completed).toBe(true)
    const completePromise2 = new Promise<void>((resolve) => {
      item1.once('complete', () => resolve())
    })
    const complete2WithTimeoutPromise = withTimeout(
      completePromise2,
      100,
      'complete event never fired'
    )
    item1.complete()

    // expect complete2WithTimeoutPromise to reject
    await expect(complete2WithTimeoutPromise).rejects.toThrow(
      'complete event never fired'
    )

    const cancelPromise = withTimeout(
      new Promise<void>((resolve) => {
        item1.once('cancelled', () => resolve())
      }),
      100,
      'cancelled event never fired'
    )
    item1.cancel()
    await expect(cancelPromise).rejects.toThrow('cancelled event never fired')
  })

  it('should allow adding pre-constructed items via addItem()', async () => {
    const item1 = new ProgressItem({
      title: 'Hello World',
      value: 0.1,
      maxValue: 1,
      detail: 'detail',
    })
    const progressWindow = new ProgressWindow()
    await progressWindow.addItem(item1)
    expect(progressWindow.progressItems[item1.id]).toEqual(item1)
    expect(progressWindow.browserWindow).toBeTruthy()
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')
    const itemUpdatePromise = new Promise<void>((resolve) => {
      item1.on('update', () => resolve())
    })
    item1.value = 0.2
    await withTimeout(itemUpdatePromise, 1000, 'update event never fired')
  })

  it('should be able to prevent canceling items', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).toBeTruthy()
    expect(item1.cancelled).toBe(false)
    const willCancelPromise = new Promise<void>((resolve) => {
      item1.once('willCancel', (event) => {
        event.preventDefault()
        resolve()
      })
    })
    const cancelPromise = withTimeout(
      new Promise<void>((resolve) => {
        item1.once('cancelled', () => resolve())
      }),
      100,
      'cancelled event never fired'
    )
    item1.cancel()
    await willCancelPromise
    await expect(cancelPromise).rejects.toThrow('cancelled event never fired')
    expect(item1.cancelled).toBe(false)
  })

  describe('Delayed items', () => {
    it('should not show window until time estimate is exceeded', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem = await progressWindow.addItem({
        title: 'Hello World',
        showWhenEstimateExceedsMs: 100,
      })
      expect(progressItem).toBeTruthy()
      expect(progressItem.inProgress).toBe(true)
      expect(progressItem.indeterminate).toBe(false)
      expect(progressItem.completed).toBe(false)
      expect(progressItem.value).toBe(0)
      expect(progressItem.maxValue).toBe(100)
      expect(progressItem.title).toBe('Hello World')

      expect(progressWindow.browserWindow).toBeTruthy()
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).toBe(false)

      await pause(50)
      const updatePromise = new Promise<void>((resolve) => {
        progressItem.on('update', () => resolve())
      })
      progressItem.value = 20
      await withTimeout(updatePromise, 1000, 'update event never fired')
      // Wait for async setContentSize and #actuallyShowWindow to complete
      await pause(20)

      expect(progressWindow.browserWindow.isVisible()).toBe(true)
    })

    it('should not show window until time estimate is exceeded (with multiple items)', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem1 = await progressWindow.addItem({
        title: 'Hello World',
        showWhenEstimateExceedsMs: 100,
      })
      const progressItem2 = await progressWindow.addItem({
        title: 'Hello World 2',
        showWhenEstimateExceedsMs: 100,
      })
      expect(progressItem1).toBeTruthy()
      expect(progressItem1.inProgress).toBe(true)
      expect(progressItem1.indeterminate).toBe(false)
      expect(progressItem1.completed).toBe(false)
      expect(progressItem1.value).toBe(0)
      expect(progressItem1.maxValue).toBe(100)
      expect(progressItem1.title).toBe('Hello World')

      expect(progressItem2).toBeTruthy()
      expect(progressItem2.inProgress).toBe(true)
      expect(progressItem2.indeterminate).toBe(false)
      expect(progressItem2.completed).toBe(false)
      expect(progressItem2.value).toBe(0)
      expect(progressItem2.maxValue).toBe(100)
      expect(progressItem2.title).toBe('Hello World 2')

      expect(progressWindow.browserWindow).toBeTruthy()
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).toBe(false)

      await pause(50)
      const updatePromise = new Promise<void>((resolve) => {
        progressItem1.on('update', () => resolve())
      })
      progressItem1.value = 20
      await withTimeout(updatePromise, 1000, 'update event never fired')
      // Wait for async setContentSize and #actuallyShowWindow to complete
      await pause(20)

      expect(progressWindow.browserWindow.isVisible()).toBe(true)
    })

    it('should not add items to the window until time estimate is exceeded', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem1 = await progressWindow.addItem({
        title: 'Hello World',
        showWhenEstimateExceedsMs: 100,
      })
      expect(progressItem1).toBeTruthy()

      expect(progressWindow.browserWindow).toBeTruthy()
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).toBe(false)
      const sendSpy = progressWindow.browserWindow.webContents.send as SinonSpy
      expect(sendSpy.called).toBe(false)

      await pause(50)

      const updatePromise1 = new Promise<void>((resolve) => {
        progressItem1.on('update', () => resolve())
      })
      progressItem1.value = 10
      await withTimeout(updatePromise1, 1000, 'update event never fired')
      // Wait for async setContentSize and #actuallyShowWindow to complete
      await pause(20)

      expect(progressWindow.browserWindow.isVisible()).toBe(true)
      expect(sendSpy.callCount).toBe(2)
      expect(sendSpy.calledWith('progress-item-add')).toBe(true)
      expect(sendSpy.calledWith('progress-item-update')).toBe(true)
    })

    it('should not show window until indeterminate with delayIndeterminate shows', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem = await progressWindow.addItem({
        title: 'Hello World',
        delayIndeterminateMs: 50,
        indeterminate: true,
      })
      expect(progressItem).toBeTruthy()
      expect(progressItem.inProgress).toBe(true)
      expect(progressItem.indeterminate).toBe(true)
      expect(progressItem.completed).toBe(false)
      expect(progressItem.visible).toBe(false)
      expect(progressItem.value).toBe(0)
      expect(progressItem.title).toBe('Hello World')

      expect(progressWindow.browserWindow).toBeTruthy()
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).toBe(false)
      const sendSpy = progressWindow.browserWindow.webContents.send as SinonSpy
      expect(sendSpy.called).toBe(false)

      // Wait for delay to elapse plus async setContentSize and #actuallyShowWindow
      await pause(80)

      expect(progressItem.visible).toBe(true)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)
      expect(sendSpy.callCount).toBe(1)
      expect(sendSpy.calledWith('progress-item-add')).toBe(true)
    })
  })

  describe('window timing behavior', () => {
    it('should wait minimumDisplayMs before hiding window (with autoRemove: false)', async () => {
      // minimumDisplayMs should apply when items are completed but still visible
      // (autoRemove: false). When items are removed (autoRemove: true), there's
      // nothing to display so minimumDisplayMs doesn't apply.
      ProgressWindow.configure({
        hideDelay: false, // disable hide delay to isolate minimumDisplayMs
        minimumDisplayMs: 200,
        itemDefaults: {
          autoRemove: false, // keep items visible after completion
        },
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowHideSpy = vi.fn()
      progressWindow.browserWindow.on('hide', windowHideSpy)

      const item = await progressWindow.addItem({ title: 'test' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the item immediately (but it stays visible due to autoRemove: false)
      item.complete()

      // wait a bit but less than minimumDisplayMs
      await pause(50)

      // window should still be visible due to minimumDisplayMs
      expect(windowHideSpy).not.toHaveBeenCalled()

      // wait for minimumDisplayMs to elapse
      await pause(200)

      // now window should be hidden
      expect(windowHideSpy).toHaveBeenCalled()
    })

    it('should cancel hide delay when new item is added', async () => {
      ProgressWindow.configure({
        hideDelay: 500,
        minimumDisplayMs: false, // disable minimum display time
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowClosedSpy = vi.fn()
      progressWindow.browserWindow.on('closed', windowClosedSpy)

      const item1 = await progressWindow.addItem({ title: 'item1' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the first item - this starts the hide delay
      item1.complete()

      // wait a bit for hide delay to start
      await pause(100)

      // add a new item during the hide delay
      const item2 = await progressWindow.addItem({ title: 'item2' })

      // wait for window to show again
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // wait past the original hide delay
      await pause(500)

      // window should still be open because item2 is still in progress
      expect(windowClosedSpy).not.toHaveBeenCalled()
      expect(item2.inProgress).toBe(true)
    })

    it('should close immediately when last item is removed (not wait for minimumDisplayMs)', async () => {
      // This test verifies the fix for the bug where an empty titlebar would
      // linger for several seconds after the last item was removed, because
      // the code was waiting for minimumDisplayMs even when there were no items
      ProgressWindow.configure({
        hideDelay: false,
        minimumDisplayMs: 3000, // Long delay that we should NOT wait for
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowClosedSpy = vi.fn()
      progressWindow.browserWindow.on('closed', windowClosedSpy)

      const item = await progressWindow.addItem({ title: 'test' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the item (with autoRemove: true, this removes it)
      item.complete()

      // wait a small amount - window should close immediately, NOT wait 3000ms
      await pause(50)

      // window should be closed since there are no items left
      expect(windowClosedSpy).toHaveBeenCalled()
    })

    it('should hide immediately when item is auto-removed with hideDelay + minimumDisplayMs (fixes #61)', async () => {
      // This test verifies the fix for GitHub issue #61 where an empty titlebar
      // would show for minimumDisplayMs after items were auto-removed
      ProgressWindow.configure({
        hideDelay: 500,
        minimumDisplayMs: 3000, // Long delay that we should NOT wait for when no items
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowHideSpy = vi.fn()
      progressWindow.browserWindow.on('hide', windowHideSpy)

      const windowClosedSpy = vi.fn()
      progressWindow.browserWindow.on('closed', windowClosedSpy)

      const item = await progressWindow.addItem({ title: 'test' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the item (with autoRemove: true by default, this removes it)
      item.complete()

      // wait a small amount - window should HIDE immediately, not wait 3000ms
      await pause(100)

      // window should be hidden immediately (not waiting for minimumDisplayMs)
      expect(windowHideSpy).toHaveBeenCalled()
      expect(progressWindow.browserWindow.isVisible()).toBe(false)

      // window should NOT be closed yet (waiting for hideDelay)
      expect(windowClosedSpy).not.toHaveBeenCalled()

      // wait for hideDelay to elapse
      await pause(500)

      // now window should be closed
      expect(windowClosedSpy).toHaveBeenCalled()
    })

    it('should wait for content size update before showing window', async () => {
      // Create a window and remove the automatic content size emulation
      // so we can control when content size updates are sent
      const mockScreen = new MockScreen()
      const progressWindow = new ProgressWindow({
        testingFixtures: {
          bw: MockBrowserWindow,
          scr: mockScreen,
        },
      })

      // Remove listeners added by the beforeAll() hook
      progressWindow.removeAllListeners('itemAdded')
      progressWindow.removeAllListeners('itemRemoved')

      await progressWindow.whenReady()
      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const showSpy = vi.fn()
      progressWindow.browserWindow.on('show', showSpy)

      // Add item but don't trigger content size update
      const itemPromise = progressWindow.addItem({ title: 'test' })

      // wait for setImmediate to fire
      await pause(10)

      // Window should not be visible yet (waiting for content size update)
      // Note: show is queued but not yet triggered
      expect(showSpy).not.toHaveBeenCalled()

      // Simulate renderer sending content size update
      progressWindow.browserWindow.webContents.ipc.emit(
        'progress-update-content-size',
        null,
        { width: 300, height: 80 }
      )

      // Now window should be shown
      await pause(10)
      expect(showSpy).toHaveBeenCalled()

      await itemPromise
    })

    it('should show window after fallback timeout if renderer does not respond', async () => {
      // Create a window and remove the automatic content size emulation
      // so we can test the fallback behavior
      const mockScreen = new MockScreen()
      const progressWindow = new ProgressWindow({
        testingFixtures: {
          bw: MockBrowserWindow,
          scr: mockScreen,
        },
      })

      // Remove listeners added by the beforeAll() hook
      progressWindow.removeAllListeners('itemAdded')
      progressWindow.removeAllListeners('itemRemoved')

      await progressWindow.whenReady()
      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const showSpy = vi.fn()
      progressWindow.browserWindow.on('show', showSpy)

      // Add item but don't trigger content size update
      const itemPromise = progressWindow.addItem({ title: 'test' })

      // wait for setImmediate to fire
      await pause(10)

      // Window should not be visible yet
      expect(showSpy).not.toHaveBeenCalled()

      // Wait for fallback timeout (100ms)
      await pause(120)

      // Window should be shown via fallback
      expect(showSpy).toHaveBeenCalled()

      await itemPromise
    })
  })

  describe('edge cases', () => {
    it('should abort hide sequence if new items added during minimumDisplayMs wait', async () => {
      ProgressWindow.configure({
        hideDelay: 500,
        minimumDisplayMs: 200,
        itemDefaults: {
          autoRemove: false, // keep items visible after completion
        },
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowHideSpy = vi.fn()
      progressWindow.browserWindow.on('hide', windowHideSpy)

      const windowClosedSpy = vi.fn()
      progressWindow.browserWindow.on('closed', windowClosedSpy)

      const item1 = await progressWindow.addItem({ title: 'item1' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the first item - this starts minimumDisplayMs wait
      item1.complete()

      // wait a bit during minimumDisplayMs
      await pause(50)

      // add a new item during the minimumDisplayMs wait
      const item2 = await progressWindow.addItem({ title: 'item2' })

      // wait past both minimumDisplayMs and hideDelay
      await pause(800)

      // window should still be open because item2 is not complete
      expect(windowClosedSpy).not.toHaveBeenCalled()
      expect(item2.completed).toBe(false)
    })

    it('should handle rapid add/complete/add cycles correctly', async () => {
      ProgressWindow.configure({
        hideDelay: 100,
        minimumDisplayMs: false,
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowClosedSpy = vi.fn()
      progressWindow.browserWindow.on('closed', windowClosedSpy)

      // Rapid cycle: add, complete, add, complete, add
      const item1 = await progressWindow.addItem({ title: 'item1' })
      item1.complete()

      const item2 = await progressWindow.addItem({ title: 'item2' })
      item2.complete()

      const item3 = await progressWindow.addItem({ title: 'item3' })

      // wait a bit
      await pause(50)

      // Window should still be open because item3 is in progress
      expect(windowClosedSpy).not.toHaveBeenCalled()
      expect(ProgressWindow.hasInstance).toBe(true)

      // Complete item3
      item3.complete()

      // wait for hide delay
      await pause(200)

      // Now window should be closed
      expect(windowClosedSpy).toHaveBeenCalled()
    })

    it('should handle window being destroyed during operations gracefully', async () => {
      ProgressWindow.configure({
        hideDelay: 500,
        minimumDisplayMs: false,
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const item1 = await progressWindow.addItem({ title: 'item1' })

      // wait for window to show
      await pause(50)

      // Complete item to start hide delay
      item1.complete()

      // wait a bit for hide delay to start
      await pause(50)

      // Forcefully close the window during hide delay
      progressWindow.browserWindow.close()

      // wait past hide delay - should not throw
      await pause(600)

      expect(ProgressWindow.hasInstance).toBe(false)
    })
  })

  describe('resetConfiguration', () => {
    it('should reset configuration to defaults', async () => {
      // Configure with custom options
      ProgressWindow.configure({
        windowOptions: { width: 500, height: 200 },
        hideDelay: 1000,
      })

      expect(ProgressWindow.options.windowOptions?.width).toBe(500)
      expect(ProgressWindow.options.hideDelay).toBe(1000)

      // Reset configuration
      ProgressWindow.resetConfiguration()

      // Options should be reset
      expect(ProgressWindow.options.windowOptions?.width).toBeUndefined()
      expect(ProgressWindow.options.hideDelay).toBeUndefined()
    })

    it('should reset optionsFunction to null', async () => {
      // Configure with a function
      ProgressWindow.configure(() => ({
        windowOptions: { width: 600 },
      }))

      expect(ProgressWindow.options.windowOptions?.width).toBe(600)

      // Reset configuration
      ProgressWindow.resetConfiguration()

      // Configure with different options - should work without the function interfering
      ProgressWindow.configure({
        windowOptions: { height: 100 },
      })

      // The new configuration should be applied without the old function
      expect(ProgressWindow.options.windowOptions?.width).toBeUndefined()
      expect(ProgressWindow.options.windowOptions?.height).toBe(100)
    })

    it('should throw if called while instance exists', async () => {
      await ProgressWindow.create()
      expect(() => ProgressWindow.resetConfiguration()).toThrow(
        'ProgressWindow.resetConfiguration() must be called after destroy()'
      )
    })
  })

  describe('css injection', () => {
    it('should inject custom CSS into the window', async () => {
      ProgressWindow.configure({
        css: '.custom-class { color: red; }',
      })
      const progressWindow = await ProgressWindow.create()
      await progressWindow.whenReady()

      expect(progressWindow.options.css).toBe('.custom-class { color: red; }')
      // Window was created successfully with custom CSS
      expect(progressWindow.browserWindow).toBeTruthy()
    })
  })

  describe('cancelOnClose behavior', () => {
    it('should cancel all items when window closes with cancelOnClose: true', async () => {
      ProgressWindow.configure({
        cancelOnClose: true,
      })
      const progressWindow = await ProgressWindow.create()

      const item1 = await progressWindow.addItem({ title: 'item1' })
      const item2 = await progressWindow.addItem({ title: 'item2' })

      const cancelSpy1 = vi.fn()
      const cancelSpy2 = vi.fn()
      item1.on('cancelled', cancelSpy1)
      item2.on('cancelled', cancelSpy2)

      // wait for window to show
      await pause(50)

      // Close the window
      progressWindow.browserWindow?.close()

      // wait for events
      await pause(50)

      expect(cancelSpy1).toHaveBeenCalled()
      expect(cancelSpy2).toHaveBeenCalled()
    })

    it('should remove all items when window closes with cancelOnClose: false', async () => {
      ProgressWindow.configure({
        cancelOnClose: false,
      })
      const progressWindow = await ProgressWindow.create()

      const item1 = await progressWindow.addItem({ title: 'item1' })
      const item2 = await progressWindow.addItem({ title: 'item2' })

      const cancelSpy1 = vi.fn()
      const cancelSpy2 = vi.fn()
      item1.on('cancelled', cancelSpy1)
      item2.on('cancelled', cancelSpy2)

      // wait for window to show
      await pause(50)

      expect(Object.keys(progressWindow.progressItems).length).toBe(2)

      // Close the window
      progressWindow.browserWindow?.close()

      // wait for events
      await pause(50)

      // Items should be removed from progressItems (removeAll removes listeners before emitting)
      expect(Object.keys(progressWindow.progressItems).length).toBe(0)
      // Items should not be cancelled, just removed
      expect(cancelSpy1).not.toHaveBeenCalled()
      expect(cancelSpy2).not.toHaveBeenCalled()
    })
  })

  describe('hide delay edge cases', () => {
    it('should abort close if new items added during hideDelay after all items completed', async () => {
      ProgressWindow.configure({
        hideDelay: 500,
        minimumDisplayMs: false,
        itemDefaults: {
          autoRemove: false,
        },
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowClosedSpy = vi.fn()
      progressWindow.browserWindow.on('closed', windowClosedSpy)

      const item1 = await progressWindow.addItem({ title: 'item1' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the first item - this hides window and starts hideDelay
      item1.complete()

      // wait a bit for hide delay to start
      await pause(100)
      expect(progressWindow.browserWindow.isVisible()).toBe(false)

      // add a new item during the hideDelay
      const item2 = await progressWindow.addItem({ title: 'item2' })

      // wait for window to show again
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // wait past the original hide delay
      await pause(500)

      // window should still be open because item2 is visible and incomplete
      expect(windowClosedSpy).not.toHaveBeenCalled()
      expect(item2.completed).toBe(false)
    })

    it('should handle minimumDisplayMs with completed but visible items', async () => {
      ProgressWindow.configure({
        hideDelay: false,
        minimumDisplayMs: 300,
        itemDefaults: {
          autoRemove: false,
        },
      })
      const progressWindow = await ProgressWindow.create()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const windowHideSpy = vi.fn()
      progressWindow.browserWindow.on('hide', windowHideSpy)

      const item = await progressWindow.addItem({ title: 'test' })

      // wait for window to show
      await pause(50)
      expect(progressWindow.browserWindow.isVisible()).toBe(true)

      // complete the item immediately
      item.complete()

      // wait less than minimumDisplayMs
      await pause(100)
      expect(windowHideSpy).not.toHaveBeenCalled()

      // wait for minimumDisplayMs to elapse
      await pause(300)
      expect(windowHideSpy).toHaveBeenCalled()
    })
  })

  describe('IPC handlers', () => {
    it('should handle progress-item-cancel IPC message', async () => {
      const progressWindow = await ProgressWindow.create()
      await progressWindow.whenReady()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const item = await progressWindow.addItem({ title: 'test' })
      const cancelSpy = vi.fn()
      item.on('cancelled', cancelSpy)

      // wait for item to be shown
      await pause(50)

      // Simulate IPC cancel message from renderer
      progressWindow.browserWindow.webContents.ipc.emit(
        'progress-item-cancel',
        null,
        item.id
      )

      await pause(10)
      expect(cancelSpy).toHaveBeenCalled()
    })

    it('should handle progress-item-pause IPC message', async () => {
      const progressWindow = await ProgressWindow.create()
      await progressWindow.whenReady()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      const item = await progressWindow.addItem({
        title: 'test',
        pauseable: true,
      })
      const pauseSpy = vi.fn()
      item.on('paused', pauseSpy)

      // wait for item to be shown
      await pause(50)

      expect(item.paused).toBe(false)

      // Simulate IPC pause message from renderer
      progressWindow.browserWindow.webContents.ipc.emit(
        'progress-item-pause',
        null,
        item.id
      )

      await pause(10)
      expect(pauseSpy).toHaveBeenCalledWith(true)
      expect(item.paused).toBe(true)

      // Toggle again
      progressWindow.browserWindow.webContents.ipc.emit(
        'progress-item-pause',
        null,
        item.id
      )

      await pause(10)
      expect(item.paused).toBe(false)
    })

    it('should handle IPC messages for non-existent items gracefully', async () => {
      const progressWindow = await ProgressWindow.create()
      await progressWindow.whenReady()

      if (!progressWindow.browserWindow)
        throw new Error('browserWindow is null')

      // These should not throw
      progressWindow.browserWindow.webContents.ipc.emit(
        'progress-item-cancel',
        null,
        'non-existent-id'
      )

      progressWindow.browserWindow.webContents.ipc.emit(
        'progress-item-pause',
        null,
        'non-existent-id'
      )

      await pause(10)
      // Test passes if no errors thrown
    })
  })
})
