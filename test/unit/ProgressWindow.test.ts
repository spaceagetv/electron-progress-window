import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import { MockBrowserWindow, MockScreen } from 'electron-mocks'
import { ProgressItem, ProgressWindow } from '../../src/ProgressWindow'
import { withTimeout } from './withTimeout'
import { pause } from './pause'
import sinon from 'sinon'

chai.use(chaiAsPromised)
chai.use(sinonChai)

describe('ProgressWindow', () => {
  before(() => {
    ProgressWindow.staticEvents.on('created', async (progressWindow) => {
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
      // when items are added or removed
      const setContentSize = async () => {
        await progressWindow.whenReady()
        const browserWindow = progressWindow.browserWindow
        if (!browserWindow) return
        // emulate the item resizing the window
        const bounds = browserWindow.getBounds()
        const height =
          Object.keys(progressWindow.progressItems).length * 60 + 20
        browserWindow.webContents.ipc.emit(
          'progress-update-content-size',
          null,
          {
            height,
            width: bounds.width,
          }
        )
      }
      progressWindow.on('itemAdded', setContentSize)
      progressWindow.on('itemRemoved', setContentSize)
    })
  })
  beforeEach(async () => {
    ProgressWindow.destroy()
    // reset the defaults
    ProgressWindow.resetConfiguration()
    // set the testing fixtures
    ProgressWindow.configure({
      testingFixtures: {
        bw: MockBrowserWindow,
        scr: new MockScreen(),
      },
    })
  })

  it('should destroy() the default instance', async () => {
    const progressWindow = ProgressWindow.instance
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    ProgressWindow.destroy()
    expect(ProgressWindow.instance === progressWindow).to.be.false
  })

  it('should be able to configure the ProgressWindow', () => {
    expect(ProgressWindow.options.testingFixtures?.bw).to.be.ok
    expect(ProgressWindow.options.testingFixtures?.bw).to.equal(
      MockBrowserWindow
    )
  })

  it('should be able to configure the ProgressWindow with configure()', () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 100, backgroundColor: '#F00' },
    })
    expect(ProgressWindow.options.windowOptions).to.be.ok
    expect(ProgressWindow.options.windowOptions).to.deep.equal({
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
    expect(ProgressWindow.options.windowOptions).to.be.ok
    expect(ProgressWindow.options.windowOptions).to.deep.equal({
      width: 410,
      height: 110,
      backgroundColor: '#F01',
    })
  })

  it('should create the default instance', () => {
    const progressWindow = ProgressWindow.instance
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
  })

  it('should be able to create a new window', () => {
    const progressWindow = new ProgressWindow()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
  })

  it('should create a window with the default options', async () => {
    const progressWindow = new ProgressWindow()
    await progressWindow.whenReady()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    expect(progressWindow.browserWindow).to.be.ok
    expect(
      progressWindow.browserWindow,
      'should be a MockBrowserWindow'
    ).to.be.an.instanceof(MockBrowserWindow)
    if (!progressWindow.browserWindow) return
    expect(progressWindow.browserWindow.loadURL).called
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).to.equal(300)
    expect(bounds.height).to.equal(60)
  })

  it('should create a window with the specified configuration', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 536, height: 124, backgroundColor: '#F12' },
    })
    const progressWindow = new ProgressWindow()
    await progressWindow.whenReady()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) return
    expect(progressWindow.browserWindow.loadURL).called
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).to.equal(536)
    expect(bounds.height).to.equal(124)
    expect(progressWindow.browserWindow.getBackgroundColor()).to.equal('#F12')
  })

  it('should create a window with the specified configuration function', async () => {
    ProgressWindow.configure(() => {
      return {
        windowOptions: { width: 516, height: 324, backgroundColor: '#F11' },
      }
    })
    const progressWindow = new ProgressWindow()
    await progressWindow.whenReady()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) return
    expect(progressWindow.browserWindow.loadURL).called
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).to.equal(516)
    expect(bounds.height).to.equal(324)
    expect(progressWindow.browserWindow.getBackgroundColor()).to.equal('#F11')
  })

  it('should create a window with the specified options', async () => {
    const progressWindow = new ProgressWindow({
      windowOptions: { width: 400, height: 100, backgroundColor: '#F00' },
    })
    await progressWindow.whenReady()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) return
    expect(progressWindow.browserWindow.loadURL).called
    const bounds = progressWindow.browserWindow.getBounds()
    expect(bounds.width).to.equal(400)
    expect(bounds.height).to.equal(100)
    expect(progressWindow.browserWindow.getBackgroundColor()).to.equal('#F00')
  })

  it('should create an instance with create()', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
  })

  it('closing window should destroy the instance', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) return
    browserWindow.close()
    // let event emitters fire
    await pause(0)
    expect(ProgressWindow.hasInstance).to.be.false
  })

  it('window should be hidden when no item has been added', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) return
    await pause(0)
    expect(browserWindow.isVisible()).to.be.false
  })

  it('should create ProgressWindow instance with addItem()', async () => {
    ProgressWindow.addItem()
    expect(ProgressWindow.hasInstance).to.be.true
  })

  it('should addItem()', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.maxValue).to.equal(100)
    expect(item1.completeAutomatically).to.be.true
    expect(item1.autoRemove).to.be.true
    expect(item1.cancelled).to.be.false
    expect(item1.removed).to.be.false
    expect(item1.id).to.be.ok
    expect(item1.id).to.be.a('string')
    expect(item1.id.length).to.be.greaterThan(0)
    const progressWindow = ProgressWindow.instance
    expect(progressWindow).to.be.ok
    expect(progressWindow.progressItems).to.be.ok
    const progressItems = Object.entries(progressWindow.progressItems)
    expect(progressItems.length).to.equal(1)
  })

  it('window should be visible after item is added', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    const browserWindow = progressWindow.browserWindow
    if (!browserWindow) return
    expect(browserWindow.isVisible()).to.be.false

    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok

    // let event emitters fire
    await pause(20)

    expect(browserWindow.isVisible()).to.be.true
  })

  it('should set the progress of an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    const updatePromise = new Promise<void>((resolve) => {
      item1.on('update', resolve)
    })
    item1.value = 50
    await expect(updatePromise).to.eventually.be.fulfilled
    await pause(20)
    const browserWindow = ProgressWindow.instance.browserWindow
    expect(browserWindow).to.be.ok
    if (!browserWindow) return
    expect(browserWindow.setProgressBar).to.have.been.calledTwice
    expect(browserWindow.setProgressBar).to.have.been.calledWith(0.5)
  })

  it('ProgressWindow should go away when last item is removed', async function () {
    // this.timeout(10000)
    ProgressWindow.configure({
      hideDelay: false,
    })
    const item1 = await ProgressWindow.addItem({
      maxValue: 100,
      completeAutomatically: true,
      autoRemove: true,
    })
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(ProgressWindow.hasInstance).to.be.true
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
    // await new Promise((resolve) => setTimeout(resolve, 20))
    // console.log('item1', item1)

    await withTimeout(itemUpdatePromise, 1000, 'itemUpdatePromise timeout')
    await withTimeout(itemCompletePromise, 1000, 'itemCompletePromise timeout')
    await withTimeout(itemRemovePromise, 1000, 'itemRemovePromise timeout')
    await withTimeout(windowClosedPromise, 1000, 'windowClosedPromise timeout')
  })

  it('should cancel an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.cancelled).to.be.false
    expect(item1.removed).to.be.false
    const cancelPromise = new Promise<void>((resolve) => {
      item1.on('cancelled', () => resolve())
    })
    const removePromise = new Promise<void>((resolve) => {
      item1.on('remove', () => resolve())
    })
    item1.cancel()
    await expect(cancelPromise).to.be.fulfilled
    await expect(removePromise).to.be.fulfilled
    expect(item1.cancelled).to.be.true
    expect(item1.removed).to.be.true
    expect(ProgressWindow.instance?.browserWindow?.isVisible()).to.be.false
  })

  it('should remove an item', async () => {
    ProgressWindow.configure({
      hideDelay: false,
    })
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    item1.remove()
    // let event emitters fire
    await pause(40)
    expect(item1.removed).to.be.true
    expect(ProgressWindow.hasInstance).to.be.false
  })

  it('should pause an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.paused).to.be.false
    const pausePromise = new Promise<boolean>((resolve) => {
      item1.on('paused', (bool) => resolve(bool))
    })
    item1.paused = true
    await expect(pausePromise).to.eventually.be.true
    expect(item1.paused).to.be.true
    const resumePromise = new Promise<boolean>((resolve) => {
      item1.on('paused', (bool) => resolve(bool))
    })
    item1.paused = false
    await expect(resumePromise).to.eventually.be.false
    expect(item1.paused).to.be.false
  })

  it('indeterminate progress should call correctly', async () => {
    const item1 = await ProgressWindow.addItem({ indeterminate: true })
    const showSpy = sinon.spy()
    item1.on('show', showSpy)

    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.indeterminate).to.be.true
    item1.value = 50 // should be ignored for indeterminate items since update only applies when value changes
    // let event emitters fire
    await pause(20)

    expect(showSpy).to.have.been.calledOnce

    expect(item1.indeterminate).to.be.true
    expect(item1.value).to.equal(50) // value is set even for indeterminate
    const browserWindow = ProgressWindow.instance.browserWindow
    expect(browserWindow).to.be.ok
    if (!browserWindow) return
    // setProgressBar is called when item is shown and when value updates
    // For indeterminate items, it always passes 2 (indeterminate mode)
    expect(browserWindow.setProgressBar).to.have.been.calledWith(2)
    item1.complete()
    // let event emitters fire
    await pause(0)
    expect(item1.indeterminate).to.be.true
    expect(item1.completed).to.be.true
    expect(browserWindow.setProgressBar).calledWith(-1)
  })

  it('ProgressWindow.close()', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    ProgressWindow.close()
    // let event emitters fire
    await pause(0)
    expect(ProgressWindow.hasInstance).to.be.false
  })

  it('ProgressWindow.close() should not throw if no instance', async () => {
    expect(ProgressWindow.hasInstance).to.be.false
    expect(() => ProgressWindow.close()).to.not.throw()
  })

  it('Cancel all without removing if removeOnComplete is false', async () => {
    ProgressWindow.configure({
      cancelOnClose: true,
    })
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.cancelled).to.be.false
    expect(item1.removed).to.be.false
    const cancelPromise = new Promise<void>((resolve) => {
      item1.on('cancelled', () => resolve())
    })
    const removePromise = new Promise<void>((resolve) => {
      item1.on('remove', () => resolve())
    })
    ProgressWindow.close()
    await expect(cancelPromise).to.eventually.be.fulfilled
    await expect(removePromise).to.eventually.be.fulfilled
  })

  it('should reuse existing window if delayClosing is true', async () => {
    ProgressWindow.configure({
      hideDelay: true, // should wait 3000ms before closing
    })
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)

    expect(ProgressWindow.hasInstance).to.be.true
    expect(ProgressWindow.instance).to.equal(progressWindow)

    const itemAddedSpy = sinon.spy()
    progressWindow.on('itemAdded', itemAddedSpy)

    const item1 = await progressWindow.addItem({ title: 'item1' })
    expect(item1).to.be.ok

    expect(itemAddedSpy).to.be.calledOnce

    const itemRemovedSpy = sinon.spy()
    item1.on('remove', itemRemovedSpy)

    const windowHideSpy = sinon.spy()
    if (!progressWindow.browserWindow) throw new Error('browserWindow is null')
    progressWindow.browserWindow.on('hide', windowHideSpy)

    const windowClosedSpy = sinon.spy()
    progressWindow.browserWindow.on('closed', windowClosedSpy)

    item1.complete()

    // let event emitters fire
    await pause(50)

    expect(itemRemovedSpy).to.be.calledOnce
    expect(windowHideSpy).to.have.been.called
    expect(windowClosedSpy).to.not.have.been.called
    expect(itemAddedSpy).to.be.calledOnce

    expect(ProgressWindow.hasInstance).to.be.true
    expect(ProgressWindow.instance).to.equal(progressWindow)
    expect(progressWindow.browserWindow).to.be.ok
    expect(progressWindow.browserWindow.isVisible()).to.be.false

    const item2 = await progressWindow.addItem({ title: 'item2' })
    expect(item2).to.be.ok
    expect(itemAddedSpy).to.be.calledTwice

    // let event emitters fire
    await pause(50)
    expect(ProgressWindow.hasInstance).to.be.true
    expect(ProgressWindow.instance?.browserWindow).to.be.ok
    expect(ProgressWindow.instance?.browserWindow?.isVisible()).to.be.true
  })

  it('should destroy window after delayClosing delay', async () => {
    ProgressWindow.configure({
      hideDelay: 500, // 500ms before closing
    })
    const progressWindow = await ProgressWindow.create()

    expect(ProgressWindow.hasInstance).to.be.true
    expect(ProgressWindow.instance).to.equal(progressWindow)

    const itemAddedSpy = sinon.spy()
    progressWindow.on('itemAdded', itemAddedSpy)

    const item1 = await progressWindow.addItem({ title: 'item1' })
    expect(item1).to.be.ok

    expect(itemAddedSpy).to.be.calledOnce

    const itemRemovedSpy = sinon.spy()
    item1.on('remove', itemRemovedSpy)

    const windowHideSpy = sinon.spy()
    if (!progressWindow.browserWindow) throw new Error('browserWindow is null')
    progressWindow.browserWindow.on('hide', windowHideSpy)

    const windowClosedSpy = sinon.spy()
    progressWindow.browserWindow.on('closed', windowClosedSpy)

    item1.complete()

    // let event emitters fire
    await pause(50)

    expect(itemRemovedSpy).to.be.calledOnce
    expect(windowHideSpy).to.have.been.called
    expect(windowClosedSpy).to.not.have.been.called
    expect(itemAddedSpy).to.be.calledOnce

    expect(ProgressWindow.hasInstance).to.be.true
    expect(ProgressWindow.instance).to.equal(progressWindow)
    expect(progressWindow.browserWindow).to.be.ok
    expect(progressWindow.browserWindow.isVisible()).to.be.false

    // wait for window to close
    await pause(600)
    expect(ProgressWindow.hasInstance).to.be.false
    expect(windowClosedSpy).to.have.been.calledOnce
  })

  it('configure() should throw if instance already exists', async () => {
    await ProgressWindow.create()
    expect(() => ProgressWindow.configure({})).to.throw()
  })

  it('should resize window when adding/removing items', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 50 },
    })
    const progressWindow = await ProgressWindow.create()
    await progressWindow.whenReady()
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')

    expect(progressWindow.browserWindow.getSize()).to.deep.equal([400, 50])
    const resizePromise = new Promise<void>((resolve) => {
      progressWindow.browserWindow?.on('resized', () => resolve())
    })
    const item1 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await withTimeout(resizePromise, 1000, 'resize event never fired')
    expect(item1).to.be.ok
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([
      400,
      // 60 is the default height of a progress item
      // 20 is the default padding
      // 22 is the default height of the title bar
      60 * 1 + 20 + 22,
    ])
    const item2 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(item2).to.be.ok
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([
      400,
      60 * 2 + 20 + 22,
    ])
    const item3 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(item3).to.be.ok
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([
      400,
      60 * 3 + 20 + 22,
    ])
    item1.cancel()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([
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
    expect(progressWindow.options.autoHeight).to.be.false
    expect(progressWindow.options.autoWidth).to.be.false
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([400, 123])
    const item1 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(10)
    expect(item1).to.be.ok
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([400, 123])
    const item2 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(item2).to.be.ok
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([400, 123])
    const item3 = await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(item3).to.be.ok
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([400, 123])
    item1.cancel()
    // wait a tick for event emitters to fire
    await pause(0)
    expect(progressWindow.browserWindow.getSize()).to.deep.equal([400, 123])
  })

  it('should keep window centered on old position when adding/removing items', async () => {
    ProgressWindow.configure({
      windowOptions: { width: 400, height: 50 },
    })
    const progressWindow = await ProgressWindow.create()
    await progressWindow.whenReady()
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')
    // add a single item
    await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)

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
    expect(bounds1).to.be.ok
    expect(bounds1).to.deep.equal({
      x: 760,
      y: 489,
      width: 400,
      height: 60 + 20 + 22,
    })

    // add a second item
    await ProgressWindow.addItem()
    // wait a tick for event emitters to fire
    await pause(0)
    // get the current bounds
    const bounds2 = { ...progressWindow.browserWindow.getBounds() }
    expect(bounds2).to.be.ok
    expect(bounds2.y < bounds1.y, 'top of window should have moved up').to.be
      .true
    expect(bounds2).to.deep.equal({
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
    expect(topOffset).to.equal(bottomOffset)
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
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.title).to.equal('Hello World')
    expect(item1.pauseable).to.be.true
    expect(item1.paused).to.be.false
    expect(item1.completed).to.be.false
    expect(item1.inProgress).to.be.true
    expect(item1.indeterminate).to.be.false
    expect(item1.maxValue).to.equal(1)
    expect(item1.cancelled).to.be.false
    expect(item1.removed).to.be.false
    const updatePromise = new Promise<void>((resolve) => {
      item1.on('update', () => resolve())
    })
    item1.value = 0.1
    await withTimeout(updatePromise, 1000, 'update event never fired')
    expect(item1.value).to.equal(0.1)

    const pausePromise = new Promise<boolean>((resolve) => {
      item1.once('paused', (isPaused) => resolve(isPaused))
    })
    item1.paused = true
    await withTimeout(pausePromise, 300, 'paused event never fired')
    expect(item1.paused).to.be.true
    expect(item1.completed).to.be.false
    expect(item1.inProgress).to.be.true

    const resumePromise = new Promise<boolean>((resolve) => {
      item1.once('paused', (isPaused) => resolve(isPaused))
    })
    item1.paused = false
    await withTimeout(resumePromise, 300, 'paused event never fired')
    expect(item1.paused).to.be.false
    expect(item1.completed).to.be.false
    expect(item1.inProgress).to.be.true

    const togglePromise = new Promise<boolean>((resolve) => {
      item1.once('paused', (isPaused) => resolve(isPaused))
    })
    item1.paused = !item1.paused
    await withTimeout(togglePromise, 300, 'paused event never fired')
    expect(item1.paused).to.be.true

    const completedPromise = new Promise<void>((resolve) => {
      item1.once('complete', () => resolve())
    })
    item1.complete()
    await withTimeout(completedPromise, 1000, 'complete event never fired')
    expect(item1.value).to.equal(1)
    expect(item1.completed).to.be.true
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
    await expect(complete2WithTimeoutPromise).to.be.rejectedWith(
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
    await expect(cancelPromise).to.be.rejectedWith(
      'cancelled event never fired'
    )
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
    expect(progressWindow.progressItems[item1.id]).to.deep.equal(item1)
    expect(progressWindow.browserWindow).to.be.ok
    if (!progressWindow.browserWindow) throw new Error('no browserWindow')
    const itemUpdatePromise = new Promise<void>((resolve) => {
      item1.on('update', () => resolve())
    })
    item1.value = 0.2
    await withTimeout(itemUpdatePromise, 1000, 'update event never fired')
  })

  it('should be able to prevent canceling items', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.cancelled).to.be.false
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
    await expect(cancelPromise).to.be.rejectedWith(
      'cancelled event never fired'
    )
    expect(item1.cancelled).to.be.false
  })

  describe('Delayed items', () => {
    it('should not show window until time estimate is exceeded', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem = await progressWindow.addItem({
        title: 'Hello World',
        showWhenEstimateExceedsMs: 100,
      })
      expect(progressItem).to.be.ok
      expect(progressItem.inProgress).to.be.true
      expect(progressItem.indeterminate).to.be.false
      expect(progressItem.completed).to.be.false
      expect(progressItem.value).to.equal(0)
      expect(progressItem.maxValue).to.equal(100)
      expect(progressItem.title).to.equal('Hello World')

      expect(progressWindow.browserWindow).to.be.ok
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).to.be.false

      await pause(50)
      const updatePromise = new Promise<void>((resolve) => {
        progressItem.on('update', () => resolve())
      })
      progressItem.value = 20
      await withTimeout(updatePromise, 1000, 'update event never fired')

      expect(progressWindow.browserWindow.isVisible()).to.be.true
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
      expect(progressItem1).to.be.ok
      expect(progressItem1.inProgress).to.be.true
      expect(progressItem1.indeterminate).to.be.false
      expect(progressItem1.completed).to.be.false
      expect(progressItem1.value).to.equal(0)
      expect(progressItem1.maxValue).to.equal(100)
      expect(progressItem1.title).to.equal('Hello World')

      expect(progressItem2).to.be.ok
      expect(progressItem2.inProgress).to.be.true
      expect(progressItem2.indeterminate).to.be.false
      expect(progressItem2.completed).to.be.false
      expect(progressItem2.value).to.equal(0)
      expect(progressItem2.maxValue).to.equal(100)
      expect(progressItem2.title).to.equal('Hello World 2')

      expect(progressWindow.browserWindow).to.be.ok
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).to.be.false

      await pause(50)
      const updatePromise = new Promise<void>((resolve) => {
        progressItem1.on('update', () => resolve())
      })
      progressItem1.value = 20
      await withTimeout(updatePromise, 1000, 'update event never fired')

      expect(progressWindow.browserWindow.isVisible()).to.be.true
    })

    it('should not add items to the window until time estimate is exceeded', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem1 = await progressWindow.addItem({
        title: 'Hello World',
        showWhenEstimateExceedsMs: 100,
      })
      expect(progressItem1).to.be.ok

      expect(progressWindow.browserWindow).to.be.ok
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).to.be.false
      expect(progressWindow.browserWindow.webContents.send).not.to.have.been
        .called

      await pause(50)

      const updatePromise1 = new Promise<void>((resolve) => {
        progressItem1.on('update', () => resolve())
      })
      progressItem1.value = 10
      await withTimeout(updatePromise1, 1000, 'update event never fired')

      expect(progressWindow.browserWindow.isVisible()).to.be.true
      expect(progressWindow.browserWindow.webContents.send).to.have.been
        .calledTwice
      expect(
        progressWindow.browserWindow.webContents.send
      ).to.have.been.calledWith('progress-item-add')
      expect(
        progressWindow.browserWindow.webContents.send
      ).to.have.been.calledWith('progress-item-update')
    })

    it('should not show window until indeterminate with delayIndeterminate shows', async () => {
      const progressWindow = new ProgressWindow()
      const progressItem = await progressWindow.addItem({
        title: 'Hello World',
        delayIndeterminateMs: 50,
        indeterminate: true,
      })
      expect(progressItem).to.be.ok
      expect(progressItem.inProgress).to.be.true
      expect(progressItem.indeterminate).to.be.true
      expect(progressItem.completed).to.be.false
      expect(progressItem.visible).to.be.false
      expect(progressItem.value).to.equal(0)
      expect(progressItem.title).to.equal('Hello World')

      expect(progressWindow.browserWindow).to.be.ok
      if (!progressWindow.browserWindow) throw new Error('no browserWindow')
      expect(progressWindow.browserWindow.isVisible()).to.be.false
      expect(progressWindow.browserWindow.webContents.send).not.to.have.been
        .called

      await pause(60)

      expect(progressItem.visible).to.be.true
      expect(progressWindow.browserWindow.isVisible()).to.be.true
      expect(progressWindow.browserWindow.webContents.send).to.have.been
        .calledOnce
      expect(
        progressWindow.browserWindow.webContents.send
      ).to.have.been.calledWith('progress-item-add')
    })
  })
})
