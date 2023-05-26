import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import { MockBrowserWindow, MockScreen } from 'electron-mocks'
import { ProgressItem, ProgressWindow } from '../src/index'
import { withTimeout } from './withTimeout'
import { pause } from './pause'

chai.use(chaiAsPromised)
chai.use(sinonChai)

describe('ProgressWindow', () => {
  before(() => {
    ProgressWindow.emitter.on('created', async (progressWindow) => {
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
    ProgressWindow._options = {}
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
    expect(ProgressWindow._options.testingFixtures?.bw).to.be.ok
    expect(ProgressWindow._options.testingFixtures?.bw).to.equal(
      MockBrowserWindow
    )
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
    expect(ProgressWindow._instance).to.be.null
  })

  it('should create ProgressWindow instance with addItem()', async () => {
    ProgressWindow.addItem()
    expect(ProgressWindow._instance).to.be.ok
  })

  it('should addItem()', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.maxValue).to.equal(100)
    expect(item1.autoComplete).to.be.true
    expect(item1.removeOnComplete).to.be.true
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

  it('should set the progress of an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    const updatePromise = new Promise<void>((resolve) => {
      item1.on('update', resolve)
    })
    item1.setProgress(50)
    await expect(updatePromise).to.eventually.be.fulfilled
    await pause(20)
    const browserWindow = ProgressWindow.instance.browserWindow
    expect(browserWindow).to.be.ok
    if (!browserWindow) return
    expect(browserWindow.setProgressBar).to.have.been.calledTwice
    // expect(browserWindow.setProgressBar).to.have.been.calledWith(0.5)
  })

  it('ProgressWindow should go away when last item is removed', async function () {
    // this.timeout(10000)
    const item1 = await ProgressWindow.addItem({
      maxValue: 100,
      autoComplete: true,
      removeOnComplete: true,
    })
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(ProgressWindow._instance).to.be.ok
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
    item1.setProgress(110)
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
    expect(ProgressWindow._instance).to.be.null
  })

  it('should remove an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    item1.remove()
    // let event emitters fire
    await pause(0)
    expect(item1.removed).to.be.true
    expect(ProgressWindow._instance).to.be.null
  })

  it('should pause an item', async () => {
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.paused).to.be.false
    const pausePromise = new Promise<boolean>((resolve) => {
      item1.on('pause', (bool) => resolve(bool))
    })
    item1.pause()
    await expect(pausePromise).to.eventually.be.true
    expect(item1.paused).to.be.true
    const resumePromise = new Promise<boolean>((resolve) => {
      item1.on('pause', (bool) => resolve(bool))
    })
    item1.resume()
    await expect(resumePromise).to.eventually.be.false
    expect(item1.paused).to.be.false
  })

  it('indeterminate progress should call correctly', async () => {
    const item1 = await ProgressWindow.addItem({ indeterminate: true })
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.indeterminate).to.be.true
    item1.setProgress(50)
    // let event emitters fire
    await pause(0)
    expect(item1.isIndeterminate()).to.be.true
    expect(item1.value).to.equal(0)
    const browserWindow = ProgressWindow.instance.browserWindow
    expect(browserWindow).to.be.ok
    if (!browserWindow) return
    expect(browserWindow.setProgressBar).calledWith(2)
    item1.setCompleted()
    // let event emitters fire
    await pause(0)
    expect(item1.isIndeterminate()).to.be.true
    expect(item1.isCompleted()).to.be.true
    expect(browserWindow.setProgressBar).calledWith(-1)
  })

  it('ProgressWindow.close()', async () => {
    const progressWindow = await ProgressWindow.create()
    expect(progressWindow).to.be.an.instanceof(ProgressWindow)
    ProgressWindow.close()
    // let event emitters fire
    await pause(0)
    expect(ProgressWindow._instance).to.be.null
  })

  it('ProgressWindow.close() should not throw if no instance', async () => {
    ProgressWindow._instance = null
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
      variableHeight: false,
      variableWidth: false,
    })
    const progressWindow = await ProgressWindow.create()
    await progressWindow.whenReady()
    expect(progressWindow.options.variableHeight).to.be.false
    expect(progressWindow.options.variableWidth).to.be.false
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

  it('should set item values in various ways', async () => {
    ProgressWindow.configure({
      itemDefaults: {
        value: 0,
        title: 'Hello World',
        enablePause: true,
        maxValue: 1,
      },
    })
    const item1 = await ProgressWindow.addItem()
    expect(item1).to.be.ok
    expect(item1.value).to.equal(0)
    expect(item1.title).to.equal('Hello World')
    expect(item1.enablePause).to.be.true
    expect(item1.paused).to.be.false
    expect(item1.isCompleted()).to.be.false
    expect(item1.isInProgress()).to.be.true
    expect(item1.isIndeterminate()).to.be.false
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
      item1.once('pause', (isPaused) => resolve(isPaused))
    })
    item1.pause()
    await withTimeout(pausePromise, 300, 'pause event never fired')
    expect(item1.paused).to.be.true
    expect(item1.isCompleted()).to.be.false
    expect(item1.isInProgress()).to.be.true

    const resumePromise = new Promise<boolean>((resolve) => {
      item1.once('pause', (isPaused) => resolve(isPaused))
    })
    item1.resume()
    await withTimeout(resumePromise, 300, 'pause event never fired')
    expect(item1.paused).to.be.false
    expect(item1.isCompleted()).to.be.false
    expect(item1.isInProgress()).to.be.true

    const togglePromise = new Promise<boolean>((resolve) => {
      item1.once('pause', (isPaused) => resolve(isPaused))
    })
    item1.togglePause()
    await withTimeout(togglePromise, 300, 'pause event never fired')
    expect(item1.paused).to.be.true

    const completedPromise = new Promise<void>((resolve) => {
      item1.once('complete', () => resolve())
    })
    item1.setCompleted()
    await withTimeout(completedPromise, 1000, 'complete event never fired')
    expect(item1.value).to.equal(1)
    expect(item1.isCompleted()).to.be.true
    const completePromise2 = new Promise<void>((resolve) => {
      item1.once('complete', () => resolve())
    })
    const complete2WithTimeoutPromise = withTimeout(
      completePromise2,
      100,
      'complete event never fired'
    )
    item1.setCompleted()

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
      item1.once('will-cancel', (event) => {
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
})
